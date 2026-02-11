import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
      return await handleWebhook(supabase, body);
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
// RESOLVE CONFIG - get available PIX options for a tenant
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

  // Generate TXID
  const txid = `pxr_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  // Get tenant PSP account for API credentials
  const { data: tenantAccount } = await supabase
    .from('tenant_psp_accounts')
    .select('*')
    .eq('tenant_id', tenant_id)
    .eq('psp_provider_id', psp_provider_id)
    .eq('is_enabled', true)
    .single();

  let qrCode = null;
  let qrCodeUrl = null;
  let pixKey = null;
  let expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30min default

  // If we have real PSP credentials, call the API
  // For now, generate a simulated QR code for development
  if (psp.name === 'openpix' && tenantAccount?.api_key_encrypted) {
    // Real OpenPix integration would go here
    logStep("Would call OpenPix API", { txid });
  } else if (psp.name === 'woovi' && tenantAccount?.api_key_encrypted) {
    logStep("Would call Woovi API", { txid });
  } else if (psp.name === 'celcoin' && tenantAccount?.api_key_encrypted) {
    logStep("Would call Celcoin API", { txid });
  }

  // For development/simulation: generate a fake PIX payload
  qrCode = `00020126580014br.gov.bcb.pix0136${txid}5204000053039865802BR5925FOODHUB PIX RAPIDO6009SAO PAULO62070503***6304`;
  qrCodeUrl = null; // Real PSPs return an image URL

  // Insert transaction record
  const { data: txRecord, error: txError } = await supabase
    .from('pix_transactions')
    .insert({
      tenant_id,
      order_id: order_id || null,
      psp_provider_id,
      txid,
      amount,
      psp_fee: 0, // PSP fee is handled by the PSP
      platform_fee: platformFee,
      net_amount: amount - platformFee,
      pricing_plan_id: pspConfig?.pricing_plan_id || null,
      qr_code: qrCode,
      qr_code_url: qrCodeUrl,
      pix_key: pixKey,
      status: 'pending',
      expires_at: expiresAt,
      metadata: {
        description: description || `PIX Rápido - ${txid}`,
        created_by: userId,
        psp_name: psp.name,
        fee_details: { percentRate, fixedRate, minFee, maxFee, calculatedFee: platformFee },
      },
    })
    .select()
    .single();

  if (txError) {
    logStep("Insert error", txError);
    return errorResponse(500, "DB_ERROR", "Erro ao registrar transação PIX");
  }

  logStep("PIX charge created", { txid, platformFee, amount });

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
// WEBHOOK - receive payment confirmation from PSP
// ============================================================
async function handleWebhook(supabase: any, body: any) {
  const { psp_name, txid, e2e_id, payload } = body;

  logStep("Webhook received", { psp_name, txid });

  if (!txid) {
    return errorResponse(400, "MISSING_TXID", "txid obrigatório no webhook");
  }

  // Find the transaction
  const { data: tx, error } = await supabase
    .from('pix_transactions')
    .select('*')
    .eq('txid', txid)
    .single();

  if (error || !tx) {
    logStep("Transaction not found for webhook", { txid });
    return errorResponse(404, "TX_NOT_FOUND", "Transação não encontrada");
  }

  if (tx.status === 'paid') {
    logStep("Transaction already paid", { txid });
    return successResponse({ message: "Transação já confirmada" });
  }

  // Update transaction
  const { error: updateError } = await supabase
    .from('pix_transactions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      e2e_id: e2e_id || null,
      webhook_received_at: new Date().toISOString(),
      webhook_payload: payload || {},
    })
    .eq('id', tx.id);

  if (updateError) {
    logStep("Error updating transaction", updateError);
    return errorResponse(500, "UPDATE_ERROR", "Erro ao atualizar transação");
  }

  // Register platform fee in ledger if there's an order
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

  logStep("Webhook processed successfully", { txid, e2e_id });
  return successResponse({ message: "Pagamento confirmado" });
}
