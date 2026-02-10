import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-stone-signature, x-webhook-secret",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STONE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received", { method: req.method });

    const body = await req.json();
    logStep("Payload parsed", { event_type: body.event_type || body.type, id: body.id });

    const eventType = body.event_type || body.type || "UNKNOWN";
    const providerEventId = body.id || body.event_id || crypto.randomUUID();
    const idempotencyKey = `stone_${providerEventId}_${eventType}`;

    // Check idempotency
    const { data: existing } = await supabase
      .from("payment_provider_events")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      logStep("Duplicate event, skipping", { idempotencyKey });
      return new Response(JSON.stringify({ status: "duplicate", id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine tenant from payload (Stone sends merchant/store info)
    const tenantIdentifier = body.merchant_id || body.store_id || body.account_id || null;
    let tenantId: string | null = null;
    let providerAccountId: string | null = null;

    if (tenantIdentifier) {
      // Try to find provider account by credentials
      const { data: account } = await supabase
        .from("payment_provider_accounts")
        .select("id, scope_id, scope_type")
        .eq("provider", "stone")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (account) {
        providerAccountId = account.id;
        if (account.scope_type === "tenant") {
          tenantId = account.scope_id;
        }
      }
    }

    // Insert event
    const { data: event, error: insertError } = await supabase
      .from("payment_provider_events")
      .insert({
        tenant_id: tenantId,
        provider_account_id: providerAccountId,
        event_type: eventType,
        provider_event_id: providerEventId,
        idempotency_key: idempotencyKey,
        payload: body,
        process_status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      logStep("Error inserting event", { error: insertError.message });
      throw new Error(`Failed to insert event: ${insertError.message}`);
    }

    logStep("Event stored", { eventId: event.id });

    // Process event: map Stone status to internal status
    const statusMap: Record<string, string> = {
      PAYMENT_CREATED: "pending",
      PAYMENT_CONFIRMED: "paid",
      PAYMENT_CANCELED: "canceled",
      PAYMENT_REFUNDED: "refunded",
      CHARGEBACK_CREATED: "chargeback",
      PAYMENT_FAILED: "failed",
    };

    const internalStatus = statusMap[eventType];
    const providerReference = body.payment_id || body.transaction_id || body.charge_id;

    if (internalStatus && providerReference) {
      // Update or create transaction
      const { error: txError } = await supabase
        .from("payment_provider_transactions")
        .upsert({
          tenant_id: tenantId,
          provider_account_id: providerAccountId || "00000000-0000-0000-0000-000000000000",
          provider_reference: providerReference,
          amount: body.amount || body.value || 0,
          currency: body.currency || "BRL",
          status: internalStatus,
          method: body.payment_method || body.method || null,
          raw_provider_payload: body,
          idempotency_key: `tx_${providerReference}_${eventType}`,
        }, {
          onConflict: "idempotency_key",
        });

      if (txError) {
        logStep("Error upserting transaction", { error: txError.message });
        // Update event status to retry
        await supabase
          .from("payment_provider_events")
          .update({ process_status: "retry", error_message: txError.message })
          .eq("id", event.id);
      } else {
        logStep("Transaction updated", { providerReference, status: internalStatus });
        // Mark event as processed
        await supabase
          .from("payment_provider_events")
          .update({ process_status: "ok", processed_at: new Date().toISOString() })
          .eq("id", event.id);
      }
    } else {
      // Mark as ok even if no transaction update needed
      await supabase
        .from("payment_provider_events")
        .update({ process_status: "ok", processed_at: new Date().toISOString() })
        .eq("id", event.id);
    }

    return new Response(JSON.stringify({ status: "ok", event_id: event.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
