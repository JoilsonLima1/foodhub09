import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[POS-PAYMENT] ${step}${detailsStr}`);
};

// Standardized error response builder
function errorResponse(
  statusCode: number,
  errorCode: string,
  message: string,
  opts?: { suggestedManualMethod?: string }
) {
  return new Response(
    JSON.stringify({
      error: message,
      error_code: errorCode,
      message,
      fallback_allowed: true,
      should_switch_to_manual: true,
      suggested_manual_method: opts?.suggestedManualMethod || "cash",
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "UNAUTHORIZED", "Não autorizado");
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse(401, "UNAUTHORIZED", "Não autorizado");
    }

    const userId = claimsData.claims.sub;
    logStep("User authenticated", { userId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      return await handleCreate(supabase, body, userId);
    } else if (action === "status") {
      return await handleStatus(supabase, body);
    } else if (action === "cancel") {
      return await handleCancel(supabase, body);
    }

    return errorResponse(400, "INVALID_ACTION", "Ação inválida. Use: create, status, cancel");

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    const errorCode = (error as any)?.errorCode || "INTERNAL_ERROR";
    const suggestedManualMethod = (error as any)?.suggestedManualMethod;
    logStep("ERROR", { message: msg, errorCode });
    return errorResponse(500, errorCode, msg, { suggestedManualMethod });
  }
});

// ============================================================
// GET ASAAS CREDENTIALS FOR TENANT
// ============================================================
async function getAsaasCredentials(supabase: any, tenantId: string) {
  // 1. Try tenant-specific credentials from payment_provider_accounts
  const { data: tenantAccount } = await supabase
    .from("payment_provider_accounts")
    .select("*")
    .eq("provider", "asaas")
    .eq("scope_type", "tenant")
    .eq("scope_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  if (tenantAccount?.credentials_encrypted?.api_key) {
    const apiKey = tenantAccount.credentials_encrypted.api_key;
    logStep("Using tenant-scoped Asaas key");
    return resolveAsaasEnv(apiKey);
  }

  // 2. Try platform-scoped credentials
  const { data: platformAccount } = await supabase
    .from("payment_provider_accounts")
    .select("*")
    .eq("provider", "asaas")
    .eq("scope_type", "platform")
    .eq("status", "active")
    .maybeSingle();

  if (platformAccount?.credentials_encrypted?.api_key) {
    const apiKey = platformAccount.credentials_encrypted.api_key;
    logStep("Using platform-scoped Asaas key");
    return resolveAsaasEnv(apiKey);
  }

  // 3. Fallback to legacy payment_gateways table
  const { data: gateway } = await supabase
    .from("payment_gateways")
    .select("*")
    .eq("provider", "asaas")
    .eq("is_active", true)
    .maybeSingle();

  if (gateway?.api_key_masked) {
    const apiKey = gateway.api_key_masked;
    logStep("Using legacy payment_gateways Asaas key");
    return resolveAsaasEnv(apiKey);
  }

  const err = new Error("Nenhuma credencial Asaas configurada para este tenant");
  (err as any).errorCode = "NO_CREDENTIALS";
  (err as any).suggestedManualMethod = "cash";
  throw err;
}

function resolveAsaasEnv(apiKey: string) {
  const isProduction = apiKey.startsWith("$aact_prod_");
  return {
    apiKey,
    baseUrl: isProduction ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3",
    isProduction,
  };
}

// ============================================================
// CREATE PAYMENT
// ============================================================
async function handleCreate(supabase: any, body: any, userId: string) {
  const {
    tenant_id,
    order_id,
    amount,
    billing_type,
    customer_name,
    customer_cpf_cnpj,
    customer_email,
    customer_phone,
    description,
    idempotency_key,
  } = body;

  if (!tenant_id || !order_id || !amount || !billing_type) {
    return errorResponse(400, "VALIDATION_ERROR", "tenant_id, order_id, amount, billing_type são obrigatórios");
  }

  // CPF is required for PIX and BOLETO
  if ((billing_type === 'PIX' || billing_type === 'BOLETO') && !customer_cpf_cnpj) {
    const suggested = billing_type === 'PIX' ? 'pix' : 'cash';
    return errorResponse(400, "CPF_REQUIRED", "CPF ou CNPJ do cliente é obrigatório para PIX e Boleto", {
      suggestedManualMethod: suggested,
    });
  }

  // Idempotency check
  if (idempotency_key) {
    const { data: existing } = await supabase
      .from("payments")
      .select("id, gateway_transaction_id, gateway_response, status")
      .eq("order_id", order_id)
      .eq("gateway_provider", "asaas")
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing?.gateway_transaction_id) {
      logStep("Idempotent: returning existing payment", { paymentId: existing.id });
      const resp = existing.gateway_response || {};
      return new Response(
        JSON.stringify({
          success: true,
          payment_id: existing.id,
          gateway_payment_id: existing.gateway_transaction_id,
          status: existing.status,
          pix_qr_code: resp.pix_qr_code,
          pix_qr_code_image: resp.pix_qr_code_image,
          pix_expiration: resp.pix_expiration,
          invoice_url: resp.invoice_url,
          bank_slip_url: resp.bank_slip_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  let apiKey: string, baseUrl: string;
  try {
    const creds = await getAsaasCredentials(supabase, tenant_id);
    apiKey = creds.apiKey;
    baseUrl = creds.baseUrl;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao obter credenciais";
    return errorResponse(500, "NO_CREDENTIALS", msg, { suggestedManualMethod: "cash" });
  }

  // Find or create customer
  let customerId: string;
  try {
    const searchEmail = customer_email || `pos-${tenant_id.substring(0, 8)}@noemail.local`;
    const searchRes = await fetch(
      `${baseUrl}/customers?email=${encodeURIComponent(searchEmail)}`,
      { headers: { access_token: apiKey } }
    );
    if (!searchRes.ok) throw new Error("Falha ao buscar cliente no Asaas");
    const searchResult = await searchRes.json();

    if (searchResult.data?.length > 0) {
      customerId = searchResult.data[0].id;
    } else {
      const custBody: any = {
        name: customer_name || "Cliente PDV",
        email: searchEmail,
        externalReference: `pdv:${tenant_id.substring(0, 8)}`,
      };
      if (customer_cpf_cnpj) custBody.cpfCnpj = customer_cpf_cnpj.replace(/\D/g, "");
      if (customer_phone) custBody.phone = customer_phone.replace(/\D/g, "");

      const createRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: apiKey },
        body: JSON.stringify(custBody),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.errors?.[0]?.description || "Falha ao criar cliente");
      }
      const newCust = await createRes.json();
      customerId = newCust.id;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao resolver cliente no Asaas";
    return errorResponse(502, "ASAAS_UNAVAILABLE", msg, { suggestedManualMethod: "cash" });
  }

  logStep("Customer resolved", { customerId });

  // Asaas minimum R$ 5,00
  const ASAAS_MIN_VALUE = 5.0;
  const finalBillingType = amount < ASAAS_MIN_VALUE ? "PIX" : billing_type;

  // Due date: today + 1 day for POS
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const externalRef = `pos:${order_id.substring(0, 8)}|t:${tenant_id.substring(0, 8)}`;

  const paymentBody: any = {
    customer: customerId,
    billingType: finalBillingType,
    value: amount,
    dueDate: dueDate.toISOString().split("T")[0],
    description: description || `Pedido PDV`,
    externalReference: externalRef,
  };

  logStep("Creating Asaas payment", { customerId, value: amount, billingType: finalBillingType });

  let payment: any;
  try {
    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: apiKey },
      body: JSON.stringify(paymentBody),
    });

    if (!paymentRes.ok) {
      const errData = await paymentRes.json();
      logStep("Asaas payment failed", errData);
      throw new Error(errData.errors?.[0]?.description || "Falha ao criar cobrança");
    }

    payment = await paymentRes.json();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao criar cobrança no Asaas";
    const billingMap: Record<string, string> = { PIX: "pix", CREDIT_CARD: "credit_card", BOLETO: "cash" };
    return errorResponse(502, "ASAAS_UNAVAILABLE", msg, {
      suggestedManualMethod: billingMap[finalBillingType] || "cash",
    });
  }

  logStep("Asaas payment created", { id: payment.id, status: payment.status });

  // Get PIX QR Code if billing type is PIX
  let pixQrCode = null;
  let pixQrCodeImage = null;
  let pixExpiration = null;

  if (finalBillingType === "PIX") {
    try {
      const pixRes = await fetch(`${baseUrl}/payments/${payment.id}/pixQrCode`, {
        headers: { access_token: apiKey },
      });
      if (pixRes.ok) {
        const pixData = await pixRes.json();
        pixQrCode = pixData.payload;
        pixQrCodeImage = pixData.encodedImage;
        pixExpiration = pixData.expirationDate;
        logStep("PIX QR code retrieved");
      }
    } catch (e) {
      logStep("PIX QR code retrieval failed (non-critical)", { error: String(e) });
    }
  }

  // Get bank slip URL if billing type is BOLETO
  let bankSlipUrl = null;
  if (finalBillingType === "BOLETO") {
    bankSlipUrl = payment.bankSlipUrl;
  }

  // Map Asaas billing type to our payment_method enum
  const paymentMethodMap: Record<string, string> = {
    PIX: "pix",
    CREDIT_CARD: "credit_card",
    BOLETO: "voucher",
  };

  // Update payments table with gateway info
  const { error: updateError } = await supabase
    .from("payments")
    .update({
      gateway_provider: "asaas",
      gateway_transaction_id: payment.id,
      gateway_payment_intent: payment.invoiceUrl,
      gateway_response: {
        pix_qr_code: pixQrCode,
        pix_qr_code_image: pixQrCodeImage,
        pix_expiration: pixExpiration,
        invoice_url: payment.invoiceUrl,
        bank_slip_url: bankSlipUrl,
        asaas_status: payment.status,
        billing_type: finalBillingType,
        customer_id: customerId,
      },
      payment_method: paymentMethodMap[finalBillingType] || "pix",
    })
    .eq("order_id", order_id);

  if (updateError) {
    logStep("Failed to update payment record", { error: updateError.message });
  }

  return new Response(
    JSON.stringify({
      success: true,
      gateway_payment_id: payment.id,
      status: payment.status,
      billing_type: finalBillingType,
      pix_qr_code: pixQrCode,
      pix_qr_code_image: pixQrCodeImage,
      pix_expiration: pixExpiration,
      invoice_url: payment.invoiceUrl,
      bank_slip_url: bankSlipUrl,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================
// CHECK PAYMENT STATUS
// ============================================================
async function handleStatus(supabase: any, body: any) {
  const { tenant_id, gateway_payment_id } = body;

  if (!tenant_id || !gateway_payment_id) {
    return errorResponse(400, "VALIDATION_ERROR", "tenant_id e gateway_payment_id são obrigatórios");
  }

  let apiKey: string, baseUrl: string;
  try {
    const creds = await getAsaasCredentials(supabase, tenant_id);
    apiKey = creds.apiKey;
    baseUrl = creds.baseUrl;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao obter credenciais";
    return errorResponse(500, "NO_CREDENTIALS", msg);
  }

  let payment: any;
  try {
    const res = await fetch(`${baseUrl}/payments/${gateway_payment_id}`, {
      headers: { access_token: apiKey },
    });

    if (!res.ok) {
      throw new Error("Falha ao consultar status do pagamento");
    }
    payment = await res.json();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao consultar status";
    return errorResponse(502, "ASAAS_UNAVAILABLE", msg);
  }

  logStep("Payment status checked", { id: payment.id, status: payment.status });

  // Map Asaas status to our status
  const statusMap: Record<string, string> = {
    PENDING: "pending",
    RECEIVED: "approved",
    CONFIRMED: "approved",
    OVERDUE: "pending",
    REFUNDED: "refunded",
    RECEIVED_IN_CASH: "approved",
    REFUND_REQUESTED: "pending",
    CHARGEBACK_REQUESTED: "cancelled",
    CHARGEBACK_DISPUTE: "cancelled",
    AWAITING_CHARGEBACK_REVERSAL: "pending",
    DUNNING_REQUESTED: "pending",
    DUNNING_RECEIVED: "approved",
    AWAITING_RISK_ANALYSIS: "pending",
  };

  const mappedStatus = statusMap[payment.status] || "pending";
  const isConfirmed = mappedStatus === "approved";

  // If confirmed, update local payment + order
  if (isConfirmed) {
    const { data: localPayment } = await supabase
      .from("payments")
      .select("id, order_id, status")
      .eq("gateway_transaction_id", gateway_payment_id)
      .maybeSingle();

    if (localPayment && localPayment.status !== "approved") {
      await supabase
        .from("payments")
        .update({ status: "approved", paid_at: new Date().toISOString() })
        .eq("id", localPayment.id);

      await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", localPayment.order_id);

      logStep("Local payment + order updated to paid", { orderId: localPayment.order_id });
    }
  }

  return new Response(
    JSON.stringify({
      gateway_status: payment.status,
      status: mappedStatus,
      is_confirmed: isConfirmed,
      payment_date: payment.paymentDate,
      confirmed_date: payment.confirmedDate,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================
// CANCEL PAYMENT
// ============================================================
async function handleCancel(supabase: any, body: any) {
  const { tenant_id, gateway_payment_id } = body;

  if (!tenant_id || !gateway_payment_id) {
    return errorResponse(400, "VALIDATION_ERROR", "tenant_id e gateway_payment_id são obrigatórios");
  }

  let apiKey: string, baseUrl: string;
  try {
    const creds = await getAsaasCredentials(supabase, tenant_id);
    apiKey = creds.apiKey;
    baseUrl = creds.baseUrl;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao obter credenciais";
    return errorResponse(500, "NO_CREDENTIALS", msg);
  }

  try {
    const res = await fetch(`${baseUrl}/payments/${gateway_payment_id}`, {
      method: "DELETE",
      headers: { access_token: apiKey },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.errors?.[0]?.description || "Falha ao cancelar pagamento");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao cancelar pagamento";
    return errorResponse(502, "ASAAS_UNAVAILABLE", msg);
  }

  logStep("Payment cancelled", { gateway_payment_id });

  // Update local
  await supabase
    .from("payments")
    .update({ status: "cancelled" })
    .eq("gateway_transaction_id", gateway_payment_id);

  return new Response(
    JSON.stringify({ success: true, cancelled: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
