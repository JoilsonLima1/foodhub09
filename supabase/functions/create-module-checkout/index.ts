import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-MODULE-CHECKOUT] ${step}${detailsStr}`);
};

// Process Stripe checkout for module
async function processStripeModuleCheckout(
  module: any,
  user: any,
  tenantId: string,
  origin: string
) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    throw new Error("Payment service unavailable");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // Check if customer already exists
  const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
  let customerId: string | undefined;
  
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    logStep("Existing Stripe customer found", { customerId });
  }

  // Create product and price for this module (or get existing)
  let priceId = module.stripe_price_id;
  
  if (!priceId) {
    logStep("Creating Stripe product and price for module");
    
    const product = await stripe.products.create({
      name: `Módulo: ${module.name}`,
      description: module.description || undefined,
      metadata: { module_id: module.id, type: 'addon_module' }
    });
    
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(module.monthly_price * 100),
      currency: module.currency.toLowerCase(),
      recurring: { interval: "month" },
      metadata: { module_id: module.id }
    });

    priceId = price.id;
    logStep("Stripe module product and price created", { productId: product.id, priceId });
  }

  // Create checkout session for module subscription
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: customerId ? undefined : user.email!,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${origin}/dashboard?module_checkout=success&module=${module.slug}`,
    cancel_url: `${origin}/dashboard?module_checkout=cancelled`,
    metadata: {
      module_id: module.id,
      user_id: user.id,
      tenant_id: tenantId,
      type: 'addon_module'
    }
  });

  logStep("Stripe module checkout session created", { sessionId: session.id });

  return new Response(
    JSON.stringify({ url: session.url, sessionId: session.id, gateway: 'stripe' }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

// Process Asaas checkout for module - uses static checkout_url from Super Admin config
async function processAsaasModuleCheckout(
  module: any,
  user: any,
  tenantId: string,
  gatewayConfig: any
) {
  logStep("Processing Asaas module checkout (static URL)", { moduleId: module.id });

  const checkoutUrl = gatewayConfig?.config?.checkout_url;

  if (!checkoutUrl) {
    logStep("Asaas checkout URL not configured");
    throw new Error("Asaas checkout não configurado. Configure a URL no painel de administração.");
  }

  logStep("Asaas checkout URL found", { checkoutUrl });

  return new Response(
    JSON.stringify({
      gateway: 'asaas',
      url: checkoutUrl,
      module_id: module.id,
      user_id: user.id,
      tenant_id: tenantId
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    // Create clients
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error("Authentication required");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's tenant
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      logStep("Profile/tenant lookup failed", { error: profileError?.message });
      throw new Error("Tenant not found");
    }

    const tenantId = profile.tenant_id;
    logStep("Tenant found", { tenantId });

    // Get request body
    const { moduleId, gateway = 'stripe' } = await req.json();
    if (!moduleId) {
      throw new Error("Invalid request");
    }
    logStep("Request received", { moduleId, gateway });

    // Get module details
    const { data: module, error: moduleError } = await supabase
      .from("addon_modules")
      .select("*")
      .eq("id", moduleId)
      .eq("is_active", true)
      .single();

    if (moduleError || !module) {
      logStep("Module lookup failed", { moduleId, error: moduleError?.message });
      throw new Error("Module not found");
    }
    logStep("Module found", { name: module.name, price: module.monthly_price });

    // Check if already subscribed
    const { data: existingSub } = await supabase
      .from("tenant_addon_subscriptions")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("addon_module_id", moduleId)
      .in("status", ["active", "trial"])
      .maybeSingle();

    if (existingSub) {
      logStep("Module already subscribed", { subscriptionId: existingSub.id });
      return new Response(
        JSON.stringify({ error: "Módulo já está ativo", code: "ALREADY_SUBSCRIBED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "https://start-a-new-quest.lovable.app";

    // Process based on gateway
    if (gateway === 'stripe') {
      return await processStripeModuleCheckout(module, user, tenantId, origin);
    }

    // For Asaas, fetch config with checkout_url
    if (gateway === 'asaas') {
      const { data: gatewayConfig } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("provider", "asaas")
        .eq("is_active", true)
        .maybeSingle();

      if (!gatewayConfig) {
        throw new Error("Gateway de pagamento não disponível");
      }

      return await processAsaasModuleCheckout(module, user, tenantId, gatewayConfig);
    }

    throw new Error("Gateway não suportado");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Checkout failed";
    logStep("ERROR", { message: errorMessage });
    
    const safeErrors = [
      "Authentication required",
      "Invalid request",
      "Module not found",
      "Tenant not found",
      "Payment service unavailable",
      "Gateway de pagamento não disponível",
      "Gateway não suportado",
      "Módulo já está ativo",
      "Asaas checkout não configurado. Configure a URL no painel de administração."
    ];
    const clientError = safeErrors.includes(errorMessage) ? errorMessage : "Checkout failed";
    
    return new Response(
      JSON.stringify({ error: clientError, code: "CHECKOUT_ERROR" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
