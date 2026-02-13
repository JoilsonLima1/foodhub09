import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser();
    if (userError || !user) throw new Error("Usuário não autenticado");

    const { provider, scope_type, scope_id, environment } = await req.json();
    if (!provider) throw new Error("provider é obrigatório");

    console.log(`[gateway-verify-account] provider=${provider} scope=${scope_type}/${scope_id} env=${environment}`);

    // 1. Find the credential
    let apiKey: string | null = null;
    let accountId: string | null = null;
    let credentialSource: "new_structure" | "legacy" | "none" = "none";

    // Priority: payment_provider_accounts (new structure, scoped)
    let query = supabase
      .from("payment_provider_accounts")
      .select("*")
      .eq("provider", provider)
      .eq("scope_type", scope_type || "platform");

    if (scope_id) {
      query = query.eq("scope_id", scope_id);
    } else {
      query = query.is("scope_id", null);
    }

    const { data: account } = await query.maybeSingle();

    if (account) {
      accountId = account.id;
      const creds = account.credentials_encrypted as Record<string, string> | null;
      if (provider === "asaas") apiKey = creds?.api_key || null;
      else if (provider === "stripe") apiKey = creds?.secret_key || null;
      else apiKey = creds?.api_key || creds?.client_id || null;
      if (apiKey) credentialSource = "new_structure";
      console.log(`[gateway-verify-account] Found account id=${accountId}, hasKey=${!!apiKey}, source=new_structure`);
    }

    // Check if the key from new structure is masked (contains ****)
    const isMasked = (key: string | null): boolean => {
      if (!key) return false;
      return key.includes("****") || key.includes("***");
    };

    if (apiKey && isMasked(apiKey)) {
      console.warn(`[gateway-verify-account] Key from new_structure is MASKED — treating as invalid`);
      apiKey = null;
    }

    // Fallback to legacy payment_gateways
    if (!apiKey) {
      const { data: legacy } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("provider", provider)
        .eq("is_active", true)
        .maybeSingle();

      if (legacy?.api_key_masked) {
        const legacyKey = legacy.api_key_masked;
        if (isMasked(legacyKey)) {
          console.warn(`[gateway-verify-account] Legacy key is MASKED — cannot use for verification`);
        } else {
          apiKey = legacyKey;
          credentialSource = "legacy";
          console.log(`[gateway-verify-account] Using legacy key, source=legacy`);
        }
      }
    }

    if (!apiKey) {
      throw new Error("Nenhuma credencial válida encontrada. A Secret Key pode estar mascarada ou ausente. Re-salve a chave no painel de credenciais.");
    }

    // 2. Call provider API
    let profileData: Record<string, unknown> = {};
    let verifiedLevel: "full" | "partial" = "full";
    const missingFields: string[] = [];

    if (provider === "asaas") {
      profileData = await verifyAsaas(apiKey, environment, provider, scope_type, scope_id);
      // Check beneficiary code (bank_account) — required for "full" verification
      if (!profileData.bank_account) missingFields.push("bank_account");
      if (!profileData.legal_name && !profileData.document) {
        missingFields.push("legal_name", "document");
      }
      // "full" only when we have name/doc AND beneficiary_code
      const hasIdentity = !!(profileData.legal_name || profileData.document);
      const hasAccount = !!profileData.bank_account;
      verifiedLevel = (hasIdentity && hasAccount) ? "full" : "partial";
    } else if (provider === "stripe") {
      const resolvedSecretKey = (apiKey || "").trim();

      // Reject publishable keys
      if (resolvedSecretKey.startsWith("pk_")) {
        throw new Error("Você informou uma Publishable Key (pk_…). Informe a Secret Key (sk_live_… ou sk_test_…).");
      }

      // Accept sk_ (standard Secret Key) and rk_ (Restricted Key) — both are valid for API calls
      const isSecretKey = resolvedSecretKey.startsWith("sk_");
      const isRestrictedKey = resolvedSecretKey.startsWith("rk_");
      if (!isSecretKey && !isRestrictedKey) {
        throw new Error("Chave Stripe inválida. Informe uma Secret Key (sk_live_…) ou Restricted Key (rk_live_…).");
      }

      // Detect masked keys that slipped through
      if (resolvedSecretKey.includes("****") || resolvedSecretKey.includes("***")) {
        throw new Error("A Secret Key está mascarada (contém ****). Re-salve a chave real no painel de credenciais.");
      }

      // Determine key environment
      const resolvedEnv = environment || "production";
      const isLiveKey = resolvedSecretKey.includes("_live_");
      const isTestKey = resolvedSecretKey.includes("_test_");
      const keyPrefix = resolvedSecretKey.slice(0, resolvedSecretKey.indexOf("_", 3) + 1) || "unknown";

      // Validate environment compatibility
      if (resolvedEnv === "production" && isTestKey) {
        throw new Error(`Ambiente production requer chave live (*_live_…). A chave informada é de teste (${keyPrefix}…).`);
      }
      if ((resolvedEnv === "test" || resolvedEnv === "sandbox") && isLiveKey) {
        throw new Error(`Ambiente sandbox/test requer chave de teste (*_test_…). A chave informada é live (${keyPrefix}…).`);
      }

      // Secure log — never leak the full key
      console.log(
        `[gateway-verify-account] stripe_verify: source=${credentialSource} env=${resolvedEnv} ` +
        `scope=${scope_type || "platform"}/${scope_id || "null"} ` +
        `key_prefix=${keyPrefix} key_len=${resolvedSecretKey.length} masked=false`
      );

      profileData = await verifyStripe(resolvedSecretKey, provider, scope_type, scope_id);
      if (!profileData.legal_name) missingFields.push("legal_name");
      verifiedLevel = missingFields.length > 0 ? "partial" : "full";
    } else if (provider === "woovi" || provider === "openpix") {
      profileData = await verifyWoovi(apiKey, provider, scope_type, scope_id);
      if (!profileData.legal_name) missingFields.push("legal_name");
      if (!profileData.document) missingFields.push("document");
      verifiedLevel = missingFields.length > 0 ? "partial" : "full";
    } else {
      profileData = {
        legal_name: null,
        document: null,
        raw_profile_json: {
          provider, scope_type, scope_id,
          fetched_at: new Date().toISOString(),
          note: "Verificação automática não disponível para este provedor",
        },
      };
      verifiedLevel = "partial";
      missingFields.push("legal_name", "document", "bank_name", "bank_agency", "bank_account");
    }

    // 3. Save/update profile — NEVER overwrite existing values with nulls
    if (accountId) {
      // Fetch existing profile first
      const { data: existingProfile } = await supabase
        .from("payment_provider_account_profile")
        .select("*")
        .eq("provider_account_id", accountId)
        .maybeSingle();

      const mergedData: Record<string, unknown> = {
        provider_account_id: accountId,
        verified_at: new Date().toISOString(),
        verified_level: verifiedLevel,
        missing_fields: missingFields,
        updated_at: new Date().toISOString(),
      };

      // Merge fields: only overwrite if new value is non-null
      const mergeableFields = ["legal_name", "document", "bank_name", "bank_agency", "bank_account", "account_number", "wallet_id", "merchant_id", "raw_profile_json"];
      for (const field of mergeableFields) {
        const newVal = profileData[field];
        const oldVal = existingProfile?.[field];
        mergedData[field] = (newVal !== null && newVal !== undefined) ? newVal : (oldVal || null);
      }

      const { error: upsertError } = await supabase
        .from("payment_provider_account_profile")
        .upsert(mergedData, { onConflict: "provider_account_id" });

      if (upsertError) {
        console.error(`[gateway-verify-account] Upsert error: ${JSON.stringify(upsertError)}`);
        throw new Error(`Erro ao salvar perfil: ${upsertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider_account_id: accountId,
        profile: profileData,
        verified_level: verifiedLevel,
        missing_fields: missingFields,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err.message || String(err);
    console.error(`[gateway-verify-account] Error: ${message}`);
    // Always return 200 so supabase.functions.invoke delivers JSON to the client
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===== Asaas verification =====
// Platform default bank values (Asaas does NOT expose full bank data via API)
const ASAAS_PLATFORM_DEFAULTS = {
  bank_code: "461",
  bank_name: "Asaas IP S.A. (461)",
  bank_agency: "0001",
};

// Helper: safely fetch a URL and return JSON or null (never throws)
async function safeFetchJson(url: string, headers: Record<string, string>): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.log(`[asaas-safe-fetch] ${url} → ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.log(`[asaas-safe-fetch] ${url} → error: ${e}`);
    return null;
  }
}

// Helper: extract first plausible beneficiary code from an object
function extractBeneficiaryCode(obj: Record<string, unknown> | null | undefined): string | null {
  if (!obj) return null;
  const candidates = ["accountNumber", "walletId", "id", "publicId", "customerId", "beneficiaryCode", "code", "account"];
  for (const key of candidates) {
    const val = obj[key];
    if (val && typeof val === "object" && (val as Record<string, unknown>).number) {
      return String((val as Record<string, unknown>).number);
    }
    if (val && (typeof val === "string" || typeof val === "number")) {
      const str = String(val);
      if (str.length >= 3) return str;
    }
  }
  return null;
}

async function verifyAsaas(
  apiKey: string,
  environment: string | undefined,
  provider: string,
  scope_type: string,
  scope_id: string | null,
): Promise<Record<string, unknown>> {
  const isProduction = apiKey.startsWith("$aact_prod_");
  const baseUrl = isProduction
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
  const headers = { access_token: apiKey };

  // Step 1: Primary endpoint — /myAccount/commercialInfo
  const accountRes = await fetch(`${baseUrl}/myAccount/commercialInfo`, { headers });

  if (!accountRes.ok) {
    const errBody = await accountRes.text();
    console.error(`[gateway-verify-account] Asaas API error: ${accountRes.status} ${errBody}`);
    if (accountRes.status === 401 || accountRes.status === 403) {
      throw new Error("Chave de API inválida ou sem permissão. Verifique a chave no painel do Asaas.");
    }
    throw new Error(`Erro ao consultar Asaas (HTTP ${accountRes.status}): ${errBody}`);
  }

  const accountData = await accountRes.json();
  console.log(`[gateway-verify-account] Asaas commercialInfo keys: ${Object.keys(accountData).join(", ")}`);

  // Step 2: Extract beneficiary_code with multi-strategy fallback
  let beneficiaryCode: string | null = null;
  let beneficiarySource: string | null = null;

  // PRIORITY A: from myAccount response itself
  beneficiaryCode = extractBeneficiaryCode(accountData);
  if (beneficiaryCode) {
    beneficiarySource = "myAccount/commercialInfo";
    console.log(`[gateway-verify-account] beneficiary_code from commercialInfo: ${beneficiaryCode}`);
  }

  // PRIORITY B: try secondary endpoints (safe, non-breaking)
  if (!beneficiaryCode) {
    const bankEndpoints = [
      `${baseUrl}/myAccount/bankAccountInfo`,
      `${baseUrl}/finance/bankAccount`,
      `${baseUrl}/wallets`,
    ];

    for (const url of bankEndpoints) {
      const data = await safeFetchJson(url, headers);
      if (data) {
        // Handle list responses (e.g. wallets returns { data: [...] })
        const target = (Array.isArray((data as any).data) && (data as any).data.length > 0)
          ? (data as any).data[0]
          : data;
        beneficiaryCode = extractBeneficiaryCode(target as Record<string, unknown>);
        if (beneficiaryCode) {
          beneficiarySource = url.replace(baseUrl, "");
          console.log(`[gateway-verify-account] beneficiary_code from ${beneficiarySource}: ${beneficiaryCode}`);
          break;
        }
      }
    }
  }

  // PRIORITY C: fallback from most recent payment
  if (!beneficiaryCode) {
    const paymentsData = await safeFetchJson(`${baseUrl}/payments?limit=1&offset=0`, headers);
    if (paymentsData && Array.isArray((paymentsData as any).data) && (paymentsData as any).data.length > 0) {
      const payment = (paymentsData as any).data[0];
      // Try to extract any receiver/wallet identifier from the payment
      const paymentCode = extractBeneficiaryCode(payment);
      if (paymentCode) {
        beneficiaryCode = paymentCode;
        beneficiarySource = "payments (fallback)";
        console.log(`[gateway-verify-account] beneficiary_code from payment fallback: ${beneficiaryCode}`);
      }
    }
  }

  if (!beneficiaryCode) {
    console.log(`[gateway-verify-account] No beneficiary_code found from any strategy`);
  }

  // Step 3: Fetch bank account number from /myAccount/accountNumber
  let accountNumber: string | null = null;
  let accountNumberSource: string | null = null;
  try {
    const accNumRes = await fetch(`${baseUrl}/myAccount/accountNumber`, { headers });
    if (accNumRes.ok) {
      const accNumData = await accNumRes.json();
      console.log(`[gateway-verify-account] accountNumber response: ${JSON.stringify(accNumData)}`);
      if (accNumData.account) {
        accountNumber = accNumData.accountDigit
          ? `${accNumData.account}-${accNumData.accountDigit}`
          : accNumData.account;
        accountNumberSource = "/myAccount/accountNumber";
        console.log(`[gateway-verify-account] account_number: ${accountNumber}`);
      }
    } else {
      console.log(`[gateway-verify-account] /myAccount/accountNumber failed: ${accNumRes.status}`);
    }
  } catch (e) {
    console.log(`[gateway-verify-account] /myAccount/accountNumber error: ${e}`);
  }

  return {
    legal_name: accountData.corporateName || accountData.companyName || accountData.name || null,
    document: accountData.cpfCnpj || null,
    bank_name: ASAAS_PLATFORM_DEFAULTS.bank_name,
    bank_agency: ASAAS_PLATFORM_DEFAULTS.bank_agency,
    bank_account: beneficiaryCode,
    account_number: accountNumber,
    wallet_id: accountData.walletId || null,
    merchant_id: accountData.walletId || accountData.id || null,
    raw_profile_json: {
      provider,
      scope_type,
      scope_id,
      environment: environment || (isProduction ? "production" : "sandbox"),
      fetched_at: new Date().toISOString(),
      account_data: accountData,
      platform_defaults_applied: true,
      beneficiary_code_source: beneficiarySource,
      account_number_source: accountNumberSource,
      note: "Banco e agência são padrões da plataforma. Conta = código do beneficiário/recebedor no Asaas. Conta Bancária = número da conta do titular.",
    },
  };
}

// ===== Stripe verification =====
async function verifyStripe(
  apiKey: string,
  provider: string,
  scope_type: string,
  scope_id: string | null,
): Promise<Record<string, unknown>> {
  const accountRes = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!accountRes.ok) {
    const requestId = accountRes.headers.get("request-id");
    const maskedKey = apiKey.slice(0, 8) + "****";
    let errBody: Record<string, unknown> = {};
    try { errBody = await accountRes.json(); } catch (_) { /* ignore */ }
    const stripeCode = (errBody as any)?.error?.code || "";
    console.error(`[gateway-verify-account] Stripe error: status=${accountRes.status} code=${stripeCode} key=${maskedKey} request-id=${requestId}`);
    if (accountRes.status === 401 || stripeCode === "invalid_api_key") {
      throw new Error(`Secret Key inválida (${maskedKey}). Verifique no dashboard da Stripe.`);
    }
    throw new Error(`Erro ao consultar Stripe (HTTP ${accountRes.status}).`);
  }

  const s = await accountRes.json();
  return {
    legal_name: s.business_profile?.name || s.settings?.dashboard?.display_name || null,
    document: s.business_profile?.tax_id || null,
    bank_name: null,
    bank_agency: null,
    bank_account: null,
    wallet_id: null,
    merchant_id: s.id || null,
    raw_profile_json: {
      provider,
      scope_type,
      scope_id,
      fetched_at: new Date().toISOString(),
      stripe_account: {
        id: s.id,
        country: s.country,
        charges_enabled: s.charges_enabled,
        payouts_enabled: s.payouts_enabled,
        business_type: s.business_type,
      },
    },
  };
}

