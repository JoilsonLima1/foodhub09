/**
 * partner-tenant-signup - Creates a new tenant under a partner
 * 
 * Handles:
 * - Tenant creation with partner association
 * - User creation with admin role
 * - Subscription creation (trial or paid)
 * - Payment checkout via Asaas if needed
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

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('partner_plans')
      .select('*')
      .eq('id', planId)
      .eq('partner_id', partnerId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('[partner-tenant-signup] Plan not found:', planError);
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === adminEmail);
    
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
      email_confirm: true, // Auto-confirm for partner signups
      user_metadata: {
        full_name: adminName,
        tenant_name: tenantName,
        partner_id: partnerId,
      }
    });

    if (authError || !authData.user) {
      console.error('[partner-tenant-signup] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário: ' + (authError?.message || 'Unknown') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('[partner-tenant-signup] User created:', userId);

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        email: adminEmail,
        is_active: true,
        subscription_status: plan.trial_days > 0 ? 'trialing' : (plan.is_free ? 'active' : 'pending'),
        subscription_plan: plan.slug,
        partner_id: partnerId,
        business_category: businessCategory || 'restaurant',
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      console.error('[partner-tenant-signup] Tenant creation error:', tenantError);
      // Cleanup: delete the user we just created
      await supabase.auth.admin.deleteUser(userId);
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
    const trialEndsAt = plan.trial_days > 0
      ? new Date(Date.now() + plan.trial_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create subscription record
    const subscriptionStatus = plan.trial_days > 0 ? 'trial' : (plan.is_free ? 'active' : 'pending');
    
    const { data: subscription, error: subError } = await supabase
      .from('tenant_subscriptions')
      .insert({
        tenant_id: tenant.id,
        partner_plan_id: plan.id,
        status: subscriptionStatus,
        trial_ends_at: trialEndsAt,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

    // If plan requires payment (not free and no trial), generate checkout
    if (!plan.is_free && plan.trial_days === 0) {
      const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
      
      if (asaasApiKey) {
        try {
          // Call partner-tenant-checkout to generate payment link
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
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (checkoutError) {
          console.error('[partner-tenant-signup] Checkout error:', checkoutError);
          // Continue without payment - admin can handle manually
        }
      }
    }

    // Sync modules from plan
    if (plan.included_modules && plan.included_modules.length > 0) {
      for (const moduleSlug of plan.included_modules) {
        // Find module in catalog
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

    console.log('[partner-tenant-signup] Signup completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        requiresPayment: false,
        tenantId: tenant.id,
        subscriptionId: subscription?.id,
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
