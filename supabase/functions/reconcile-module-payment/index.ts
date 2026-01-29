import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECONCILE-MODULE-PAYMENT] ${step}${detailsStr}`);
};

type ParsedRef =
  | { type: 'plan'; plan_id: string; user_id: string }
  | { type: 'module'; module_id_prefix: string; tenant_id_prefix: string };

function parseExternalReference(ref: string): ParsedRef | null {
  try {
    const json = JSON.parse(ref);
    if (json.t === 'mod' && json.m && json.tn) {
      return { type: 'module', module_id_prefix: json.m, tenant_id_prefix: json.tn };
    }
    if (json.t === 'plan' && json.p && json.u) {
      return { type: 'plan', plan_id: json.p, user_id: json.u };
    }
  } catch {
    // not JSON
  }

  const parts = ref
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
  const map: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const k = part.slice(0, idx);
    const v = part.slice(idx + 1);
    if (k && v) map[k] = v;
  }

  if (map.p && map.u) return { type: 'plan', plan_id: map.p, user_id: map.u };
  if (map.m && map.t) return { type: 'module', module_id_prefix: map.m, tenant_id_prefix: map.t };
  return null;
}

function isAsaasPaidStatus(status: string | undefined): boolean {
  const s = (status || '').toUpperCase();
  // Asaas statuses commonly include: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED...
  return s === 'RECEIVED' || s === 'CONFIRMED';
}

function getAsaasBaseUrl(apiKey: string): string {
  const isProduction = apiKey.startsWith('$aact_prod_');
  return isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const user = userData.user;

    const { paymentId } = await req.json().catch(() => ({}));
    if (!paymentId || typeof paymentId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'paymentId é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    logStep('Reconciling payment', { paymentId, userId: user.id, email: user.email });

    // Resolve tenant from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      logStep('Profile/tenant lookup failed', { error: profileError?.message });
      return new Response(JSON.stringify({ success: false, error: 'Tenant não encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    const tenantId = profile.tenant_id as string;

    // Get Asaas gateway config (API key stored in DB)
    const { data: gatewayConfig, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('provider', 'asaas')
      .eq('is_active', true)
      .maybeSingle();

    if (gatewayError || !gatewayConfig?.api_key_masked) {
      logStep('Asaas gateway not configured/active', { error: gatewayError?.message });
      return new Response(JSON.stringify({ success: false, error: 'Gateway Asaas indisponível' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const asaasApiKey = gatewayConfig.api_key_masked as string;
    const baseUrl = getAsaasBaseUrl(asaasApiKey);

    // Fetch payment details
    const paymentRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { access_token: asaasApiKey },
    });

    if (!paymentRes.ok) {
      const err = await paymentRes.json().catch(() => ({}));
      logStep('Asaas payment fetch failed', { status: paymentRes.status, err });
      return new Response(JSON.stringify({ success: false, error: 'Falha ao buscar pagamento no Asaas' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    const payment = await paymentRes.json();
    const paymentStatus = String(payment?.status || '');

    logStep('Asaas payment fetched', {
      status: paymentStatus,
      value: payment?.value,
      billingType: payment?.billingType,
      externalReference: payment?.externalReference,
    });

    if (!isAsaasPaidStatus(paymentStatus)) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: false,
          reason: 'payment_not_confirmed',
          status: paymentStatus,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!payment?.externalReference) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pagamento sem externalReference (não foi gerado pelo sistema)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const parsed = parseExternalReference(String(payment.externalReference));
    if (!parsed || parsed.type !== 'module') {
      logStep('Invalid/unsupported externalReference', { externalReference: payment.externalReference });
      return new Response(
        JSON.stringify({ success: false, error: 'externalReference inválido para módulo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Security: ensure payment belongs to this tenant (prefix match)
    const expectedTenantPrefix = tenantId.slice(0, 8);
    if (parsed.tenant_id_prefix !== expectedTenantPrefix) {
      logStep('Tenant prefix mismatch', {
        expectedTenantPrefix,
        gotTenantPrefix: parsed.tenant_id_prefix,
        tenantId,
      });
      return new Response(JSON.stringify({ success: false, error: 'Pagamento não pertence ao seu tenant' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Resolve full module id by prefix
    const { data: modulesFound, error: moduleError } = await supabase
      .from('addon_modules')
      .select('id, name, slug, monthly_price')
      .like('id', `${parsed.module_id_prefix}%`)
      .limit(2);

    if (moduleError || !modulesFound || modulesFound.length !== 1) {
      logStep('Module resolution failed', {
        prefix: parsed.module_id_prefix,
        count: modulesFound?.length,
        error: moduleError?.message,
      });
      return new Response(JSON.stringify({ success: false, error: 'Módulo não encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const moduleData = modulesFound[0];

    // Idempotency: if already active/trial, return success
    const { data: existingSub } = await supabase
      .from('tenant_addon_subscriptions')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('addon_module_id', moduleData.id)
      .in('status', ['active', 'trial'])
      .maybeSingle();

    if (existingSub) {
      logStep('Already active', { subscriptionId: existingSub.id, status: existingSub.status });
      return new Response(
        JSON.stringify({
          success: true,
          processed: true,
          alreadyActive: true,
          module: { id: moduleData.id, name: moduleData.name, slug: moduleData.slug },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);
    const nextBillingDate = new Date(now);
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);

    const { data: upserted, error: upsertError } = await supabase
      .from('tenant_addon_subscriptions')
      .upsert(
        {
          tenant_id: tenantId,
          addon_module_id: moduleData.id,
          status: 'active',
          source: 'purchase',
          is_free: false,
          price_paid: Number(payment?.value ?? moduleData.monthly_price ?? 0),
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          purchased_at: now.toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          asaas_payment_id: payment.id,
          billing_mode: 'separate',
        },
        { onConflict: 'tenant_id,addon_module_id' }
      )
      .select('id')
      .single();

    if (upsertError) {
      logStep('Failed to upsert tenant_addon_subscriptions', { error: upsertError.message });
      return new Response(JSON.stringify({ success: false, error: 'Falha ao ativar módulo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      entity_type: 'tenant_addon_subscription',
      entity_id: upserted?.id ?? null,
      action: 'module_payment_reconciled',
      user_id: user.id,
      new_data: {
        module_id: moduleData.id,
        module_slug: moduleData.slug,
        module_name: moduleData.name,
        asaas_payment_id: payment.id,
        asaas_status: paymentStatus,
        value: payment?.value,
        billingType: payment?.billingType,
      },
    });

    logStep('Module activated', { tenantId, moduleId: moduleData.id, subscriptionId: upserted?.id });

    return new Response(
      JSON.stringify({
        success: true,
        processed: true,
        activated: true,
        module: { id: moduleData.id, name: moduleData.name, slug: moduleData.slug },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
