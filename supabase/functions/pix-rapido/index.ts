import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PIX-RAPIDO] ${step}${detailsStr}`);
};

function errorResponse(statusCode: number, errorCode: string, message: string) {
  return new Response(
    JSON.stringify({ error: message, error_code: errorCode, success: false }),
    { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function successResponse(data: any) {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================
// WOOVI API HELPERS
// ============================================================
const WOOVI_API_BASE = "https://api.openpix.com.br/api/openpix/v1";

async function wooviCreateCharge(apiKey: string, params: {
  correlationID: string;
  value: number; // cents
  comment?: string;
  expiresIn?: number; // seconds
}) {
  const response = await fetch(`${WOOVI_API_BASE}/charge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
    },
    body: JSON.stringify({
      correlationID: params.correlationID,
      value: params.value,
      comment: params.comment || "PIX Rápido",
      expiresIn: params.expiresIn || 1800, // 30 min default
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    logStep("Woovi API error", { status: response.status, body: data });
    throw new Error(data?.error || `Woovi API error: ${response.status}`);
  }
  return data;
}

async function wooviGetCharge(apiKey: string, correlationID: string) {
  const response = await fetch(`${WOOVI_API_BASE}/charge/${correlationID}`, {
    method: "GET",
    headers: {
      "Authorization": apiKey,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Woovi status error: ${response.status}`);
  }
  return data;
}

function verifyWooviWebhook(payload: string, signature: string, webhookSecret: string): boolean {
  try {
    const hmac = createHmac("sha256", webhookSecret);
    hmac.update(payload);
    const expected = hmac.toString();
    return expected === signature;
  } catch {
    return false;
  }
}

async function testWooviConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${WOOVI_API_BASE}/charge?skip=0&limit=1`, {
      method: "GET",
      headers: { "Authorization": apiKey },
    });
    if (response.ok) return { ok: true };
    const data = await response.json();
    return { ok: false, error: data?.error || `HTTP ${response.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = await req.json();
    const { action } = body;

    // Webhook doesn't need auth
    if (action === "webhook") {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      return await handleWebhook(supabase, body, req);
    }

    // Test connection (super admin only, but also tenant)
    if (action === "test-connection") {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      return await handleTestConnection(supabase, body);
    }

    // All other actions need auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "UNAUTHORIZED", "Não autorizado");
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authUser) {
      return errorResponse(401, "UNAUTHORIZED", "Não autorizado");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "create") {
      return await handleCreate(supabase, body, authUser.id);
    } else if (action === "status") {
      return await handleStatus(supabase, body);
    } else if (action === "resolve-config") {
      return await handleResolveConfig(supabase, body);
    }

    return errorResponse(400, "INVALID_ACTION", "Ação inválida");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    logStep("ERROR", { message: msg });
    return errorResponse(500, "INTERNAL_ERROR", msg);
  }
});

// ============================================================
// RESOLVE CONFIG
// ============================================================
async function handleResolveConfig(supabase: any, body: any) {
  const { tenant_id } = body;
  if (!tenant_id) return errorResponse(400, "MISSING_TENANT", "tenant_id obrigatório");

  const { data, error } = await supabase.rpc('resolve_pix_config', { p_tenant_id: tenant_id });
  if (error) {
    logStep("resolve_pix_config error", error);
    return errorResponse(500, "RESOLVE_ERROR", "Erro ao resolver configuração PIX");
  }

  return successResponse({ options: data || [] });
}

// ============================================================
// TEST CONNECTION
// ============================================================
async function handleTestConnection(supabase: any, body: any) {
  const { api_key, psp_name } = body;
  if (!api_key) return errorResponse(400, "MISSING_KEY", "api_key obrigatório");

  if (psp_name === "woovi" || psp_name === "openpix") {
    const result = await testWooviConnection(api_key);
    return successResponse({ connected: result.ok, error: result.error });
  }

  return errorResponse(400, "UNSUPPORTED_PSP", "PSP não suportado para teste");
}

// ============================================================
// CREATE PIX CHARGE
// ============================================================
async function handleCreate(supabase: any, body: any, userId: string) {
  const { tenant_id, order_id, amount, psp_provider_id, description } = body;

  if (!tenant_id || !amount || !psp_provider_id) {
    return errorResponse(400, "MISSING_FIELDS", "tenant_id, amount e psp_provider_id são obrigatórios");
  }

  logStep("Creating PIX charge", { tenant_id, amount, psp_provider_id });

  // Get PSP provider info
  const { data: psp } = await supabase
    .from('pix_psp_providers')
    .select('*')
    .eq('id', psp_provider_id)
    .eq('is_active', true)
    .single();

  if (!psp) {
    return errorResponse(404, "PSP_NOT_FOUND", "PSP não encontrado ou inativo");
  }

  // Resolve pricing for this tenant
  const { data: configs } = await supabase.rpc('resolve_pix_config', { p_tenant_id: tenant_id });
  const pspConfig = (configs || []).find((c: any) => c.psp_provider_id === psp_provider_id);

  // Calculate fees
  const percentRate = pspConfig?.percent_rate || psp.default_percent_fee;
  const fixedRate = pspConfig?.fixed_rate || psp.default_fixed_fee;
  const minFee = pspConfig?.min_fee || 0;
  const maxFee = pspConfig?.max_fee || null;

  let platformFee = amount * percentRate + fixedRate;
  platformFee = Math.max(platformFee, minFee);
  if (maxFee) platformFee = Math.min(platformFee, maxFee);
  platformFee = Math.round(platformFee * 100) / 100;

  // Generate correlation ID
  const correlationID = `pxr_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  // Resolve credentials for this tenant + PSP
  const { data: credResult } = await supabase.rpc('resolve_pix_credentials', {
    p_tenant_id: tenant_id,
    p_psp_provider_id: psp_provider_id,
  });

  const credentials = credResult || { source: 'none', api_key: null };

  let qrCode: string | null = null;
  let qrCodeUrl: string | null = null;
  let pspChargeId: string | null = null;
  let expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  let txid = correlationID;

  // Real Woovi/OpenPix integration
  if ((psp.name === 'woovi' || psp.name === 'openpix') && credentials.api_key) {
    try {
      logStep("Calling Woovi API", { correlationID, amount });
      const amountCents = Math.round(amount * 100);
      const wooviResult = await wooviCreateCharge(credentials.api_key, {
        correlationID,
        value: amountCents,
        comment: description || `PIX Rápido - Pedido`,
        expiresIn: 1800,
      });

      const charge = wooviResult.charge || wooviResult;
      qrCode = charge.brCode || charge.pixQrCode || null;
      qrCodeUrl = charge.qrCodeImage || null;
      pspChargeId = charge.identifier || charge.globalID || null;
      txid = charge.transactionID || charge.correlationID || correlationID;

      if (charge.expiresDate) {
        expiresAt = charge.expiresDate;
      }

      logStep("Woovi charge created", { txid, pspChargeId, hasQr: !!qrCode });
    } catch (wooviError) {
      const errMsg = wooviError instanceof Error ? wooviError.message : "Erro Woovi";
      logStep("Woovi API failed", { error: errMsg });
      return errorResponse(502, "PSP_ERROR", `Erro ao criar cobrança PIX: ${errMsg}`);
    }
  } else if (!credentials.api_key) {
    // No credentials configured - return simulation for development
    logStep("No credentials - using simulation", { psp: psp.name });
    qrCode = `00020126580014br.gov.bcb.pix0136${correlationID}5204000053039865802BR5925FOODHUB PIX RAPIDO6009SAO PAULO62070503***6304`;
    qrCodeUrl = null;
  }

  // Insert transaction record
  const { data: txRecord, error: txError } = await supabase
    .from('pix_transactions')
    .insert({
      tenant_id,
      order_id: order_id || null,
      psp_provider_id,
      txid,
      psp_charge_id: pspChargeId,
      psp_correlation_id: correlationID,
      amount,
      psp_fee: 0,
      platform_fee: platformFee,
      net_amount: amount - platformFee,
      pricing_plan_id: pspConfig?.pricing_plan_id || null,
      qr_code: qrCode,
      qr_code_url: qrCodeUrl,
      status: 'pending',
      expires_at: expiresAt,
      metadata: {
        description: description || `PIX Rápido - ${txid}`,
        created_by: userId,
        psp_name: psp.name,
        credential_source: credentials.source,
        fee_details: { percentRate, fixedRate, minFee, maxFee, calculatedFee: platformFee },
      },
    })
    .select()
    .single();

  if (txError) {
    logStep("Insert error", txError);
    return errorResponse(500, "DB_ERROR", "Erro ao registrar transação PIX");
  }

  logStep("PIX charge created", { txid, platformFee, amount, source: credentials.source });

  return successResponse({
    transaction_id: txRecord.id,
    txid,
    qr_code: qrCode,
    qr_code_url: qrCodeUrl,
    amount,
    platform_fee: platformFee,
    net_amount: amount - platformFee,
    expires_at: expiresAt,
    psp_name: psp.display_name,
    status: 'pending',
  });
}

// ============================================================
// STATUS CHECK
// ============================================================
async function handleStatus(supabase: any, body: any) {
  const { transaction_id, txid } = body;

  let query = supabase.from('pix_transactions').select('*');
  if (transaction_id) {
    query = query.eq('id', transaction_id);
  } else if (txid) {
    query = query.eq('txid', txid);
  } else {
    return errorResponse(400, "MISSING_ID", "transaction_id ou txid obrigatório");
  }

  const { data: tx, error } = await query.single();
  if (error || !tx) {
    return errorResponse(404, "TX_NOT_FOUND", "Transação não encontrada");
  }

  // If pending and we have credentials, try checking PSP status
  if (tx.status === 'pending' && tx.psp_correlation_id) {
    try {
      const { data: psp } = await supabase
        .from('pix_psp_providers')
        .select('name')
        .eq('id', tx.psp_provider_id)
        .single();

      if (psp && (psp.name === 'woovi' || psp.name === 'openpix')) {
        const { data: credResult } = await supabase.rpc('resolve_pix_credentials', {
          p_tenant_id: tx.tenant_id,
          p_psp_provider_id: tx.psp_provider_id,
        });

        if (credResult?.api_key) {
          const wooviData = await wooviGetCharge(credResult.api_key, tx.psp_correlation_id);
          const charge = wooviData.charge || wooviData;

          if (charge.status === 'COMPLETED') {
            // Update locally
            await supabase
              .from('pix_transactions')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                e2e_id: charge.payer?.e2eId || null,
              })
              .eq('id', tx.id);

            // Register ledger entry
            if (tx.order_id && tx.platform_fee > 0) {
              try {
                await supabase.from('ledger_entries').insert({
                  tenant_id: tx.tenant_id,
                  entry_type: 'platform_fee',
                  amount: tx.platform_fee,
                  currency: 'BRL',
                  reference_type: 'pix_transaction',
                  reference_id: tx.id,
                  description: `Taxa PIX Rápido - ${tx.txid}`,
                  metadata: { psp_provider_id: tx.psp_provider_id, order_id: tx.order_id },
                });
              } catch { /* non-critical */ }
            }

            // Update order
            if (tx.order_id) {
              await supabase
                .from('orders')
                .update({ status: 'paid', payment_status: 'approved' })
                .eq('id', tx.order_id);
            }

            return successResponse({
              transaction_id: tx.id,
              txid: tx.txid,
              status: 'paid',
              is_confirmed: true,
              paid_at: new Date().toISOString(),
              amount: tx.amount,
              platform_fee: tx.platform_fee,
            });
          }
        }
      }
    } catch (pollErr) {
      logStep("PSP poll error (non-critical)", { error: pollErr instanceof Error ? pollErr.message : pollErr });
    }
  }

  return successResponse({
    transaction_id: tx.id,
    txid: tx.txid,
    status: tx.status,
    is_confirmed: tx.status === 'paid',
    paid_at: tx.paid_at,
    amount: tx.amount,
    platform_fee: tx.platform_fee,
  });
}

// ============================================================
// WEBHOOK - receive payment confirmation from Woovi/OpenPix
// ============================================================
async function handleWebhook(supabase: any, body: any, req: Request) {
  const { psp_name, event, charge, pix: pixArray } = body;

  // Woovi sends: { event: "OPENPIX:CHARGE_COMPLETED", charge: {...} }
  const isWooviEvent = body.event === "OPENPIX:CHARGE_COMPLETED" || body.event === "OPENPIX:CHARGE_EXPIRED";
  const chargeData = body.charge || {};

  const correlationID = chargeData.correlationID || body.txid;
  logStep("Webhook received", { event: body.event, correlationID });

  if (!correlationID) {
    return errorResponse(400, "MISSING_TXID", "correlationID/txid obrigatório no webhook");
  }

  // Find the transaction by correlation ID or txid
  let tx = null;
  const { data: txByCorr } = await supabase
    .from('pix_transactions')
    .select('*')
    .eq('psp_correlation_id', correlationID)
    .maybeSingle();

  tx = txByCorr;

  if (!tx) {
    const { data: txByTxid } = await supabase
      .from('pix_transactions')
      .select('*')
      .eq('txid', correlationID)
      .maybeSingle();
    tx = txByTxid;
  }

  if (!tx) {
    logStep("Transaction not found for webhook", { correlationID });
    return errorResponse(404, "TX_NOT_FOUND", "Transação não encontrada");
  }

  // Validate webhook signature if we have a webhook secret
  const wooviSignature = req.headers.get("x-webhook-secret") || req.headers.get("x-openpix-signature");
  if (wooviSignature) {
    const { data: credResult } = await supabase.rpc('resolve_pix_credentials', {
      p_tenant_id: tx.tenant_id,
      p_psp_provider_id: tx.psp_provider_id,
    });
    if (credResult?.webhook_secret) {
      // Note: Woovi uses simple secret comparison, not HMAC
      if (wooviSignature !== credResult.webhook_secret) {
        logStep("Webhook signature mismatch", { correlationID });
        return errorResponse(401, "INVALID_SIGNATURE", "Assinatura do webhook inválida");
      }
    }
  }

  if (tx.status === 'paid') {
    logStep("Transaction already paid", { correlationID });
    return successResponse({ message: "Transação já confirmada" });
  }

  // Handle charge expired
  if (body.event === "OPENPIX:CHARGE_EXPIRED") {
    await supabase
      .from('pix_transactions')
      .update({
        status: 'expired',
        webhook_received_at: new Date().toISOString(),
        webhook_payload: body,
      })
      .eq('id', tx.id);
    logStep("Transaction expired via webhook", { correlationID });
    return successResponse({ message: "Transação expirada" });
  }

  // Handle charge completed
  const e2eId = pixArray?.[0]?.endToEndId || chargeData.payer?.e2eId || null;

  const { error: updateError } = await supabase
    .from('pix_transactions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      e2e_id: e2eId,
      webhook_received_at: new Date().toISOString(),
      webhook_payload: body,
    })
    .eq('id', tx.id);

  if (updateError) {
    logStep("Error updating transaction", updateError);
    return errorResponse(500, "UPDATE_ERROR", "Erro ao atualizar transação");
  }

  // Register platform fee in ledger
  if (tx.order_id && tx.platform_fee > 0) {
    try {
      await supabase.from('ledger_entries').insert({
        tenant_id: tx.tenant_id,
        entry_type: 'platform_fee',
        amount: tx.platform_fee,
        currency: 'BRL',
        reference_type: 'pix_transaction',
        reference_id: tx.id,
        description: `Taxa PIX Rápido - TXID ${tx.txid}`,
        metadata: {
          psp_provider_id: tx.psp_provider_id,
          order_id: tx.order_id,
          original_amount: tx.amount,
          fee_percent: tx.metadata?.fee_details?.percentRate,
        },
      });
      logStep("Ledger entry created for platform fee", { fee: tx.platform_fee });
    } catch (ledgerError) {
      logStep("Non-critical: ledger entry failed", ledgerError);
    }
  }

  // Update order status if linked
  if (tx.order_id) {
    await supabase
      .from('orders')
      .update({ status: 'paid', payment_status: 'approved' })
      .eq('id', tx.order_id);
    logStep("Order updated to paid", { orderId: tx.order_id });
  }

  // Update last_webhook_at on credentials
  try {
    await supabase
      .from('pix_platform_credentials')
      .update({ last_webhook_at: new Date().toISOString(), last_webhook_status: 'ok' })
      .eq('psp_provider_id', tx.psp_provider_id)
      .eq('is_active', true);
  } catch { /* non-critical */ }

  logStep("Webhook processed successfully", { correlationID, e2eId });
  return successResponse({ message: "Pagamento confirmado" });
}
