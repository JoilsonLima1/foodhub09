import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PARTNER-TENANT-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate partner user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error("Authentication required");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Service client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const body = await req.json();
    const { 
      tenant_id,
      tenant_subscription_id,
      gateway = 'asaas',
      customer_cpf_cnpj,
      billing_type = 'UNDEFINED' // PIX, BOLETO, CREDIT_CARD, UNDEFINED
    } = body;

    if (!tenant_id || !tenant_subscription_id) {
      throw new Error("tenant_id and tenant_subscription_id are required");
    }

    logStep("Request received", { tenant_id, tenant_subscription_id, gateway });

    // Verify partner has access to this tenant
    const { data: partnerTenant, error: ptError } = await supabase
      .from('partner_tenants')
      .select(`
        id,
        partner_id,
        partner_plan_id,
        tenant:tenants!tenant_id (id, name, email),
        partner:partners!partner_id (id, name),
        plan:partner_plans!partner_plan_id (id, name, monthly_price, currency)
      `)
      .eq('tenant_id', tenant_id)
      .single();

    if (ptError || !partnerTenant) {
      logStep("Partner tenant not found", { error: ptError?.message });
      throw new Error("Tenant not found or access denied");
    }

    // Verify user is partner admin
    const { data: partnerUser, error: puError } = await supabase
      .from('partner_users')
      .select('id, role')
      .eq('partner_id', partnerTenant.partner_id)
      .eq('user_id', user.id)
      .single();

    if (puError || !partnerUser) {
      throw new Error("Access denied - not a partner user");
    }

    logStep("Partner access verified", { partnerId: partnerTenant.partner_id, role: partnerUser.role });

    const tenant = partnerTenant.tenant as any;
    const plan = partnerTenant.plan as any;

    if (!plan) {
      throw new Error("No plan associated with this tenant");
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('id', tenant_subscription_id)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    const amount = plan.monthly_price || subscription.monthly_amount || 0;
    if (amount <= 0) {
      throw new Error("Invalid amount - plan has no price");
    }

    logStep("Creating checkout", { 
      tenantName: tenant?.name, 
      planName: plan.name, 
      amount 
    });

    // Process based on gateway
    if (gateway === 'asaas') {
      return await processAsaasCheckout(
        supabase,
        partnerTenant,
        subscription,
        tenant,
        plan,
        user,
        amount,
        customer_cpf_cnpj,
        billing_type,
        req.headers.get("origin") || "https://start-a-new-quest.lovable.app"
      );
    }

    throw new Error("Gateway not supported: " + gateway);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Checkout failed";
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function processAsaasCheckout(
  supabase: any,
  partnerTenant: any,
  subscription: any,
  tenant: any,
  plan: any,
  user: any,
  amount: number,
  customerCpfCnpj?: string,
  billingType: string = 'UNDEFINED',
  origin: string = ''
) {
  // Get Asaas gateway config
  const { data: gatewayConfig, error: gatewayError } = await supabase
    .from("payment_gateways")
    .select("*")
    .eq("provider", "asaas")
    .eq("is_active", true)
    .maybeSingle();

  if (gatewayError || !gatewayConfig) {
    logStep("Asaas gateway not found");
    throw new Error("Payment gateway not configured");
  }

  const asaasApiKey = gatewayConfig.api_key_masked;
  if (!asaasApiKey) {
    throw new Error("Asaas API key not configured");
  }

  // Auto-detect environment
  const isProduction = asaasApiKey.startsWith('$aact_prod_');
  const baseUrl = isProduction 
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

  logStep("Asaas environment", { isProduction });

  // Find or create Asaas customer
  const cpfCnpj = customerCpfCnpj?.replace(/\D/g, '');
  const customerEmail = tenant?.email || user.email;
  const customerName = tenant?.name || 'Tenant';

  // Search existing customer
  const searchResponse = await fetch(
    `${baseUrl}/customers?email=${encodeURIComponent(customerEmail)}`,
    { headers: { 'access_token': asaasApiKey } }
  );

  if (!searchResponse.ok) {
    throw new Error("Failed to search Asaas customer");
  }

  const searchResult = await searchResponse.json();
  let customerId: string;

  if (searchResult.data?.length > 0) {
    customerId = searchResult.data[0].id;
    logStep("Existing Asaas customer found", { customerId });

    // Update CPF/CNPJ if provided
    if (cpfCnpj && cpfCnpj !== searchResult.data[0].cpfCnpj) {
      await fetch(`${baseUrl}/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify({ cpfCnpj })
      });
    }
  } else {
    // Create new customer
    const customerBody: any = {
      name: customerName,
      email: customerEmail,
      externalReference: tenant?.id,
    };
    if (cpfCnpj) customerBody.cpfCnpj = cpfCnpj;

    const createResponse = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
      body: JSON.stringify(customerBody)
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.errors?.[0]?.description || "Failed to create customer");
    }

    const newCustomer = await createResponse.json();
    customerId = newCustomer.id;
    logStep("Asaas customer created", { customerId });
  }

  // Asaas minimum value check
  const ASAAS_MIN_VALUE = 5.00;
  const finalBillingType = amount < ASAAS_MIN_VALUE ? 'PIX' : billingType;

  // Create payment
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  // External reference format: pts:<subscription_id_prefix>|t:<tenant_id_prefix>
  const externalRef = `pts:${subscription.id.substring(0, 8)}|t:${tenant?.id?.substring(0, 8) || ''}`;

  const paymentBody = {
    customer: customerId,
    billingType: finalBillingType,
    value: amount,
    dueDate: dueDate.toISOString().split('T')[0],
    description: `Assinatura ${plan.name} - ${customerName}`,
    externalReference: externalRef
  };

  logStep("Creating Asaas payment", { customerId, value: amount, billingType: finalBillingType });

  const paymentResponse = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
    body: JSON.stringify(paymentBody)
  });

  if (!paymentResponse.ok) {
    const errorData = await paymentResponse.json();
    logStep("Asaas payment creation failed", errorData);
    throw new Error(errorData.errors?.[0]?.description || "Failed to create payment");
  }

  const payment = await paymentResponse.json();
  logStep("Asaas payment created", { 
    paymentId: payment.id, 
    invoiceUrl: payment.invoiceUrl,
    status: payment.status 
  });

  // Create invoice record
  const { data: invoice, error: invoiceError } = await supabase
    .from('partner_invoices')
    .insert({
      tenant_subscription_id: subscription.id,
      tenant_id: tenant?.id,
      partner_id: partnerTenant.partner_id,
      partner_plan_id: plan.id,
      amount,
      currency: plan.currency || 'BRL',
      description: `Assinatura ${plan.name}`,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      payment_provider: 'asaas',
      gateway_payment_id: payment.id,
      gateway_invoice_url: payment.invoiceUrl,
      billing_type: finalBillingType
    })
    .select()
    .single();

  if (invoiceError) {
    logStep("Failed to create invoice record", { error: invoiceError.message });
  } else {
    logStep("Invoice record created", { invoiceId: invoice?.id });
  }

  // Update subscription with payment attempt
  await supabase
    .from('tenant_subscriptions')
    .update({
      last_payment_attempt_at: new Date().toISOString(),
      payment_attempts: (subscription.payment_attempts || 0) + 1,
      external_subscription_id: payment.id,
      payment_provider: 'asaas',
      billing_mode: 'automatic'
    })
    .eq('id', subscription.id);

  return new Response(
    JSON.stringify({
      success: true,
      gateway: 'asaas',
      url: payment.invoiceUrl,
      payment_id: payment.id,
      invoice_id: invoice?.id,
      tenant_id: tenant?.id,
      subscription_id: subscription.id
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}
