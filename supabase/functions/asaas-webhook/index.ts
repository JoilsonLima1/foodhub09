import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ASAAS-WEBHOOK] ${step}${detailsStr}`);
};

type ParsedRef =
  | { type: 'plan'; plan_id: string; user_id: string }
  | { type: 'module'; module_id_prefix: string; tenant_id_prefix: string };

function parseExternalReference(ref: string): ParsedRef | null {
  // Try JSON format first (new compact format)
  try {
    const json = JSON.parse(ref);
    // New compact format: { t: 'mod', m: 'first8chars', tn: 'first8chars' }
    if (json.t === 'mod' && json.m && json.tn) {
      return { type: 'module', module_id_prefix: json.m, tenant_id_prefix: json.tn };
    }
    // Plan format: { t: 'plan', p: 'first8chars', u: 'first8chars' }
    if (json.t === 'plan' && json.p && json.u) {
      return { type: 'plan', plan_id: json.p, user_id: json.u };
    }
  } catch {
    // Not JSON, try legacy pipe format
  }

  // Legacy formats:
  // Plan:   p:<planId>|u:<userId>
  // Module: m:<moduleId>|t:<tenantId>|u:<userId>
  const parts = ref.split('|').map((p) => p.trim()).filter(Boolean);
  const map: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const k = part.slice(0, idx);
    const v = part.slice(idx + 1);
    if (k && v) map[k] = v;
  }

  if (map.p && map.u) {
    return { type: 'plan', plan_id: map.p, user_id: map.u };
  }
  if (map.m && map.t) {
    return { type: 'module', module_id_prefix: map.m, tenant_id_prefix: map.t };
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received", { method: req.method });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    logStep("Event received", { event: body.event, paymentId: body.payment?.id });

    // Only process confirmed payments
    if (body.event !== "PAYMENT_RECEIVED" && body.event !== "PAYMENT_CONFIRMED") {
      logStep("Event ignored (not a payment confirmation)", { event: body.event });
      return new Response(
        JSON.stringify({ received: true, processed: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment = body.payment;
    if (!payment?.externalReference) {
      logStep("No externalReference found, skipping");
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "no_external_reference" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata = parseExternalReference(String(payment.externalReference));
    if (!metadata) {
      logStep("Invalid externalReference", { externalReference: payment.externalReference });
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "invalid_external_reference" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Metadata parsed", metadata);

    if (metadata.type === 'plan') {
      // Activate subscription plan
      await activatePlanSubscription(supabase, metadata, payment);
    }

    if (metadata.type === 'module') {
      // Activate addon module - need to find full IDs from prefixes
      await activateModuleSubscription(supabase, metadata, payment);
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Webhook processing failed";
    logStep("ERROR", { message: errorMessage });
    
    // Return 200 to prevent Asaas from retrying (we log the error for debugging)
    return new Response(
      JSON.stringify({ received: true, processed: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

async function activatePlanSubscription(
  supabase: any,
  metadata: { plan_id: string; user_id: string },
  payment: any
) {
  logStep("Activating plan subscription", { planId: metadata.plan_id, userId: metadata.user_id });

  // Get user's profile to find tenant
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', metadata.user_id)
    .single();

  if (profileError || !profile?.tenant_id) {
    logStep("Profile/tenant not found", { error: profileError?.message });
    throw new Error("Tenant not found for user");
  }

  logStep("Tenant found", { tenantId: profile.tenant_id });

  // Get plan details
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', metadata.plan_id)
    .single();

  if (planError || !plan) {
    logStep("Plan not found", { error: planError?.message });
    throw new Error("Plan not found");
  }

  // Calculate subscription period (30 days from now)
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  // Determine payment method from Asaas billing type
  const paymentMethod = getPaymentMethodFromAsaas(payment.billingType);

  // Update tenant with new subscription - including Asaas tracking fields and payment info
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      subscription_plan_id: metadata.plan_id,
      subscription_current_period_start: now.toISOString(),
      subscription_current_period_end: periodEnd.toISOString(),
      asaas_customer_id: payment.customer,
      asaas_payment_id: payment.id,
      // Payment tracking fields
      last_payment_at: now.toISOString(),
      last_payment_method: paymentMethod,
      last_payment_provider: 'asaas',
      last_payment_status: 'confirmed'
    })
    .eq('id', profile.tenant_id);

  if (updateError) {
    logStep("Failed to update tenant", { error: updateError.message });
    throw new Error("Failed to activate subscription");
  }

  logStep("Plan activated successfully", { 
    tenantId: profile.tenant_id, 
    planId: metadata.plan_id,
    planName: plan.name,
    periodStart: now.toISOString(),
    periodEnd: periodEnd.toISOString(),
    asaasCustomerId: payment.customer,
    asaasPaymentId: payment.id,
    paymentMethod: paymentMethod
  });
}

function getPaymentMethodFromAsaas(billingType: string | undefined): string {
  switch (billingType) {
    case 'PIX':
      return 'pix';
    case 'CREDIT_CARD':
      return 'credit_card';
    case 'BOLETO':
      return 'boleto';
    case 'UNDEFINED':
      return 'multiple';
    default:
      return billingType?.toLowerCase() || 'unknown';
  }
}

async function activateModuleSubscription(
  supabase: any,
  metadata: { module_id_prefix: string; tenant_id_prefix: string },
  payment: any
) {
  logStep("Activating module subscription", { modulePrefix: metadata.module_id_prefix, tenantPrefix: metadata.tenant_id_prefix });

  // Find full module ID from prefix
  const { data: moduleData, error: moduleError } = await supabase
    .from('addon_modules')
    .select('id, name')
    .like('id', `${metadata.module_id_prefix}%`)
    .single();

  if (moduleError || !moduleData) {
    logStep("Module not found by prefix", { prefix: metadata.module_id_prefix, error: moduleError?.message });
    throw new Error("Module not found");
  }

  // Find full tenant ID from prefix
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .like('id', `${metadata.tenant_id_prefix}%`)
    .single();

  if (tenantError || !tenantData) {
    logStep("Tenant not found by prefix", { prefix: metadata.tenant_id_prefix, error: tenantError?.message });
    throw new Error("Tenant not found");
  }

  const moduleId = moduleData.id;
  const tenantId = tenantData.id;

  logStep("Found full IDs", { moduleId, tenantId, moduleName: moduleData.name });

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);

  const nextBillingDate = new Date(now);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  // Create or update module subscription with full payment tracking
  const { error: upsertError } = await supabase
    .from('tenant_addon_subscriptions')
    .upsert({
      tenant_id: tenantId,
      addon_module_id: moduleId,
      status: 'active',
      source: 'purchase',
      is_free: false,
      price_paid: payment.value || 0,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      purchased_at: now.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
      asaas_payment_id: payment.id,
      billing_mode: 'separate'
    }, {
      onConflict: 'tenant_id,addon_module_id'
    });

  if (upsertError) {
    logStep("Failed to upsert module subscription", { error: upsertError.message });
    throw new Error("Failed to activate module");
  }

  logStep("Module activated successfully", { 
    tenantId, 
    moduleId,
    moduleName: moduleData.name,
    pricePaid: payment.value,
    nextBilling: nextBillingDate.toISOString()
  });
}
