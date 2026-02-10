/**
 * partner-tenant-signup - Creates a new tenant under a partner
 * 
 * Handles:
 * - Anti-fraud: validates plan belongs to partner
 * - Tenant creation with partner association
 * - User creation with admin role
 * - Subscription creation (trial or paid)
 * - Billing owner routing (platform vs partner gateway)
 * - Observability: logs events to operational_logs
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  partnerId: string;
  planId: string;
  tenantName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  businessCategory?: string;
}

type EventType = 'landing_view' | 'start_signup' | 'signup_created' | 'checkout_started' | 'checkout_failed' | 'subscribed';

async function logEvent(
  supabase: any,
  event: EventType,
  partnerId: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('operational_logs').insert({
      level: 'info',
      scope: 'partner_signup',
      message: event,
      partner_id: partnerId,
      metadata: { ...metadata, timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.warn('[partner-tenant-signup] Log event failed:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: SignupRequest = await req.json();
    const { partnerId, planId, tenantName, adminName, adminEmail, adminPassword, businessCategory } = body;

    console.log('[partner-tenant-signup] Starting signup for:', { partnerId, planId, tenantName, adminEmail });
    await logEvent(supabase, 'start_signup', partnerId, { planId, adminEmail });

    // Validate required fields
    if (!partnerId || !planId || !tenantName || !adminName || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios não preenchidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate partner exists and is active
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, max_tenants, is_active')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      console.error('[partner-tenant-signup] Partner not found:', partnerError);
      return new Response(
        JSON.stringify({ error: 'Parceiro não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!partner.is_active) {
      return new Response(
        JSON.stringify({ error: 'Parceiro inativo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check tenant limit
    const { count: tenantCount } = await supabase
      .from('partner_tenants')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId);

    if (tenantCount !== null && tenantCount >= partner.max_tenants) {
      return new Response(
        JSON.stringify({ error: 'Limite de estabelecimentos do parceiro atingido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan details - ANTI-FRAUD: validate plan belongs to this partner
    const { data: plan, error: planError } = await supabase
      .from('partner_plans')
      .select('*')
      .eq('id', planId)
      .eq('partner_id', partnerId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('[partner-tenant-signup] Plan not found or does not belong to partner:', planError);
      return new Response(
        JSON.stringify({ error: 'Plano inválido ou não pertence a este parceiro' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch billing policy
    const { data: partnerPolicy } = await supabase
      .from('partner_policies')
      .select('billing_owner, allow_partner_gateway')
      .eq('partner_id', partnerId)
      .maybeSingle();

    // Fallback to global policy if no partner-specific one
    let billingOwner = partnerPolicy?.billing_owner || 'platform';
    if (!partnerPolicy) {
      const { data: globalPolicy } = await supabase
        .from('partner_policies')
        .select('billing_owner')
        .is('partner_id', null)
        .maybeSingle();
      billingOwner = globalPolicy?.billing_owner || 'platform';
    }

    console.log('[partner-tenant-signup] Billing owner:', billingOwner);

    // If partner is billing owner, check gateway readiness
    let partnerGatewayReady = false;
    let partnerGateway: any = null;
    if (billingOwner === 'partner') {
      const { data: paymentAccount } = await supabase
        .from('partner_payment_accounts')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('status', 'active')
        .maybeSingle();

      partnerGateway = paymentAccount;
      partnerGatewayReady = !!paymentAccount?.api_key_encrypted;
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some((u: any) => u.email === adminEmail);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Este email já está cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        tenant_name: tenantName,
        partner_id: partnerId,
      }
    });

    if (authError || !authData.user) {
      console.error('[partner-tenant-signup] Auth error:', authError);
      await logEvent(supabase, 'checkout_failed', partnerId, { error: authError?.message, stage: 'user_creation' });
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário: ' + (authError?.message || 'Unknown') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('[partner-tenant-signup] User created:', userId);

    // Determine initial subscription status
    const hasTrial = plan.trial_days > 0;
    const isFree = plan.is_free;
    const needsPayment = !isFree && !hasTrial;

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        email: adminEmail,
        is_active: true,
        subscription_status: hasTrial ? 'trialing' : (isFree ? 'active' : 'pending'),
        subscription_plan: plan.slug,
        partner_id: partnerId,
        business_category: businessCategory || 'restaurant',
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      console.error('[partner-tenant-signup] Tenant creation error:', tenantError);
      await supabase.auth.admin.deleteUser(userId);
      await logEvent(supabase, 'checkout_failed', partnerId, { error: tenantError?.message, stage: 'tenant_creation' });
      return new Response(
        JSON.stringify({ error: 'Erro ao criar estabelecimento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[partner-tenant-signup] Tenant created:', tenant.id);

    // Create profile
    await supabase.from('profiles').insert({
      id: userId,
      full_name: adminName,
      tenant_id: tenant.id,
    });

    // Create user role (admin)
    await supabase.from('user_roles').insert({
      user_id: userId,
      tenant_id: tenant.id,
      role: 'admin',
    });

    // Create partner_tenant link
    const { error: ptError } = await supabase
      .from('partner_tenants')
      .insert({
        partner_id: partnerId,
        tenant_id: tenant.id,
        partner_plan_id: plan.id,
        status: 'active',
      });

    if (ptError) {
      console.error('[partner-tenant-signup] Partner tenant link error:', ptError);
    }

    // Calculate trial end date
    const trialEndsAt = hasTrial
      ? new Date(Date.now() + plan.trial_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create subscription record
    const subscriptionStatus = hasTrial ? 'trial' : (isFree ? 'active' : 'pending');
    
    const { data: subscription, error: subError } = await supabase
      .from('tenant_subscriptions')
      .insert({
        tenant_id: tenant.id,
        partner_plan_id: plan.id,
        billing_mode: billingOwner === 'partner' ? 'offline' : 'automatic',
        status: subscriptionStatus,
        trial_ends_at: trialEndsAt,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        monthly_amount: plan.monthly_price || 0,
        currency: 'BRL',
      })
      .select()
      .single();

    if (subError) {
      console.error('[partner-tenant-signup] Subscription creation error:', subError);
    }

    // Create headquarters store
    await supabase.from('stores').insert({
      tenant_id: tenant.id,
      name: 'Matriz',
      is_headquarters: true,
      is_active: true,
    });

    // Sync modules from plan
    if (plan.included_modules && plan.included_modules.length > 0) {
      for (const moduleSlug of plan.included_modules) {
        const { data: addonModule } = await supabase
          .from('addon_modules')
          .select('id')
          .eq('slug', moduleSlug)
          .single();

        if (addonModule) {
          await supabase.from('tenant_modules').insert({
            tenant_id: tenant.id,
            module_id: addonModule.id,
            status: 'active',
            is_manual_override: false,
          });
        }
      }
    }

    await logEvent(supabase, 'signup_created', partnerId, {
      tenantId: tenant.id,
      planId: plan.id,
      hasTrial,
      isFree,
      billingOwner,
    });

    // If plan requires payment (not free and no trial), generate checkout
    if (needsPayment) {
      // Route based on billing_owner
      if (billingOwner === 'platform') {
        // Platform handles billing - use platform's Asaas gateway
        const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
        
        if (asaasApiKey) {
          try {
            await logEvent(supabase, 'checkout_started', partnerId, { billingOwner: 'platform', tenantId: tenant.id });

            const checkoutResponse = await fetch(`${supabaseUrl}/functions/v1/partner-tenant-checkout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                subscriptionId: subscription?.id,
                tenantId: tenant.id,
                email: adminEmail,
                name: adminName,
                planName: plan.name,
                amount: plan.monthly_price,
              }),
            });

            const checkoutData = await checkoutResponse.json();

            if (checkoutData.paymentUrl) {
              return new Response(
                JSON.stringify({
                  success: true,
                  requiresPayment: true,
                  checkoutUrl: checkoutData.paymentUrl,
                  tenantId: tenant.id,
                  billingOwner: 'platform',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } catch (checkoutError) {
            console.error('[partner-tenant-signup] Platform checkout error:', checkoutError);
            await logEvent(supabase, 'checkout_failed', partnerId, { billingOwner: 'platform', error: String(checkoutError) });
          }
        }
      } else if (billingOwner === 'partner') {
        // Partner handles billing
        if (!partnerGatewayReady) {
          console.warn('[partner-tenant-signup] Partner gateway not ready, registering as lead');
          await logEvent(supabase, 'checkout_failed', partnerId, {
            billingOwner: 'partner',
            reason: 'gateway_not_configured',
            tenantId: tenant.id,
          });

          // Still create the tenant but mark as pending payment
          // The partner will handle billing offline
          return new Response(
            JSON.stringify({
              success: true,
              requiresPayment: false,
              pendingPartnerBilling: true,
              tenantId: tenant.id,
              message: 'Conta criada! O parceiro entrará em contato para configurar o pagamento.',
              billingOwner: 'partner',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Partner gateway is ready - use partner's credentials
        try {
          await logEvent(supabase, 'checkout_started', partnerId, { billingOwner: 'partner', tenantId: tenant.id });

          // Use partner's Asaas key for checkout
          const checkoutResponse = await fetch(`${supabaseUrl}/functions/v1/partner-tenant-checkout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              subscriptionId: subscription?.id,
              tenantId: tenant.id,
              email: adminEmail,
              name: adminName,
              planName: plan.name,
              amount: plan.monthly_price,
              partnerGatewayId: partnerGateway.id,
              usePartnerGateway: true,
            }),
          });

          const checkoutData = await checkoutResponse.json();

          if (checkoutData.paymentUrl) {
            return new Response(
              JSON.stringify({
                success: true,
                requiresPayment: true,
                checkoutUrl: checkoutData.paymentUrl,
                tenantId: tenant.id,
                billingOwner: 'partner',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (checkoutError) {
          console.error('[partner-tenant-signup] Partner checkout error:', checkoutError);
          await logEvent(supabase, 'checkout_failed', partnerId, { billingOwner: 'partner', error: String(checkoutError) });
          
          // Fallback: tenant created but payment pending
          return new Response(
            JSON.stringify({
              success: true,
              requiresPayment: false,
              pendingPartnerBilling: true,
              tenantId: tenant.id,
              message: 'Conta criada! O parceiro entrará em contato para configurar o pagamento.',
              billingOwner: 'partner',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.log('[partner-tenant-signup] Signup completed successfully');
    await logEvent(supabase, 'subscribed', partnerId, { tenantId: tenant.id, status: subscriptionStatus });

    return new Response(
      JSON.stringify({
        success: true,
        requiresPayment: false,
        tenantId: tenant.id,
        subscriptionId: subscription?.id,
        billingOwner,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[partner-tenant-signup] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
