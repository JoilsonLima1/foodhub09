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

// Find or create Asaas customer
async function findOrCreateAsaasCustomer(
  baseUrl: string,
  apiKey: string,
  user: any,
  cpfCnpj?: string
): Promise<string> {
  // Search existing customer by email
  const searchResponse = await fetch(
    `${baseUrl}/customers?email=${encodeURIComponent(user.email)}`,
    { headers: { 'access_token': apiKey } }
  );
  
  if (!searchResponse.ok) {
    const errorData = await searchResponse.json();
    logStep("Asaas customer search failed", errorData);
    throw new Error("Falha ao buscar cliente no Asaas");
  }

  const searchResult = await searchResponse.json();

  if (searchResult.data?.length > 0) {
    const customerId = searchResult.data[0].id;
    logStep("Existing Asaas customer found", { customerId });

    if (cpfCnpj) {
      try {
        const updateResponse = await fetch(`${baseUrl}/customers/${customerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'access_token': apiKey
          },
          body: JSON.stringify({ cpfCnpj })
        });
        if (!updateResponse.ok) {
          const err = await updateResponse.json();
          logStep("Asaas customer update failed (cpfCnpj)", err);
        }
      } catch (e) {
        logStep("Asaas customer update exception (cpfCnpj)");
      }
    }

    return customerId;
  }

  // Create new customer
  const createResponse = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey
    },
    body: JSON.stringify({
      name: user.user_metadata?.name || user.email.split('@')[0],
      email: user.email,
      externalReference: user.id,
      ...(cpfCnpj ? { cpfCnpj } : {})
    })
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    logStep("Asaas customer creation failed", error);
    throw new Error(error.errors?.[0]?.description || "Falha ao criar cliente no Asaas");
  }

  const newCustomer = await createResponse.json();
  logStep("Asaas customer created", { customerId: newCustomer.id });
  return newCustomer.id;
}

// Process Asaas checkout for module via API
async function processAsaasModuleCheckout(
  module: any,
  user: any,
  tenantId: string,
  origin: string,
  gatewayConfig: any,
  customerCpfCnpj?: string
) {
  const asaasApiKey = gatewayConfig.api_key_masked;
  
  if (!asaasApiKey) {
    logStep("Asaas API Key not configured");
    throw new Error("API Key do Asaas não configurada no gateway");
  }

  // Auto-detect environment from API key prefix
  const isProduction = asaasApiKey.startsWith('$aact_prod_');
  const baseUrl = isProduction 
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

  logStep("Asaas environment detected", { isProduction, baseUrl: baseUrl.replace(/https?:\/\//, '') });

  // 1. Find or create customer
  const cpfCnpj = customerCpfCnpj?.replace(/\D/g, '');
  const customerId = await findOrCreateAsaasCustomer(baseUrl, asaasApiKey, user, cpfCnpj);

  // 2. Create payment
  // IMPORTANT: Asaas enforces a minimum value of R$ 5,00 for billingType=UNDEFINED ("Pergunte ao Cliente").
  // For low-priced modules, force PIX to keep the flow working.
  const billingType = Number(module.monthly_price) < 5 ? 'PIX' : 'UNDEFINED';
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  // Asaas externalReference limited to 100 chars
  // Use a compact JSON format with abbreviated keys
  const refData = { t: 'mod', m: module.id.slice(0, 8), tn: tenantId.slice(0, 8) };
  const externalReference = JSON.stringify(refData);

  const paymentBody = {
    customer: customerId,
    billingType,
    value: module.monthly_price,
    dueDate: dueDate.toISOString().split('T')[0],
    description: `Módulo: ${module.name}`,
    externalReference
  };

  logStep("Creating Asaas module payment", { customerId, value: module.monthly_price, billingType, refLength: externalReference.length });

  const paymentResponse = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': asaasApiKey
    },
    body: JSON.stringify(paymentBody)
  });

  if (!paymentResponse.ok) {
    const errorData = await paymentResponse.json();
    logStep("Asaas module payment creation failed", errorData);
    throw new Error(errorData.errors?.[0]?.description || "Falha ao criar cobrança no Asaas");
  }

  const payment = await paymentResponse.json();
  logStep("Asaas module payment created", { 
    paymentId: payment.id, 
    invoiceUrl: payment.invoiceUrl,
    status: payment.status 
  });

  return new Response(
    JSON.stringify({
      gateway: 'asaas',
      url: payment.invoiceUrl,
      payment_id: payment.id,
      module_id: module.id,
      tenant_id: tenantId,
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
    const { moduleId, gateway = 'stripe', customerCpfCnpj } = await req.json();
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

    // Asaas requires minimum value of R$ 5,00
    const ASAAS_MIN_VALUE = 5.00;
    if (gateway === 'asaas' && Number(module.monthly_price) < ASAAS_MIN_VALUE) {
      logStep("Module price below Asaas minimum", { price: module.monthly_price, minimum: ASAAS_MIN_VALUE });
      return new Response(
        JSON.stringify({ 
          error: `Valor mínimo para Asaas é R$ ${ASAAS_MIN_VALUE.toFixed(2)}. Ajuste o preço do módulo ou use outro gateway.`,
          code: "ASAAS_MIN_VALUE_ERROR" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

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

    // Check if module is included in user's current plan (brinde)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("subscription_plan_id")
      .eq("id", tenantId)
      .single();

    if (tenant?.subscription_plan_id) {
      const { data: planIncluded } = await supabase
        .from("plan_addon_modules")
        .select("id")
        .eq("plan_id", tenant.subscription_plan_id)
        .eq("addon_module_id", moduleId)
        .maybeSingle();

      if (planIncluded) {
        logStep("Module already included in plan (brinde)", { planId: tenant.subscription_plan_id });
        return new Response(
          JSON.stringify({ error: "Este módulo já está incluído no seu plano como brinde", code: "INCLUDED_IN_PLAN" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    const origin = req.headers.get("origin") || "https://start-a-new-quest.lovable.app";

    // Process based on gateway
    if (gateway === 'stripe') {
      return await processStripeModuleCheckout(module, user, tenantId, origin);
    }

    // For Asaas, fetch config with API key
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

      return await processAsaasModuleCheckout(module, user, tenantId, origin, gatewayConfig, customerCpfCnpj);
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
      "API Key do Asaas não configurada no gateway",
      "Falha ao buscar cliente no Asaas",
      "Falha ao criar cliente no Asaas",
      "Falha ao criar cobrança no Asaas"
    ];
    const clientError = safeErrors.includes(errorMessage) ? errorMessage : "Checkout failed";
    
    return new Response(
      JSON.stringify({ error: clientError, code: "CHECKOUT_ERROR" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
