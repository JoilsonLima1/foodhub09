import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Correlation ID for request tracing
let correlationId: string | null = null;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ASAAS-WEBHOOK] ${step}${detailsStr}`);
};

// Write to operational_logs table (additive observability)
const writeOperationalLog = async (
  supabase: any,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  metadata: Record<string, any> = {},
  partnerId?: string | null,
  tenantId?: string | null,
  providerPaymentId?: string | null,
  eventId?: string | null,
  durationMs?: number | null
) => {
  try {
    await supabase.rpc('write_operational_log', {
      p_scope: 'webhook',
      p_level: level,
      p_message: message,
      p_metadata: { ...metadata, correlation_id: correlationId },
      p_correlation_id: correlationId,
      p_partner_id: partnerId || null,
      p_tenant_id: tenantId || null,
      p_provider_payment_id: providerPaymentId || null,
      p_event_id: eventId || null,
      p_duration_ms: durationMs || null
    });
  } catch (e) {
    // Don't fail webhook processing if logging fails
    console.error('[ASAAS-WEBHOOK] Failed to write operational log:', e);
  }
};

// Write to financial_audit_log table
const writeFinancialAudit = async (
  supabase: any,
  action: string,
  entityType: string,
  entityId?: string | null,
  beforeState?: Record<string, any> | null,
  afterState?: Record<string, any> | null
) => {
  try {
    await supabase.rpc('write_financial_audit', {
      p_actor_type: 'webhook',
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_correlation_id: correlationId,
      p_before_state: beforeState || null,
      p_after_state: afterState || null
    });
  } catch (e) {
    console.error('[ASAAS-WEBHOOK] Failed to write audit log:', e);
  }
};

// ============================================================
// PAYMENT EVENT TYPES
// ============================================================
const PAYMENT_SUCCESS_EVENTS = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const PAYMENT_REVERSAL_EVENTS = [
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'PAYMENT_DELETED',
];
const PAYMENT_STATUS_EVENTS = ['PAYMENT_OVERDUE', 'PAYMENT_CREATED'];

// All events that should be recorded in the SSOT ledger
const ALL_LEDGER_EVENTS = [
  ...PAYMENT_SUCCESS_EVENTS,
  ...PAYMENT_REVERSAL_EVENTS,
  ...PAYMENT_STATUS_EVENTS,
];

function getPaymentMethodFromAsaas(billingType: string | undefined): string {
  switch (billingType) {
    case 'PIX': return 'pix';
    case 'CREDIT_CARD': return 'credit_card';
    case 'BOLETO': return 'boleto';
    case 'UNDEFINED': return 'multiple';
    default: return billingType?.toLowerCase() || 'unknown';
  }
}

// ============================================================
// MAIN HANDLER - SSOT LEDGER PIPELINE
// ============================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  // Generate correlation ID for request tracing
  correlationId = `asaas-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  let supabase: any = null;
  let paymentId: string | null = null;
  let tenantId: string | null = null;
  let partnerId: string | null = null;

  try {
    logStep("Webhook received", { method: req.method, correlationId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const event = body.event;
    const payment = body.payment;
    paymentId = payment?.id;

    logStep("Event received", { event, paymentId });

    // ============================================================
    // PHASE 7: Rate limiting (additive security layer)
    // ============================================================
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimitKey = `webhook:asaas:${clientIP}`;
    
    const { data: rateLimitResult } = await supabase.rpc('check_rate_limit', {
      p_key: rateLimitKey,
      p_max_requests: 100, // 100 requests per window
      p_window_seconds: 60 // 1 minute window
    });
    
    if (rateLimitResult && !rateLimitResult.allowed) {
      await writeOperationalLog(supabase, 'warn', 'Rate limit exceeded for webhook', 
        { ip: clientIP, event, rateLimitResult }, partnerId, tenantId, paymentId);
      
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "rate_limited" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // Log webhook reception
    await writeOperationalLog(supabase, 'info', 'Webhook received', 
      { event, ip: clientIP }, null, null, paymentId);

    // Validate we have required data
    if (!paymentId || !event) {
      logStep("Missing paymentId or event, skipping");
      await writeOperationalLog(supabase, 'warn', 'Webhook missing required data', 
        { hasPaymentId: !!paymentId, hasEvent: !!event });
      
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "missing_data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is a ledger event
    if (!ALL_LEDGER_EVENTS.includes(event)) {
      logStep("Event not tracked in ledger", { event });
      await writeOperationalLog(supabase, 'debug', 'Event not tracked in ledger', 
        { event }, null, null, paymentId);
      
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "event_not_tracked" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // STEP 1: Resolve payment context (tenant_id, partner_id)
    // ============================================================
    const { data: contextData, error: contextError } = await supabase
      .rpc('resolve_payment_context', { p_provider_payment_id: paymentId });

    if (contextError) {
      logStep("Error resolving payment context", { error: contextError.message });
      await writeOperationalLog(supabase, 'error', 'Failed to resolve payment context', 
        { error: contextError.message }, null, null, paymentId);
    }

    tenantId = contextData?.tenant_id || null;
    partnerId = contextData?.partner_id || null;
    const contextSource = contextData?.source || 'unknown';

    logStep("Payment context resolved", { tenantId, partnerId, contextSource });

    // ============================================================
    // STEP 2: Generate unique event ID for idempotency
    // ============================================================
    const eventTimestamp = payment.dateCreated || new Date().toISOString();
    const providerEventId = `${paymentId}:${event}:${eventTimestamp}`;

    // ============================================================
    // STEP 3: Insert into payment_events and apply via RPC
    // ============================================================
    const { data: insertResult, error: insertError } = await supabase
      .rpc('insert_payment_event', {
        p_provider: 'asaas',
        p_provider_event_id: providerEventId,
        p_provider_payment_id: paymentId,
        p_event_type: event,
        p_tenant_id: tenantId,
        p_partner_id: partnerId,
        p_amount_gross: payment.value || 0,
        p_payment_method: getPaymentMethodFromAsaas(payment.billingType),
        p_occurred_at: payment.confirmedDate || payment.paymentDate || new Date().toISOString(),
        p_payload: { payment, originalEvent: event, webhookReceivedAt: new Date().toISOString() }
      });

    if (insertError) {
      logStep("Error inserting payment event", { error: insertError.message });
      
      await writeOperationalLog(supabase, 'error', 'Failed to insert payment event', 
        { error: insertError.message, event }, partnerId, tenantId, paymentId);
      
      // Write audit log for failed event
      await writeFinancialAudit(supabase, 'EVENT_INSERT_FAILED', 'payment_events', 
        providerEventId, null, { error: insertError.message, event, paymentId });
      
      return new Response(
        JSON.stringify({ received: true, processed: false, error: insertError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Payment event processed via SSOT", insertResult);
    
    // Write audit log for successful event
    await writeFinancialAudit(supabase, 
      insertResult?.is_new ? 'EVENT_INSERTED' : 'EVENT_DUPLICATE',
      'payment_events', 
      insertResult?.event_id, 
      null, 
      { event, paymentId, is_new: insertResult?.is_new, apply_result: insertResult?.apply_result }
    );

    // ============================================================
    // STEP 4: Handle legacy module/subscription activation
    // ============================================================
    if (PAYMENT_SUCCESS_EVENTS.includes(event)) {
      await handleLegacyActivations(supabase, paymentId, payment);
    }

    // ============================================================
    // STEP 5: Handle legacy reversals for module purchases
    // ============================================================
    if (PAYMENT_REVERSAL_EVENTS.includes(event)) {
      await handleLegacyReversals(supabase, paymentId, event);
    }

    const duration = Date.now() - startTime;
    
    // Log successful completion
    await writeOperationalLog(supabase, 'info', 'Webhook processed successfully', 
      { event, is_new: insertResult?.is_new, apply_result: insertResult?.apply_result },
      partnerId, tenantId, paymentId, insertResult?.event_id, duration);

    return new Response(
      JSON.stringify({
        received: true,
        processed: true,
        event_id: insertResult?.event_id,
        is_new: insertResult?.is_new,
        apply_result: insertResult?.apply_result,
        correlation_id: correlationId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Webhook processing failed";
    const duration = Date.now() - startTime;
    logStep("ERROR", { message: errorMessage });
    
    // Log error to operational_logs
    if (supabase) {
      await writeOperationalLog(supabase, 'error', 'Webhook processing failed', 
        { error: errorMessage, stack: error instanceof Error ? error.stack : undefined },
        partnerId, tenantId, paymentId, null, duration);
    }
    
    // Return 200 to prevent Asaas from retrying
    return new Response(
      JSON.stringify({ received: true, processed: false, error: errorMessage, correlation_id: correlationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

// ============================================================
// LEGACY: Handle module and subscription activations
// ============================================================
async function handleLegacyActivations(supabase: any, paymentId: string, payment: any) {
  try {
    // 1. Try module_purchases
    const { data: modulePurchase } = await supabase
      .from('module_purchases')
      .select('id, tenant_id, addon_module_id, addon_modules:addon_module_id (id, name, slug, monthly_price)')
      .eq('gateway_payment_id', paymentId)
      .eq('status', 'pending')
      .maybeSingle();

    if (modulePurchase) {
      logStep("Activating module from purchase", { purchaseId: modulePurchase.id });
      await activateModuleFromPurchase(supabase, modulePurchase, payment);
      return;
    }

    // 2. Try partner invoice
    const { data: invoice } = await supabase
      .from('partner_invoices')
      .select('id, tenant_subscription_id, tenant_id, partner_id, partner_plan_id, amount, status')
      .eq('gateway_payment_id', paymentId)
      .eq('status', 'pending')
      .maybeSingle();

    if (invoice) {
      logStep("Processing partner invoice", { invoiceId: invoice.id });
      await processPartnerInvoice(supabase, invoice, paymentId, payment);
      return;
    }

    // 3. Try legacy externalReference parsing
    if (payment?.externalReference) {
      await handleLegacyExternalReference(supabase, payment);
    }
  } catch (e) {
    logStep("Legacy activation error", { error: String(e) });
  }
}

// ============================================================
// LEGACY: Handle reversals for module purchases and invoices
// ============================================================
async function handleLegacyReversals(supabase: any, paymentId: string, event: string) {
  try {
    const reason = `Asaas event: ${event}`;

    // Update module purchases
    await supabase
      .from('module_purchases')
      .update({ status: 'refunded', notes: reason })
      .eq('gateway_payment_id', paymentId);

    // Update partner invoices
    await supabase
      .from('partner_invoices')
      .update({ status: 'canceled', canceled_at: new Date().toISOString(), notes: reason })
      .eq('gateway_payment_id', paymentId);

    logStep("Legacy reversals processed", { paymentId, event });
  } catch (e) {
    logStep("Legacy reversal error", { error: String(e) });
  }
}

// ============================================================
// MODULE ACTIVATION
// ============================================================
async function activateModuleFromPurchase(supabase: any, purchase: any, payment: any) {
  const { tenant_id, addon_module_id, id: purchaseId } = purchase;
  const moduleData = purchase.addon_modules;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);
  const nextBillingDate = new Date(now);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  // Update module_purchases to PAID
  await supabase
    .from('module_purchases')
    .update({
      status: 'paid',
      billing_type: payment.billingType,
      invoice_number: payment.invoiceNumber || null,
      paid_at: now.toISOString()
    })
    .eq('id', purchaseId);

  // Check if quota-based module
  const quotaBasedModules = ['multi_store'];
  const isQuotaBased = moduleData?.slug && quotaBasedModules.includes(moduleData.slug);

  if (isQuotaBased) {
    const { data: existingSub } = await supabase
      .from('tenant_addon_subscriptions')
      .select('id, quota')
      .eq('tenant_id', tenant_id)
      .eq('addon_module_id', addon_module_id)
      .in('status', ['active', 'trial'])
      .maybeSingle();

    if (existingSub) {
      const newQuota = (existingSub.quota || 1) + 1;
      await supabase
        .from('tenant_addon_subscriptions')
        .update({
          quota: newQuota,
          price_paid: (existingSub.price_paid || 0) + (payment.value || moduleData?.monthly_price || 0),
          next_billing_date: nextBillingDate.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', existingSub.id);

      logStep("Quota incremented", { tenantId: tenant_id, newQuota });
      return;
    }
  }

  // Create or update subscription
  await supabase
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
      quota: 1
    }, { onConflict: 'tenant_id,addon_module_id' });

  logStep("Module activated", { tenantId: tenant_id, moduleId: addon_module_id });
}

// ============================================================
// PARTNER INVOICE PROCESSING
// ============================================================
async function processPartnerInvoice(supabase: any, invoice: any, paymentId: string, payment: any) {
  const { data: result, error } = await supabase
    .rpc('process_partner_invoice_payment', {
      p_invoice_id: invoice.id,
      p_payment_provider: 'asaas',
      p_gateway_payment_id: paymentId,
      p_billing_type: payment.billingType
    });

  if (error) {
    logStep("Partner invoice processing error", { error: error.message });
    return;
  }

  logStep("Partner invoice processed", result);
}

// ============================================================
// LEGACY EXTERNAL REFERENCE HANDLING
// ============================================================
type ParsedRef =
  | { type: 'plan'; plan_id: string; user_id: string }
  | { type: 'module'; module_id_prefix: string; tenant_id_prefix: string }
  | { type: 'partner_tenant'; subscription_id_prefix: string; tenant_id_prefix: string };

function parseExternalReference(ref: string): ParsedRef | null {
  try {
    const json = JSON.parse(ref);
    if (json.t === 'mod' && json.m && json.tn) {
      return { type: 'module', module_id_prefix: json.m, tenant_id_prefix: json.tn };
    }
    if (json.t === 'plan' && json.p && json.u) {
      return { type: 'plan', plan_id: json.p, user_id: json.u };
    }
  } catch { /* not JSON */ }

  if (ref.startsWith('mod:')) {
    const parts = ref.split(':');
    if (parts.length >= 3) {
      return { type: 'module', module_id_prefix: parts[1], tenant_id_prefix: parts[2] };
    }
  }

  if (ref.startsWith('pts:')) {
    const parts = ref.split('|').map((p) => p.trim()).filter(Boolean);
    const map: Record<string, string> = {};
    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      map[part.slice(0, idx)] = part.slice(idx + 1);
    }
    if (map.pts && map.t) {
      return { type: 'partner_tenant', subscription_id_prefix: map.pts, tenant_id_prefix: map.t };
    }
  }

  const parts = ref.split('|').map((p) => p.trim()).filter(Boolean);
  const map: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    map[part.slice(0, idx)] = part.slice(idx + 1);
  }

  if (map.p && map.u) {
    return { type: 'plan', plan_id: map.p, user_id: map.u };
  }
  if (map.m && map.t) {
    return { type: 'module', module_id_prefix: map.m, tenant_id_prefix: map.t };
  }
  return null;
}

async function handleLegacyExternalReference(supabase: any, payment: any) {
  const metadata = parseExternalReference(String(payment.externalReference));
  if (!metadata) return;

  logStep("Legacy externalReference parsed", metadata);

  if (metadata.type === 'plan') {
    await activatePlanSubscriptionLegacy(supabase, metadata, payment);
  } else if (metadata.type === 'module') {
    await activateModuleSubscriptionLegacy(supabase, metadata, payment);
  } else if (metadata.type === 'partner_tenant') {
    await activatePartnerTenantSubscriptionLegacy(supabase, metadata, payment);
  }
}

async function activatePlanSubscriptionLegacy(supabase: any, metadata: { plan_id: string; user_id: string }, payment: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', metadata.user_id)
    .single();

  if (!profile?.tenant_id) return;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      subscription_plan_id: metadata.plan_id,
      subscription_current_period_start: now.toISOString(),
      subscription_current_period_end: periodEnd.toISOString(),
      asaas_customer_id: payment.customer,
      asaas_payment_id: payment.id,
      last_payment_at: now.toISOString(),
      last_payment_method: getPaymentMethodFromAsaas(payment.billingType),
      last_payment_provider: 'asaas',
      last_payment_status: 'confirmed'
    })
    .eq('id', profile.tenant_id);

  logStep("Plan subscription activated (legacy)", { tenantId: profile.tenant_id });
}

async function activateModuleSubscriptionLegacy(supabase: any, metadata: { module_id_prefix: string; tenant_id_prefix: string }, payment: any) {
  const { data: modules } = await supabase
    .from('addon_modules')
    .select('id, name')
    .like('id', `${metadata.module_id_prefix}%`)
    .limit(1);

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id')
    .like('id', `${metadata.tenant_id_prefix}%`)
    .limit(1);

  if (!modules?.length || !tenants?.length) return;

  const moduleId = modules[0].id;
  const tenantId = tenants[0].id;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);

  await supabase
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
      next_billing_date: expiresAt.toISOString(),
      asaas_payment_id: payment.id,
      billing_mode: 'separate'
    }, { onConflict: 'tenant_id,addon_module_id' });

  logStep("Module activated (legacy)", { tenantId, moduleId });
}

async function activatePartnerTenantSubscriptionLegacy(supabase: any, metadata: { subscription_id_prefix: string; tenant_id_prefix: string }, payment: any) {
  const { data: subscriptions } = await supabase
    .from('tenant_subscriptions')
    .select('id')
    .like('id', `${metadata.subscription_id_prefix}%`)
    .limit(1);

  if (!subscriptions?.length) return;

  const { data: result } = await supabase
    .rpc('activate_partner_tenant_subscription', {
      p_tenant_subscription_id: subscriptions[0].id,
      p_payment_provider: 'asaas',
      p_gateway_payment_id: payment.id
    });

  logStep("Partner tenant subscription activated (legacy)", result);
}

function getPaymentMethodFromAsaas(billingType: string | undefined): string {
  switch (billingType) {
    case 'PIX': return 'pix';
    case 'CREDIT_CARD': return 'credit_card';
    case 'BOLETO': return 'boleto';
    case 'UNDEFINED': return 'multiple';
    default: return billingType?.toLowerCase() || 'unknown';
  }
}
