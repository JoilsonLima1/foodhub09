/**
 * partner-tenant-signup - Creates a new tenant under a partner
 * 
 * Returns a structured payload with next_action:
 * - REDIRECT_DASHBOARD: trial/free → go to dashboard
 * - REDIRECT_CHECKOUT: payment required → redirect to checkout URL
 * - PENDING_BILLING: partner gateway not configured → show pending screen
 * - ERROR: something failed
 * 
 * Idempotency: checks for existing user/subscription before creating.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

interface SignupResponse {
  ok: boolean;
  tenant_id?: string;
  user_id?: string;
  partner_id?: string;
  plan_id?: string;
  billing_owner?: 'platform' | 'partner';
  trial_days?: number;
  next_action: 'REDIRECT_DASHBOARD' | 'REDIRECT_CHECKOUT' | 'PENDING_BILLING' | 'ERROR';
  checkout_url?: string;
  pending_reason?: string;
  error?: string;
  correlation_id?: string;
}

function generateCorrelationId(): string {
  return `ps_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

async function logEvent(
  supabase: any,
  message: string,
  partnerId: string,
  correlationId: string,
  tenantId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('operational_logs').insert({
      level: 'info',
      scope: 'partner_signup',
      message,
      partner_id: partnerId,
      tenant_id: tenantId || null,
      correlation_id: correlationId,
      metadata: { ...metadata, timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.warn('[partner-tenant-signup] Log event failed:', e);
  }
}

function errorResponse(error: string, correlationId: string, status = 400): Response {
  const body: SignupResponse = {
    ok: false,
    next_action: 'ERROR',
    error,
    correlation_id: correlationId,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function successResponse(data: Omit<SignupResponse, 'ok'>): Response {
  const body: SignupResponse = { ok: true, ...data };
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const correlationId = generateCorrelationId();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: SignupRequest = await req.json();
    const { partnerId, planId, tenantName, adminName, adminEmail, adminPassword, businessCategory } = body;

    console.log('[partner-tenant-signup] Starting:', { partnerId, planId, adminEmail, correlationId });
    await logEvent(supabase, 'start_signup', partnerId, correlationId, undefined, { planId, adminEmail });

    // ── Validate required fields ──
    if (!partnerId || !planId || !tenantName || !adminName || !adminEmail || !adminPassword) {
      return errorResponse('Campos obrigatórios não preenchidos', correlationId);
    }

    // ── Validate partner ──
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, max_tenants, is_active, is_suspended')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      return errorResponse('Parceiro não encontrado', correlationId, 404);
    }
    if (!partner.is_active || partner.is_suspended) {
      return errorResponse('Parceiro inativo', correlationId);
    }

    // ── Check tenant limit ──
    const { count: tenantCount } = await supabase
      .from('partner_tenants')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId);

    if (tenantCount !== null && tenantCount >= partner.max_tenants) {
      return errorResponse('Limite de estabelecimentos do parceiro atingido', correlationId);
    }

    // ── Validate plan belongs to partner (anti-fraud) ──
    const { data: plan, error: planError } = await supabase
      .from('partner_plans')
      .select('*')
      .eq('id', planId)
      .eq('partner_id', partnerId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return errorResponse('Plano inválido ou não pertence a este parceiro', correlationId);
    }

    // ── Resolve billing policy ──
    const { data: partnerPolicy } = await supabase
      .from('partner_policies')
      .select('billing_owner, allow_partner_gateway')
      .eq('partner_id', partnerId)
      .maybeSingle();

    let billingOwner: 'platform' | 'partner' = (partnerPolicy?.billing_owner as any) || 'platform';
    if (!partnerPolicy) {
      const { data: globalPolicy } = await supabase
        .from('partner_policies')
        .select('billing_owner')
        .is('partner_id', null)
        .maybeSingle();
      billingOwner = (globalPolicy?.billing_owner as any) || 'platform';
    }

    // ── Check partner gateway readiness ──
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

    const hasTrial = (plan.trial_days || 0) > 0;
    const isFree = !!plan.is_free;
    const needsPayment = !isFree && !hasTrial;

    console.log('[partner-tenant-signup] Billing:', { billingOwner, hasTrial, isFree, needsPayment, partnerGatewayReady, correlationId });

    // ── Check if email already exists ──
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === adminEmail);

    let userId: string;
    let tenantId: string;
    let subscriptionId: string | null = null;

    if (existingUser) {
      // ── Idempotency: user already exists ──
      userId = existingUser.id;

      // Check if they already have a tenant linked to this partner+plan
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile?.tenant_id) {
        // Check if subscription already exists for this tenant
        const { data: existingSub } = await supabase
          .from('tenant_subscriptions')
          .select('id, status')
          .eq('tenant_id', existingProfile.tenant_id)
          .eq('partner_plan_id', planId)
          .in('status', ['active', 'trial', 'trialing', 'pending'])
          .maybeSingle();

        if (existingSub) {
          console.log('[partner-tenant-signup] Idempotent: existing subscription found:', existingSub.id);
          tenantId = existingProfile.tenant_id;
          subscriptionId = existingSub.id;

          // Return based on existing state
          if (existingSub.status === 'trial' || existingSub.status === 'trialing' || isFree) {
            return successResponse({
              next_action: 'REDIRECT_DASHBOARD',
              tenant_id: tenantId,
              user_id: userId,
              partner_id: partnerId,
              plan_id: planId,
              billing_owner: billingOwner,
              trial_days: plan.trial_days || 0,
              correlation_id: correlationId,
            });
          }
          if (existingSub.status === 'pending') {
            // Still pending - try to generate checkout again or show pending
            // Fall through to checkout generation below
            tenantId = existingProfile.tenant_id;
          }
        } else {
          tenantId = existingProfile.tenant_id;
        }
      }

      // If user exists but no matching subscription found, return error
      if (!existingProfile?.tenant_id) {
        return errorResponse('Este email já está cadastrado', correlationId);
      }

      tenantId = existingProfile.tenant_id;
    } else {
      // ── Create user ──
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
        await logEvent(supabase, 'signup_error', partnerId, correlationId, undefined, { error: authError?.message, stage: 'user_creation' });
        return errorResponse('Erro ao criar usuário: ' + (authError?.message || 'Unknown'), correlationId, 500);
      }

      userId = authData.user.id;
      console.log('[partner-tenant-signup] User created:', userId);

      // ── Create tenant ──
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
        await logEvent(supabase, 'signup_error', partnerId, correlationId, undefined, { error: tenantError?.message, stage: 'tenant_creation' });
        return errorResponse('Erro ao criar estabelecimento', correlationId, 500);
      }

      tenantId = tenant.id;
      console.log('[partner-tenant-signup] Tenant created:', tenantId);

      // ── Create profile, role, partner link, store ──
      await Promise.all([
        supabase.from('profiles').insert({ id: userId, full_name: adminName, tenant_id: tenantId }),
        supabase.from('user_roles').insert({ user_id: userId, tenant_id: tenantId, role: 'admin' }),
        supabase.from('partner_tenants').insert({
          partner_id: partnerId,
          tenant_id: tenantId,
          partner_plan_id: plan.id,
          status: 'active',
        }),
        supabase.from('stores').insert({
          tenant_id: tenantId,
          name: 'Matriz',
          is_headquarters: true,
          is_active: true,
        }),
      ]);

      // ── Sync modules from plan ──
      if (plan.included_modules && plan.included_modules.length > 0) {
        for (const moduleSlug of plan.included_modules) {
          const { data: addonModule } = await supabase
            .from('addon_modules')
            .select('id')
            .eq('slug', moduleSlug)
            .single();
          if (addonModule) {
            await supabase.from('tenant_modules').insert({
              tenant_id: tenantId,
              module_id: addonModule.id,
              status: 'active',
              is_manual_override: false,
            });
          }
        }
      }

      // ── Create subscription (idempotent: only if not already existing) ──
      const { data: existingSubCheck } = await supabase
        .from('tenant_subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('partner_plan_id', planId)
        .maybeSingle();

      if (!existingSubCheck) {
        const trialEndsAt = hasTrial
          ? new Date(Date.now() + plan.trial_days * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const subscriptionStatus = hasTrial ? 'trial' : (isFree ? 'active' : 'pending');

        const { data: sub } = await supabase
          .from('tenant_subscriptions')
          .insert({
            tenant_id: tenantId,
            partner_plan_id: plan.id,
            billing_mode: billingOwner === 'partner' ? 'offline' : 'automatic',
            status: subscriptionStatus,
            trial_ends_at: trialEndsAt,
            trial_starts_at: hasTrial ? new Date().toISOString() : null,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            monthly_amount: plan.monthly_price || 0,
            currency: 'BRL',
          })
          .select()
          .single();

        subscriptionId = sub?.id || null;
        await logEvent(supabase, 'subscription_created', partnerId, correlationId, tenantId, {
          subscriptionId,
          status: subscriptionStatus,
          hasTrial,
          isFree,
        });
      } else {
        subscriptionId = existingSubCheck.id;
      }
    }

    await logEvent(supabase, 'tenant_created', partnerId, correlationId, tenantId, {
      userId,
      planId,
      billingOwner,
    });

    // ── Determine next_action ──

    // Case 1: Free plan or trial → dashboard
    if (isFree || hasTrial) {
      await logEvent(supabase, 'signup_complete_dashboard', partnerId, correlationId, tenantId, {
        reason: isFree ? 'free_plan' : 'trial_active',
      });
      return successResponse({
        next_action: 'REDIRECT_DASHBOARD',
        tenant_id: tenantId,
        user_id: userId,
        partner_id: partnerId,
        plan_id: planId,
        billing_owner: billingOwner,
        trial_days: plan.trial_days || 0,
        correlation_id: correlationId,
      });
    }

    // Case 2: Needs payment
    // Case 2a: Partner billing but gateway not ready
    if (billingOwner === 'partner' && !partnerGatewayReady) {
      await logEvent(supabase, 'pending_billing', partnerId, correlationId, tenantId, {
        reason: 'gateway_not_configured',
      });
      return successResponse({
        next_action: 'PENDING_BILLING',
        tenant_id: tenantId,
        user_id: userId,
        partner_id: partnerId,
        plan_id: planId,
        billing_owner: billingOwner,
        trial_days: 0,
        pending_reason: 'gateway_not_configured',
        correlation_id: correlationId,
      });
    }

    // Case 2b/2c: Generate checkout
    try {
      await logEvent(supabase, 'checkout_started', partnerId, correlationId, tenantId, {
        billingOwner,
      });

      const checkoutPayload: Record<string, unknown> = {
        subscriptionId,
        tenantId,
        email: adminEmail,
        name: adminName,
        planName: plan.name,
        amount: plan.monthly_price,
      };

      if (billingOwner === 'partner' && partnerGateway) {
        checkoutPayload.partnerGatewayId = partnerGateway.id;
        checkoutPayload.usePartnerGateway = true;
      }

      const checkoutResponse = await fetch(`${supabaseUrl}/functions/v1/partner-tenant-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const checkoutData = await checkoutResponse.json();

      if (checkoutData.paymentUrl) {
        await logEvent(supabase, 'checkout_created', partnerId, correlationId, tenantId, {
          checkoutUrl: checkoutData.paymentUrl,
          billingOwner,
        });

        return successResponse({
          next_action: 'REDIRECT_CHECKOUT',
          checkout_url: checkoutData.paymentUrl,
          tenant_id: tenantId,
          user_id: userId,
          partner_id: partnerId,
          plan_id: planId,
          billing_owner: billingOwner,
          trial_days: 0,
          correlation_id: correlationId,
        });
      }

      // Checkout call succeeded but no URL - treat as pending
      console.warn('[partner-tenant-signup] Checkout returned no paymentUrl:', checkoutData);
      await logEvent(supabase, 'checkout_no_url', partnerId, correlationId, tenantId, {
        checkoutData,
        billingOwner,
      });

    } catch (checkoutError) {
      console.error('[partner-tenant-signup] Checkout error:', checkoutError);
      await logEvent(supabase, 'checkout_failed', partnerId, correlationId, tenantId, {
        error: String(checkoutError),
        billingOwner,
      });
    }

    // Fallback: checkout failed or no URL - pending billing
    return successResponse({
      next_action: 'PENDING_BILLING',
      tenant_id: tenantId,
      user_id: userId,
      partner_id: partnerId,
      plan_id: planId,
      billing_owner: billingOwner,
      trial_days: 0,
      pending_reason: 'checkout_unavailable',
      correlation_id: correlationId,
    });

  } catch (error) {
    console.error('[partner-tenant-signup] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        next_action: 'ERROR',
        error: 'Erro interno do servidor',
        correlation_id: correlationId,
      } satisfies SignupResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
