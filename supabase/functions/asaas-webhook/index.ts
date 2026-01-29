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

    // Parse metadata from externalReference
    let metadata;
    try {
      metadata = JSON.parse(payment.externalReference);
    } catch (e) {
      logStep("Failed to parse externalReference", { externalReference: payment.externalReference });
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "invalid_external_reference" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Metadata parsed", metadata);

    if (metadata.type === 'plan') {
      // Activate subscription plan
      await activatePlanSubscription(supabase, metadata, payment);
    } else if (metadata.type === 'module') {
      // Activate addon module
      await activateModuleSubscription(supabase, metadata, payment);
    } else {
      logStep("Unknown metadata type", { type: metadata.type });
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

  // Calculate subscription period
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Update tenant with new subscription
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      subscription_plan_id: metadata.plan_id,
      subscription_current_period_start: now.toISOString(),
      subscription_current_period_end: periodEnd.toISOString(),
      asaas_payment_id: payment.id,
      asaas_customer_id: payment.customer
    })
    .eq('id', profile.tenant_id);

  if (updateError) {
    logStep("Failed to update tenant", { error: updateError.message });
    throw new Error("Failed to activate subscription");
  }

  logStep("Plan activated successfully", { 
    tenantId: profile.tenant_id, 
    planId: metadata.plan_id,
    planName: plan.name 
  });
}

async function activateModuleSubscription(
  supabase: any,
  metadata: { module_id: string; tenant_id: string },
  payment: any
) {
  logStep("Activating module subscription", { moduleId: metadata.module_id, tenantId: metadata.tenant_id });

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  // Create or update module subscription
  const { error: upsertError } = await supabase
    .from('tenant_addon_subscriptions')
    .upsert({
      tenant_id: metadata.tenant_id,
      addon_module_id: metadata.module_id,
      status: 'active',
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      asaas_payment_id: payment.id
    }, {
      onConflict: 'tenant_id,addon_module_id'
    });

  if (upsertError) {
    logStep("Failed to upsert module subscription", { error: upsertError.message });
    throw new Error("Failed to activate module");
  }

  logStep("Module activated successfully", { 
    tenantId: metadata.tenant_id, 
    moduleId: metadata.module_id 
  });
}
