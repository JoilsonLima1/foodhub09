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
    const existingCpfCnpj = searchResult.data[0].cpfCnpj;
    logStep("Existing Asaas customer found", { customerId, hasCpfCnpj: !!existingCpfCnpj });

    // IMPORTANTE: Atualizar CPF/CNPJ se fornecido e diferente do atual
    // Isso é OBRIGATÓRIO para liberar todas as formas de pagamento (PIX, Cartão, Boleto)
    if (cpfCnpj && cpfCnpj !== existingCpfCnpj) {
      try {
        const updateResponse = await fetch(`${baseUrl}/customers/${customerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'access_token': apiKey
          },
          body: JSON.stringify({ cpfCnpj })
        });
        
        if (updateResponse.ok) {
          logStep("Asaas customer CPF/CNPJ updated successfully", { customerId });
        } else {
          const err = await updateResponse.json();
          logStep("Asaas customer update failed (cpfCnpj)", err);
        }
      } catch (e) {
        logStep("Asaas customer update exception (cpfCnpj)", { error: String(e) });
      }
    }

    return customerId;
  }

  // Create new customer - CPF/CNPJ é obrigatório para todas as formas de pagamento
  const customerBody: any = {
    name: user.user_metadata?.name || user.email.split('@')[0],
    email: user.email,
    externalReference: user.id,
  };
  
  // Adicionar CPF/CNPJ se fornecido
  if (cpfCnpj) {
    customerBody.cpfCnpj = cpfCnpj;
  }

  logStep("Creating new Asaas customer", { email: user.email, hasCpfCnpj: !!cpfCnpj });

  const createResponse = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey
    },
    body: JSON.stringify(customerBody)
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

// Process Asaas checkout via API
async function processAsaasCheckout(
  plan: any,
  user: any,
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
  // For low-priced plans, force PIX to keep the flow working.
  const billingType = Number(plan.monthly_price) < 5 ? 'PIX' : 'UNDEFINED';
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3); // 3 days to pay

  const paymentBody = {
    customer: customerId,
    billingType,
    value: plan.monthly_price,
    dueDate: dueDate.toISOString().split('T')[0],
    description: `Assinatura ${plan.name}`,
    // Asaas limita externalReference a 100 chars
    // Formato compacto: p:<planId>|u:<userId>
    externalReference: `p:${plan.id}|u:${user.id}`
  };

  logStep("Creating Asaas payment", { customerId, value: plan.monthly_price, billingType });

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
    logStep("Asaas payment creation failed", errorData);
    throw new Error(errorData.errors?.[0]?.description || "Falha ao criar cobrança no Asaas");
  }

  const payment = await paymentResponse.json();
  logStep("Asaas payment created", { 
    paymentId: payment.id, 
    invoiceUrl: payment.invoiceUrl,
    status: payment.status 
  });

  return new Response(
    JSON.stringify({
      gateway: 'asaas',
      url: payment.invoiceUrl,
      payment_id: payment.id,
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
    const { planId, gateway = 'stripe', customerCpfCnpj } = await req.json();
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

    // For Asaas, fetch gateway config with API key
    if (gateway === 'asaas') {
      const { data: gatewayConfig, error: gatewayError } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("provider", "asaas")
        .eq("is_active", true)
        .maybeSingle();

      if (gatewayError) {
        logStep("Gateway lookup error", { gateway, error: gatewayError.message });
      }

      if (!gatewayConfig) {
        logStep("Asaas gateway not found or inactive");
        throw new Error("Gateway de pagamento não disponível");
      }

      logStep("Asaas gateway config found", { gatewayId: gatewayConfig.id });
      return await processAsaasCheckout(plan, user, origin, gatewayConfig, customerCpfCnpj);
    }

    throw new Error("Gateway não suportado");

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
