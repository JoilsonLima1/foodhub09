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
      console.log(`[gateway-verify-account] Found account id=${accountId}, hasKey=${!!apiKey}`);
    }

    // Fallback to legacy
    if (!apiKey) {
      const { data: legacy } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("provider", provider)
        .eq("is_active", true)
        .maybeSingle();

      if (legacy?.api_key_masked) {
        apiKey = legacy.api_key_masked;
        console.log(`[gateway-verify-account] Using legacy key (masked: ${apiKey!.slice(0, 8)}...)`);
      }
    }

    if (!apiKey) {
      throw new Error("Nenhuma credencial encontrada para este provedor/escopo. Salve as credenciais primeiro.");
    }

    // 2. Call provider API
    let profileData: Record<string, unknown> = {};
    let verifiedLevel: "full" | "partial" = "full";
    const missingFields: string[] = [];

    if (provider === "asaas") {
      profileData = await verifyAsaas(apiKey, environment, provider, scope_type, scope_id);
      // Check which fields are missing
      if (!profileData.bank_agency) missingFields.push("bank_agency");
      if (!profileData.bank_account) missingFields.push("bank_account");
      if (!profileData.bank_name) missingFields.push("bank_name");
      if (!profileData.legal_name && !profileData.document) {
        missingFields.push("legal_name", "document");
      }
      verifiedLevel = missingFields.length > 0 ? "partial" : "full";
    } else if (provider === "stripe") {
      profileData = await verifyStripe(apiKey, provider, scope_type, scope_id);
      if (!profileData.legal_name) missingFields.push("legal_name");
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
      const mergeableFields = ["legal_name", "document", "bank_name", "bank_agency", "bank_account", "wallet_id", "merchant_id", "raw_profile_json"];
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
    console.error(`[gateway-verify-account] Error: ${err.message}`);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===== Asaas verification =====
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

  // 1. Get commercial info (name, document)
  const accountRes = await fetch(`${baseUrl}/myAccount/commercialInfo`, {
    headers: { access_token: apiKey },
  });

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

  // 2. Try bank account info (multiple strategies)
  let bankInfo: Record<string, unknown> = {};

  // Strategy A: /myAccount/bankAccountInfo
  try {
    const bankRes = await fetch(`${baseUrl}/myAccount/bankAccountInfo`, {
      headers: { access_token: apiKey },
    });
    if (bankRes.ok) {
      const bankData = await bankRes.json();
      console.log(`[gateway-verify-account] Asaas bankAccountInfo: ${JSON.stringify(bankData).slice(0, 300)}`);
      bankInfo = {
        bank_name: bankData.bank?.name || bankData.bankName || null,
        bank_agency: bankData.agency || bankData.agencyNumber || null,
        bank_account: bankData.account || bankData.accountNumber || null,
        bank_code: bankData.bank?.code || bankData.bankCode || null,
        account_digit: bankData.accountDigit || null,
        agency_digit: bankData.agencyDigit || null,
      };
    }
  } catch (e) {
    console.log(`[gateway-verify-account] BankAccountInfo not available: ${e}`);
  }

  // Strategy B: /myAccount/wallets (get wallet_id)
  let walletId: string | null = null;
  try {
    const walletRes = await fetch(`${baseUrl}/myAccount/wallets`, {
      headers: { access_token: apiKey },
    });
    if (walletRes.ok) {
      const walletData = await walletRes.json();
      if (walletData?.data?.length > 0) {
        walletId = walletData.data[0].id;
      }
    }
  } catch (e) {
    console.log(`[gateway-verify-account] Wallets not available: ${e}`);
  }

  // Strategy C: if walletId or accountData.walletId exists, try subaccount endpoint
  const subaccountId = accountData.walletId || walletId;
  if (subaccountId && !bankInfo.bank_agency) {
    try {
      const subRes = await fetch(`${baseUrl}/accounts/${subaccountId}`, {
        headers: { access_token: apiKey },
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        console.log(`[gateway-verify-account] Subaccount data: ${JSON.stringify(subData).slice(0, 300)}`);
        if (subData.bankAccount) {
          bankInfo.bank_name = bankInfo.bank_name || subData.bankAccount.bank?.name || null;
          bankInfo.bank_agency = bankInfo.bank_agency || subData.bankAccount.agency || null;
          bankInfo.bank_account = bankInfo.bank_account || subData.bankAccount.account || null;
        }
      }
    } catch (e) {
      console.log(`[gateway-verify-account] Subaccount not available: ${e}`);
    }
  }

  return {
    legal_name: accountData.corporateName || accountData.companyName || accountData.name || null,
    document: accountData.cpfCnpj || null,
    bank_name: bankInfo.bank_name || null,
    bank_agency: bankInfo.bank_agency || null,
    bank_account: bankInfo.bank_account || null,
    wallet_id: walletId || accountData.walletId || null,
    merchant_id: accountData.walletId || accountData.id || null,
    raw_profile_json: {
      provider,
      scope_type,
      scope_id,
      environment: environment || (isProduction ? "production" : "sandbox"),
      fetched_at: new Date().toISOString(),
      account_data: accountData,
      bank_data: bankInfo,
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
    if (accountRes.status === 401) {
      throw new Error("Chave de API Stripe inválida. Verifique no dashboard do Stripe.");
    }
    throw new Error(`Erro ao consultar Stripe (HTTP ${accountRes.status})`);
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
