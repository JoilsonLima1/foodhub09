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

    // 1. Find the credential (provider_accounts first, then legacy fallback)
    let apiKey: string | null = null;
    let accountId: string | null = null;

    // Try payment_provider_accounts
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
        console.log(`[gateway-verify-account] Using legacy key (masked: ${apiKey.slice(0, 8)}...)`);
      }
    }

    if (!apiKey) {
      throw new Error("Nenhuma credencial encontrada para este provedor/escopo. Salve as credenciais primeiro.");
    }

    // 2. Call provider API to get account/cedente data
    let profileData: Record<string, unknown> = {};

    if (provider === "asaas") {
      const isProduction = apiKey.startsWith("$aact_prod_");
      const baseUrl = isProduction
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/api/v3";

      // Get my account info
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

      // Try to get wallet/bank info
      let bankInfo: Record<string, unknown> = {};
      try {
        const walletRes = await fetch(`${baseUrl}/myAccount/wallets`, {
          headers: { access_token: apiKey },
        });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          console.log(`[gateway-verify-account] Asaas wallets response: ${JSON.stringify(walletData).slice(0, 200)}`);
          if (walletData?.data?.length > 0) {
            bankInfo.wallet_id = walletData.data[0].id;
          }
        }
      } catch (e) {
        console.log(`[gateway-verify-account] Wallets endpoint not available: ${e}`);
      }

      // Try bank account info
      try {
        const bankRes = await fetch(`${baseUrl}/myAccount/bankAccountInfo`, {
          headers: { access_token: apiKey },
        });
        if (bankRes.ok) {
          const bankData = await bankRes.json();
          console.log(`[gateway-verify-account] Asaas bankAccountInfo: ${JSON.stringify(bankData).slice(0, 300)}`);
          bankInfo = {
            ...bankInfo,
            bank_name: bankData.bank?.name || bankData.bankName || null,
            bank_agency: bankData.agency || bankData.agencyNumber || null,
            bank_account: bankData.account || bankData.accountNumber || null,
          };
        }
      } catch (e) {
        console.log(`[gateway-verify-account] BankAccountInfo not available: ${e}`);
      }

      profileData = {
        legal_name: accountData.corporateName || accountData.companyName || accountData.name || null,
        document: accountData.cpfCnpj || null,
        bank_name: bankInfo.bank_name || null,
        bank_agency: bankInfo.bank_agency || null,
        bank_account: bankInfo.bank_account || null,
        wallet_id: bankInfo.wallet_id || null,
        merchant_id: accountData.walletId || accountData.id || null,
        raw_profile_json: {
          provider,
          scope_type,
          scope_id,
          environment: environment || (apiKey.startsWith("$aact_prod_") ? "production" : "sandbox"),
          fetched_at: new Date().toISOString(),
          account_data: accountData,
          bank_data: bankInfo,
        },
      };
    } else if (provider === "stripe") {
      // For Stripe, use /v1/account
      const accountRes = await fetch("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!accountRes.ok) {
        const errBody = await accountRes.text();
        if (accountRes.status === 401) {
          throw new Error("Chave de API Stripe inválida. Verifique no dashboard do Stripe.");
        }
        throw new Error(`Erro ao consultar Stripe (HTTP ${accountRes.status})`);
      }

      const stripeAccount = await accountRes.json();
      profileData = {
        legal_name: stripeAccount.business_profile?.name || stripeAccount.settings?.dashboard?.display_name || null,
        document: stripeAccount.business_profile?.tax_id || null,
        bank_name: null,
        bank_agency: null,
        bank_account: null,
        wallet_id: null,
        merchant_id: stripeAccount.id || null,
        raw_profile_json: {
          provider,
          scope_type,
          scope_id,
          fetched_at: new Date().toISOString(),
          stripe_account: {
            id: stripeAccount.id,
            country: stripeAccount.country,
            charges_enabled: stripeAccount.charges_enabled,
            payouts_enabled: stripeAccount.payouts_enabled,
            business_type: stripeAccount.business_type,
          },
        },
      };
    } else {
      // Stone or unknown – placeholder
      profileData = {
        legal_name: "Verificação via API Stone não disponível automaticamente",
        document: null,
        raw_profile_json: {
          provider,
          scope_type,
          scope_id,
          fetched_at: new Date().toISOString(),
          note: "Stone requires manual verification or partner portal access",
        },
      };
    }

    // 3. Save/update profile in payment_provider_account_profile
    if (accountId) {
      const upsertData = {
        provider_account_id: accountId,
        ...profileData,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("payment_provider_account_profile")
        .upsert(upsertData, { onConflict: "provider_account_id" });

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
