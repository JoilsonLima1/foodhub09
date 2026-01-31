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

// Legacy parser for backward compatibility with old externalReference format
type ParsedRef =
  | { type: 'plan'; plan_id: string; user_id: string }
  | { type: 'module'; module_id_prefix: string; tenant_id_prefix: string };

function parseExternalReference(ref: string): ParsedRef | null {
  // Try JSON format first (old compact format)
  try {
    const json = JSON.parse(ref);
    if (json.t === 'mod' && json.m && json.tn) {
      return { type: 'module', module_id_prefix: json.m, tenant_id_prefix: json.tn };
    }
    if (json.t === 'plan' && json.p && json.u) {
      return { type: 'plan', plan_id: json.p, user_id: json.u };
    }
  } catch {
    // Not JSON
  }

  // Try new simple format: mod:modulePrefix:tenantPrefix
  if (ref.startsWith('mod:')) {
    const parts = ref.split(':');
    if (parts.length >= 3) {
      return { type: 'module', module_id_prefix: parts[1], tenant_id_prefix: parts[2] };
    }
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
    const paymentId = body.payment?.id;
    logStep("Event received", { event: body.event, paymentId });

    // Only process confirmed payments
    if (body.event !== "PAYMENT_RECEIVED" && body.event !== "PAYMENT_CONFIRMED") {
      logStep("Event ignored (not a payment confirmation)", { event: body.event });
      return new Response(
        JSON.stringify({ received: true, processed: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment = body.payment;
    if (!paymentId) {
      logStep("No payment ID found, skipping");
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "no_payment_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // NEW ARCHITECTURE: First try to find module purchase by payment_id
    // This is the PRIMARY lookup method
    // ============================================================
    const { data: modulePurchase, error: purchaseError } = await supabase
      .from('module_purchases')
      .select(`
        id,
        tenant_id,
        addon_module_id,
        user_id,
        status,
        gateway,
        addon_modules:addon_module_id (id, name, slug, monthly_price)
      `)
      .eq('gateway_payment_id', paymentId)
      .eq('status', 'pending')
      .maybeSingle();

    if (modulePurchase) {
      logStep("Module purchase found by payment_id", { 
        purchaseId: modulePurchase.id,
        moduleId: modulePurchase.addon_module_id,
        tenantId: modulePurchase.tenant_id
      });

      // Activate the module
      await activateModuleFromPurchase(supabase, modulePurchase, payment);
      
      return new Response(
        JSON.stringify({ received: true, processed: true, type: 'module', method: 'payment_id' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("No module purchase found by payment_id, trying legacy methods", { paymentId });

    // ============================================================
    // LEGACY FALLBACK: Try externalReference for backward compatibility
    // ============================================================
    if (!payment?.externalReference) {
      // Store as unmatched event for later processing
      await storeUnmatchedEvent(supabase, 'asaas', body.event, payment);
      logStep("No externalReference and no module_purchase match, stored as unmatched");
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "no_match", stored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata = parseExternalReference(String(payment.externalReference));
    if (!metadata) {
      await storeUnmatchedEvent(supabase, 'asaas', body.event, payment);
      logStep("Invalid externalReference, stored as unmatched", { externalReference: payment.externalReference });
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "invalid_external_reference", stored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Metadata parsed from externalReference (legacy)", metadata);

    if (metadata.type === 'plan') {
      await activatePlanSubscription(supabase, metadata, payment);
      return new Response(
        JSON.stringify({ received: true, processed: true, type: 'plan', method: 'external_reference' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (metadata.type === 'module') {
      // Legacy module activation via prefix matching
      await activateModuleSubscriptionLegacy(supabase, metadata, payment);
      return new Response(
        JSON.stringify({ received: true, processed: true, type: 'module', method: 'external_reference_legacy' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ received: true, processed: false, reason: "unknown_type" }),
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

// Store unmatched webhook events for later processing
async function storeUnmatchedEvent(
  supabase: any,
  gateway: string,
  eventType: string,
  payment: any
) {
  try {
    const { error } = await supabase
      .from('webhook_unmatched_events')
      .upsert({
        gateway,
        event_type: eventType,
        gateway_payment_id: payment?.id || null,
        gateway_customer_id: payment?.customer || null,
        payload: { payment, timestamp: new Date().toISOString() },
        status: 'pending'
      }, {
        onConflict: 'gateway,gateway_payment_id'
      });
    
    if (error) {
      logStep("Failed to store unmatched event", { error: error.message });
    } else {
      logStep("Unmatched event stored", { paymentId: payment?.id });
    }
  } catch (e) {
    logStep("Exception storing unmatched event", { error: String(e) });
  }
}

// NEW: Activate module from module_purchases record
async function activateModuleFromPurchase(
  supabase: any,
  purchase: any,
  payment: any
) {
  const { tenant_id, addon_module_id, user_id, id: purchaseId } = purchase;
  const moduleData = purchase.addon_modules;

  logStep("Activating module from purchase", { 
    purchaseId,
    moduleId: addon_module_id, 
    tenantId: tenant_id,
    moduleName: moduleData?.name
  });

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);
  const nextBillingDate = new Date(now);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  // 1. Update module_purchases to PAID
  const { error: updatePurchaseError } = await supabase
    .from('module_purchases')
    .update({
      status: 'paid',
      billing_type: payment.billingType,
      invoice_number: payment.invoiceNumber || null,
      paid_at: now.toISOString()
    })
    .eq('id', purchaseId);

  if (updatePurchaseError) {
    logStep("Failed to update module_purchases", { error: updatePurchaseError.message });
  }

  // 2. Create or update tenant_addon_subscriptions (activate the module)
  const { error: upsertError } = await supabase
    .from('tenant_addon_subscriptions')
    .upsert({
      tenant_id,
      addon_module_id,
      status: 'active',
      source: 'purchase',
      is_free: false,
      price_paid: payment.value || moduleData?.monthly_price || 0,
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
    logStep("Failed to upsert tenant_addon_subscriptions", { error: upsertError.message });
    throw new Error("Failed to activate module");
  }

  logStep("Module activated successfully via purchase record", { 
    tenantId: tenant_id, 
    moduleId: addon_module_id,
    moduleName: moduleData?.name,
    pricePaid: payment.value,
    nextBilling: nextBillingDate.toISOString()
  });
}

// Legacy: Activate plan subscription (unchanged)
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

  // Update tenant with new subscription
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      subscription_plan_id: metadata.plan_id,
      subscription_current_period_start: now.toISOString(),
      subscription_current_period_end: periodEnd.toISOString(),
      asaas_customer_id: payment.customer,
      asaas_payment_id: payment.id,
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
    paymentMethod
  });
}

// Legacy: Activate module via prefix matching (backward compatibility)
async function activateModuleSubscriptionLegacy(
  supabase: any,
  metadata: { module_id_prefix: string; tenant_id_prefix: string },
  payment: any
) {
  logStep("Activating module subscription (legacy)", { 
    modulePrefix: metadata.module_id_prefix, 
    tenantPrefix: metadata.tenant_id_prefix 
  });

  // Find full module ID from prefix
  const { data: modulesFound, error: moduleError } = await supabase
    .from('addon_modules')
    .select('id, name')
    .like('id', `${metadata.module_id_prefix}%`)
    .limit(2);

  if (moduleError || !modulesFound || modulesFound.length === 0) {
    logStep("Module not found by prefix", { prefix: metadata.module_id_prefix, error: moduleError?.message });
    throw new Error("Module not found");
  }
  
  if (modulesFound.length > 1) {
    logStep("Multiple modules found by prefix - using first match", { prefix: metadata.module_id_prefix, count: modulesFound.length });
  }
  
  const moduleData = modulesFound[0];

  // Find full tenant ID from prefix
  const { data: tenantsFound, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .like('id', `${metadata.tenant_id_prefix}%`)
    .limit(2);

  if (tenantError || !tenantsFound || tenantsFound.length === 0) {
    logStep("Tenant not found by prefix", { prefix: metadata.tenant_id_prefix, error: tenantError?.message });
    throw new Error("Tenant not found");
  }
  
  if (tenantsFound.length > 1) {
    logStep("Multiple tenants found by prefix - using first match", { prefix: metadata.tenant_id_prefix, count: tenantsFound.length });
  }
  
  const tenantData = tenantsFound[0];

  const moduleId = moduleData.id;
  const tenantId = tenantData.id;

  logStep("Found full IDs (legacy)", { moduleId, tenantId, moduleName: moduleData.name });

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);
  const nextBillingDate = new Date(now);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  // Create or update module subscription
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
    logStep("Failed to upsert module subscription (legacy)", { error: upsertError.message });
    throw new Error("Failed to activate module");
  }

  logStep("Module activated successfully (legacy)", { 
    tenantId, 
    moduleId,
    moduleName: moduleData.name,
    pricePaid: payment.value
  });
}
