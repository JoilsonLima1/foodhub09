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
  | { type: 'module'; module_id_prefix: string; tenant_id_prefix: string }
  | { type: 'partner_tenant'; subscription_id_prefix: string; tenant_id_prefix: string };

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

  // Partner tenant subscription format: pts:<subscription_id_prefix>|t:<tenant_id_prefix>
  if (ref.startsWith('pts:')) {
    const parts = ref.split('|').map((p) => p.trim()).filter(Boolean);
    const map: Record<string, string> = {};
    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      const k = part.slice(0, idx);
      const v = part.slice(idx + 1);
      if (k && v) map[k] = v;
    }
    if (map.pts && map.t) {
      return { type: 'partner_tenant', subscription_id_prefix: map.pts, tenant_id_prefix: map.t };
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

// Events that represent successful payment
const PAYMENT_SUCCESS_EVENTS = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];

// Events that represent payment reversal
const PAYMENT_REVERSAL_EVENTS = [
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED', // Handle as reversal check
];

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
    const event = body.event;
    logStep("Event received", { event, paymentId });

    // ============================================================
    // HANDLE REVERSALS (Refunds, Chargebacks, Deletions)
    // ============================================================
    if (PAYMENT_REVERSAL_EVENTS.includes(event)) {
      logStep("Processing reversal event", { event, paymentId });
      await processReversal(supabase, paymentId, event, body.payment);
      return new Response(
        JSON.stringify({ received: true, processed: true, type: 'reversal', event }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only process confirmed payments for activation
    if (!PAYMENT_SUCCESS_EVENTS.includes(event)) {
      logStep("Event ignored (not a payment confirmation or reversal)", { event });
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
      
      // Record partner transaction fees if applicable
      await recordPartnerTransactionFees(supabase, modulePurchase.tenant_id, payment);
      
      return new Response(
        JSON.stringify({ received: true, processed: true, type: 'module', method: 'payment_id' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // NEW: Try to find partner invoice by payment_id
    // ============================================================
    const partnerProcessed = await processPartnerTenantPayment(supabase, paymentId, payment);
    if (partnerProcessed) {
      return new Response(
        JSON.stringify({ received: true, processed: true, type: 'partner_tenant', method: 'payment_id' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("No module purchase found by payment_id, trying legacy methods", { paymentId });

    // ============================================================
    // LEGACY FALLBACK: Try externalReference for backward compatibility
    // ============================================================
    if (!payment?.externalReference) {
      // Store as unmatched event for later processing
      await storeUnmatchedEvent(supabase, 'asaas', event, payment);
      logStep("No externalReference and no module_purchase match, stored as unmatched");
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "no_match", stored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata = parseExternalReference(String(payment.externalReference));
    if (!metadata) {
      await storeUnmatchedEvent(supabase, 'asaas', event, payment);
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

    if (metadata.type === 'partner_tenant') {
      // Partner tenant subscription activation
      await processPartnerTenantSubscriptionLegacy(supabase, metadata, payment);
      return new Response(
        JSON.stringify({ received: true, processed: true, type: 'partner_tenant', method: 'external_reference' }),
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

// ============================================================
// NEW: Process reversals (refunds, chargebacks, cancellations)
// ============================================================
async function processReversal(
  supabase: any,
  paymentId: string,
  event: string,
  payment: any
) {
  if (!paymentId) {
    logStep("Reversal: No payment ID, skipping");
    return;
  }

  // Map event to reversal type
  let reversalType = 'refund';
  if (event.includes('CHARGEBACK')) {
    reversalType = 'chargeback';
  } else if (event === 'PAYMENT_DELETED') {
    reversalType = 'canceled';
  }

  const reason = `Asaas event: ${event}`;

  logStep("Processing reversal", { paymentId, reversalType, reason });

  // Call the reversal function
  const { data, error } = await supabase.rpc('reverse_partner_transaction', {
    p_external_payment_id: paymentId,
    p_reversal_reason: reason,
    p_reversal_type: reversalType,
  });

  if (error) {
    logStep("Reversal RPC error", { error: error.message });
    // Don't throw - log and continue
  } else {
    logStep("Reversal result", data);
  }

  // Also update any module purchases if applicable
  const { error: purchaseError } = await supabase
    .from('module_purchases')
    .update({ 
      status: 'refunded',
      notes: reason,
    })
    .eq('gateway_payment_id', paymentId);

  if (purchaseError) {
    logStep("Module purchase reversal update error", { error: purchaseError.message });
  }

  // Update partner invoices if applicable
  const { error: invoiceError } = await supabase
    .from('partner_invoices')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      notes: reason,
    })
    .eq('gateway_payment_id', paymentId);

  if (invoiceError) {
    logStep("Partner invoice reversal update error", { error: invoiceError.message });
  }
}

// ============================================================
// NEW: Record partner transaction fees (idempotent)
// ============================================================
async function recordPartnerTransactionFees(
  supabase: any,
  tenantId: string,
  payment: any
) {
  try {
    // Get partner for this tenant
    const { data: partnerId, error: partnerError } = await supabase
      .rpc('get_partner_for_tenant', { p_tenant_id: tenantId });

    if (partnerError || !partnerId) {
      logStep("No partner found for tenant, skipping fee recording", { tenantId });
      return;
    }

    const paymentMethod = getPaymentMethodFromAsaas(payment.billingType);
    const amount = payment.value || 0;

    if (amount <= 0) {
      logStep("Zero or negative amount, skipping fee recording");
      return;
    }

    // Record the transaction with idempotency
    const { data, error } = await supabase.rpc('record_partner_transaction', {
      p_partner_id: partnerId,
      p_tenant_id: tenantId,
      p_transaction_id: crypto.randomUUID(),
      p_order_id: null, // Module purchase, not order
      p_gross_amount: amount,
      p_payment_method: paymentMethod,
      p_external_payment_id: payment.id,
      p_settlement_mode: 'invoice', // Default to invoice settlement
    });

    if (error) {
      logStep("Error recording partner transaction", { error: error.message });
    } else {
      logStep("Partner transaction recorded", data);
    }
  } catch (e) {
    logStep("Exception in recordPartnerTransactionFees", { error: String(e) });
  }
}

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
    moduleName: moduleData?.name,
    moduleSlug: moduleData?.slug
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

  // 2. Check if this is a quota-based module (like multi_store)
  const quotaBasedModules = ['multi_store'];
  const isQuotaBased = moduleData?.slug && quotaBasedModules.includes(moduleData.slug);

  if (isQuotaBased) {
    // For quota-based modules, check if subscription already exists
    const { data: existingSub, error: existingError } = await supabase
      .from('tenant_addon_subscriptions')
      .select('id, quota')
      .eq('tenant_id', tenant_id)
      .eq('addon_module_id', addon_module_id)
      .in('status', ['active', 'trial'])
      .maybeSingle();

    if (existingSub) {
      // Increment quota by 1
      const newQuota = (existingSub.quota || 1) + 1;
      const { error: updateError } = await supabase
        .from('tenant_addon_subscriptions')
        .update({
          quota: newQuota,
          price_paid: (existingSub.price_paid || 0) + (payment.value || moduleData?.monthly_price || 0),
          next_billing_date: nextBillingDate.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', existingSub.id);

      if (updateError) {
        logStep("Failed to increment quota", { error: updateError.message });
        throw new Error("Failed to increment module quota");
      }

      logStep("Quota incremented for module", { 
        tenantId: tenant_id, 
        moduleSlug: moduleData.slug,
        oldQuota: existingSub.quota || 1,
        newQuota
      });
      return;
    }
    // If no existing subscription, fall through to create new one with quota=1
  }

  // 3. Create or update tenant_addon_subscriptions (activate the module)
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
      billing_mode: 'separate',
      quota: isQuotaBased ? 1 : 1 // Default quota is 1
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
    moduleSlug: moduleData?.slug,
    pricePaid: payment.value,
    nextBilling: nextBillingDate.toISOString(),
    isQuotaBased
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

  // Record partner transaction fees if applicable
  await recordPartnerTransactionFees(supabase, profile.tenant_id, payment);

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

  // Record partner transaction fees if applicable
  await recordPartnerTransactionFees(supabase, tenantId, payment);

  logStep("Module activated successfully (legacy)", { 
    tenantId, 
    moduleId,
    moduleName: moduleData.name,
    pricePaid: payment.value
  });
}

// NEW: Process partner tenant subscription payment
async function processPartnerTenantPayment(
  supabase: any,
  paymentId: string,
  payment: any
) {
  logStep("Checking for partner invoice", { paymentId });

  // Try to find partner invoice by gateway_payment_id
  const { data: invoice, error: invoiceError } = await supabase
    .from('partner_invoices')
    .select(`
      id,
      tenant_subscription_id,
      tenant_id,
      partner_id,
      partner_plan_id,
      amount,
      status
    `)
    .eq('gateway_payment_id', paymentId)
    .eq('status', 'pending')
    .maybeSingle();

  if (invoiceError) {
    logStep("Invoice lookup error", { error: invoiceError.message });
    return false;
  }

  if (!invoice) {
    logStep("No partner invoice found for this payment");
    return false;
  }

  logStep("Partner invoice found", { 
    invoiceId: invoice.id,
    tenantId: invoice.tenant_id,
    subscriptionId: invoice.tenant_subscription_id
  });

  // Process payment using the RPC function
  const { data: result, error: rpcError } = await supabase
    .rpc('process_partner_invoice_payment', {
      p_invoice_id: invoice.id,
      p_payment_provider: 'asaas',
      p_gateway_payment_id: paymentId,
      p_billing_type: payment.billingType
    });

  if (rpcError) {
    logStep("Failed to process partner invoice", { error: rpcError.message });
    throw new Error("Failed to process partner invoice payment");
  }

  // Record partner transaction fees (partner earns from tenant payment)
  const paymentMethod = getPaymentMethodFromAsaas(payment.billingType);
  const amount = invoice.amount || payment.value || 0;

  if (amount > 0 && invoice.partner_id) {
    const { data: feeResult, error: feeError } = await supabase.rpc('record_partner_transaction', {
      p_partner_id: invoice.partner_id,
      p_tenant_id: invoice.tenant_id,
      p_transaction_id: crypto.randomUUID(),
      p_order_id: null,
      p_gross_amount: amount,
      p_payment_method: paymentMethod,
      p_external_payment_id: paymentId,
      p_settlement_mode: 'invoice',
    });

    if (feeError) {
      logStep("Error recording partner transaction for invoice", { error: feeError.message });
    } else {
      logStep("Partner transaction recorded for invoice", feeResult);
    }
  }

  logStep("Partner invoice processed successfully", result);
  return true;
}

// NEW: Process partner tenant subscription via externalReference
async function processPartnerTenantSubscriptionLegacy(
  supabase: any,
  metadata: { subscription_id_prefix: string; tenant_id_prefix: string },
  payment: any
) {
  logStep("Processing partner tenant subscription (legacy)", metadata);

  // Find subscription by prefix
  const { data: subscriptions, error: subError } = await supabase
    .from('tenant_subscriptions')
    .select('id, tenant_id, partner_plan_id')
    .like('id', `${metadata.subscription_id_prefix}%`)
    .limit(1);

  if (subError || !subscriptions?.length) {
    logStep("Subscription not found by prefix", { prefix: metadata.subscription_id_prefix });
    throw new Error("Subscription not found");
  }

  const subscription = subscriptions[0];

  // Activate subscription
  const { data: result, error: rpcError } = await supabase
    .rpc('activate_partner_tenant_subscription', {
      p_tenant_subscription_id: subscription.id,
      p_payment_provider: 'asaas',
      p_gateway_payment_id: payment.id
    });

  if (rpcError) {
    logStep("Failed to activate partner subscription", { error: rpcError.message });
    throw new Error("Failed to activate partner subscription");
  }

  logStep("Partner tenant subscription activated", result);
}