// ===== Woovi / OpenPix verification =====
async function verifyWoovi(
  apiKey: string,
  provider: string,
  scope_type: string,
  scope_id: string | null,
): Promise<Record<string, unknown>> {
  const baseUrl = "https://api.openpix.com.br/api/v1";
  const headers: Record<string, string> = {
    Authorization: apiKey,
    "Content-Type": "application/json",
  };

  // Try GET /company to fetch account info
  const companyRes = await fetch(`${baseUrl}/company`, { headers });

  if (!companyRes.ok) {
    const errBody = await companyRes.text();
    console.error(`[gateway-verify-account] Woovi /company error: ${companyRes.status} ${errBody}`);
    if (companyRes.status === 401 || companyRes.status === 403) {
      throw new Error("API Key inválida ou sem permissão. Verifique a chave no painel Woovi.");
    }
    throw new Error(`Erro ao consultar Woovi (HTTP ${companyRes.status}): ${errBody}`);
  }

  const companyData = await companyRes.json();
  console.log(`[gateway-verify-account] Woovi company keys: ${JSON.stringify(Object.keys(companyData))}`);

  // The response can be { company: {...} } or direct fields
  const company = companyData.company || companyData;

  // Extract taxID — can be object { type, taxID } or string
  let document: string | null = null;
  if (company.taxID) {
    if (typeof company.taxID === "object" && company.taxID.taxID) {
      document = company.taxID.taxID;
    } else if (typeof company.taxID === "string") {
      document = company.taxID;
    }
  }

  // Try to get bank info from /subaccount or company details
  let bankName: string | null = null;
  let bankAgency: string | null = null;
  let bankAccount: string | null = null;
  let pixKey: string | null = null;

  // Check if company has bank info directly
  if (company.bankAccount) {
    const ba = company.bankAccount;
    bankName = ba.bankName || ba.bank || null;
    bankAgency = ba.agency || ba.agencia || null;
    bankAccount = ba.account || ba.accountNumber || null;
    if (ba.accountDigit) {
      bankAccount = bankAccount ? `${bankAccount}-${ba.accountDigit}` : null;
    }
  }

  // Try fetching subaccount list for additional info
  const subRes = await safeFetchJson(`${baseUrl}/subaccount`, headers);
  if (subRes && Array.isArray((subRes as any).subaccounts) && (subRes as any).subaccounts.length > 0) {
    const sub = (subRes as any).subaccounts[0];
    if (!bankName && sub.bankAccount) {
      bankName = sub.bankAccount.bankName || sub.bankAccount.bank || null;
      bankAgency = sub.bankAccount.agency || null;
      bankAccount = sub.bankAccount.account || null;
    }
    if (sub.pixKey) pixKey = sub.pixKey;
  }

  return {
    legal_name: company.name || company.corporateName || company.tradingName || null,
    document,
    email: company.email || null,
    bank_name: bankName,
    bank_agency: bankAgency,
    bank_account: bankAccount,
    wallet_id: company.id || company.clientId || null,
    merchant_id: company.id || null,
    pix_key: pixKey,
    raw_profile_json: {
      provider,
      scope_type,
      scope_id,
      fetched_at: new Date().toISOString(),
      company_data: company,
    },
  };
}
