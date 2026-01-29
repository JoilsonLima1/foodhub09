import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Process Stripe checkout
async function processStripeCheckout(
  plan: any,
  user: any,
  origin: string,
  supabase: any,
  globalTrialDays: number
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

  // Get or create Stripe price
  let priceId = plan.stripe_price_id;
  
  if (!priceId) {
    logStep("Creating Stripe product and price");
    
    const product = await stripe.products.create({
      name: `FoodHub ${plan.name}`,
      description: plan.description || undefined,
      metadata: { plan_id: plan.id }
    });
    
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(plan.monthly_price * 100),
      currency: plan.currency.toLowerCase(),
      recurring: { interval: "month" },
      metadata: { plan_id: plan.id }
    });

    priceId = price.id;

    await supabase
      .from("subscription_plans")
      .update({
        stripe_product_id: product.id,
        stripe_price_id: price.id
      })
      .eq("id", plan.id);

    logStep("Stripe product and price created", { productId: product.id, priceId });
  }

  // Calculate remaining trial days
  const userCreatedAt = new Date(user.created_at);
  const now = new Date();
  const daysUsed = Math.floor((now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const remainingTrialDays = Math.max(0, globalTrialDays - daysUsed);

  logStep("Trial calculation", { globalTrialDays, daysUsed, remainingTrialDays });

  // Build subscription data
  const subscriptionData: {
    trial_period_days?: number;
    metadata: { plan_id: string; user_id: string; days_used_before_upgrade: number };
  } = {
    metadata: {
      plan_id: plan.id,
      user_id: user.id,
      days_used_before_upgrade: daysUsed
    }
  };

  if (remainingTrialDays > 0) {
    subscriptionData.trial_period_days = remainingTrialDays;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: customerId ? undefined : user.email!,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
    subscription_data: subscriptionData,
    metadata: {
      plan_id: plan.id,
      user_id: user.id,
      days_used_before_upgrade: daysUsed.toString()
    }
  });

  logStep("Stripe checkout session created", { sessionId: session.id });

  return new Response(
    JSON.stringify({ url: session.url, sessionId: session.id, gateway: 'stripe' }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

// Process PIX checkout
async function processPixCheckout(
  plan: any,
  user: any,
  gatewayConfig: any,
  supabase: any
) {
  logStep("Processing PIX checkout", { planId: plan.id, userId: user.id });

  const pixKey = gatewayConfig?.config?.pix_key || '';
  const qrCodeUrl = gatewayConfig?.config?.qr_code_url || '';

  if (!pixKey) {
    throw new Error("PIX não configurado corretamente");
  }

  // For PIX, we return the payment info directly (manual verification required)
  return new Response(
    JSON.stringify({
      gateway: 'pix',
      pix_key: pixKey,
      qr_code: qrCodeUrl,
      amount: plan.monthly_price,
      plan_id: plan.id,
      user_id: user.id,
      instructions: 'Após o pagamento, sua assinatura será ativada em até 24h úteis.'
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

// Process Asaas checkout
async function processAsaasCheckout(
  plan: any,
  user: any,
  gatewayConfig: any,
  origin: string
) {
  logStep("Processing Asaas checkout", { planId: plan.id, userId: user.id });

  // Asaas integration would require API key stored in secrets
  // For now, we'll return a placeholder URL or the configured URL
  const asaasUrl = gatewayConfig?.config?.checkout_url || null;

  if (!asaasUrl) {
    // If no pre-configured URL, return error
    throw new Error("Asaas não configurado corretamente. Configure a URL de checkout no painel.");
  }

  return new Response(
    JSON.stringify({
      gateway: 'asaas',
      url: asaasUrl,
      plan_id: plan.id,
      user_id: user.id
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
      logStep("ERROR: Missing authorization header");
      throw new Error("Authentication required");
    }

    // Create user-authenticated client
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user token
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      logStep("Token validation failed", { error: userError?.message });
      throw new Error("Authentication required");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { planId, gateway = 'stripe' } = await req.json();
    if (!planId) {
      throw new Error("Invalid request");
    }
    logStep("Request received", { planId, gateway });

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logStep("Plan lookup failed", { planId, error: planError?.message });
      throw new Error("Resource not found");
    }
    logStep("Plan found", { name: plan.name, price: plan.monthly_price });

    // If it's a free plan, don't create checkout
    if (plan.monthly_price === 0) {
      logStep("Free plan selected, no checkout needed");
      return new Response(
        JSON.stringify({ success: true, free: true, message: "Free plan activated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get global trial period from system settings
    let globalTrialDays = 14;
    try {
      const { data: trialSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "trial_period")
        .single();
      
      if (trialSetting?.setting_value?.days) {
        globalTrialDays = trialSetting.setting_value.days;
      }
    } catch (e) {
      logStep("Using default global trial period", { globalTrialDays });
    }

    const origin = req.headers.get("origin") || "https://start-a-new-quest.lovable.app";

    // Process based on selected gateway
    if (gateway === 'stripe') {
      return await processStripeCheckout(plan, user, origin, supabase, globalTrialDays);
    }

    // For non-Stripe gateways, fetch gateway config
    const { data: gatewayConfig, error: gatewayError } = await supabase
      .from("payment_gateways")
      .select("*")
      .eq("provider", gateway)
      .eq("is_active", true)
      .maybeSingle();

    if (gatewayError) {
      logStep("Gateway lookup error", { gateway, error: gatewayError.message });
    }

    if (!gatewayConfig) {
      logStep("Gateway not found or inactive", { gateway });
      throw new Error("Gateway de pagamento não disponível");
    }

    logStep("Gateway config found", { gateway, gatewayId: gatewayConfig.id });

    switch (gateway) {
      case 'pix':
        return await processPixCheckout(plan, user, gatewayConfig, supabase);
      case 'asaas':
        return await processAsaasCheckout(plan, user, gatewayConfig, origin);
      default:
        throw new Error("Gateway não suportado");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Checkout failed";
    logStep("ERROR", { message: errorMessage });
    
    const safeErrors = [
      "Authentication required", 
      "Invalid request", 
      "Resource not found", 
      "Payment service unavailable",
      "Gateway de pagamento não disponível",
      "Gateway não suportado",
      "PIX não configurado corretamente",
      "Asaas não configurado corretamente. Configure a URL de checkout no painel."
    ];
    const clientError = safeErrors.includes(errorMessage) ? errorMessage : "Checkout failed";
    
    return new Response(
      JSON.stringify({ error: clientError, code: "CHECKOUT_ERROR" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
