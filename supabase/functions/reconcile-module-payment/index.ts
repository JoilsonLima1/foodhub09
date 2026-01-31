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

function isAsaasPaidStatus(status: string | undefined): boolean {
  const s = (status || '').toUpperCase();
  return s === 'RECEIVED' || s === 'CONFIRMED';
}

function getAsaasBaseUrl(apiKey: string): string {
  const isProduction = apiKey.startsWith('$aact_prod_');
  return isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';
}

serve(async (req) => {
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

    // ============================================================
    // NEW ARCHITECTURE: First look up in module_purchases by payment_id
    // ============================================================
    const { data: modulePurchase, error: purchaseError } = await supabase
      .from('module_purchases')
      .select(`
        id,
        tenant_id,
        addon_module_id,
        user_id,
        status,
        gateway,
        addon_modules:addon_module_id (id, name, slug, monthly_price)
      `)
      .eq('gateway_payment_id', paymentId)
      .maybeSingle();

    if (purchaseError) {
      logStep('Error looking up module_purchases', { error: purchaseError.message });
    }

    // Security: ensure purchase belongs to this tenant
    if (modulePurchase && modulePurchase.tenant_id !== tenantId) {
      logStep('Tenant mismatch', { purchaseTenantId: modulePurchase.tenant_id, requestTenantId: tenantId });
      return new Response(JSON.stringify({ success: false, error: 'Pagamento não pertence ao seu tenant' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // If already paid/active, return success
    if (modulePurchase?.status === 'paid') {
      logStep('Already paid', { purchaseId: modulePurchase.id });
      const moduleData = modulePurchase.addon_modules as any;
      return new Response(
        JSON.stringify({
          success: true,
          processed: true,
          alreadyActive: true,
          module: moduleData ? { id: moduleData.id, name: moduleData.name, slug: moduleData.slug } : null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get Asaas gateway config
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

    // Fetch payment details from Asaas
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

    // If we found a module_purchase record, activate it
    if (modulePurchase) {
      const moduleData = modulePurchase.addon_modules as any;

      // Check if already active in tenant_addon_subscriptions
      const { data: existingSub } = await supabase
        .from('tenant_addon_subscriptions')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .eq('addon_module_id', modulePurchase.addon_module_id)
        .in('status', ['active', 'trial'])
        .maybeSingle();

      if (existingSub) {
        logStep('Already active in subscriptions', { subscriptionId: existingSub.id });
        // Update purchase status to paid
        await supabase
          .from('module_purchases')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', modulePurchase.id);
          
        return new Response(
          JSON.stringify({
            success: true,
            processed: true,
            alreadyActive: true,
            module: moduleData ? { id: moduleData.id, name: moduleData.name, slug: moduleData.slug } : null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

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
        .eq('id', modulePurchase.id);

      // Create tenant_addon_subscriptions
      const { data: upserted, error: upsertError } = await supabase
        .from('tenant_addon_subscriptions')
        .upsert(
          {
            tenant_id: tenantId,
            addon_module_id: modulePurchase.addon_module_id,
            status: 'active',
            source: 'purchase',
            is_free: false,
            price_paid: Number(payment?.value ?? moduleData?.monthly_price ?? 0),
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
          module_id: modulePurchase.addon_module_id,
          module_slug: moduleData?.slug,
          module_name: moduleData?.name,
          asaas_payment_id: payment.id,
          asaas_status: paymentStatus,
          value: payment?.value,
          billingType: payment?.billingType,
          method: 'module_purchases_lookup',
        },
      });

      logStep('Module activated via module_purchases', { 
        tenantId, 
        moduleId: modulePurchase.addon_module_id, 
        subscriptionId: upserted?.id 
      });

      return new Response(
        JSON.stringify({
          success: true,
          processed: true,
          activated: true,
          module: moduleData ? { id: moduleData.id, name: moduleData.name, slug: moduleData.slug } : null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // No module_purchase found - this payment wasn't created by our system
    logStep('No module_purchase found for this payment', { paymentId });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Nenhuma compra de módulo encontrada para este pagamento',
        reason: 'no_purchase_record'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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
