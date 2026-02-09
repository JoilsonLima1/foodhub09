import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Use getClaims for more robust token validation
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('[manage-organizations] Token validation failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };

    // Verify super_admin role
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('[manage-organizations] rolesError:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = (roles ?? []).some((r: any) => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Super admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, organizationId, organizationData, password, userId, profileId } = body;

    console.log(`[manage-organizations] Action: ${action}, OrgId: ${organizationId || 'N/A'}`);

    switch (action) {
      case 'list': {
        const { data: tenants, error: tenantsError } = await supabaseAdmin
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false });

        if (tenantsError) {
          console.error('[manage-organizations] tenantsError:', tenantsError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch organizations' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user counts for each tenant
        const tenantIds = tenants?.map(t => t.id) || [];
        const orgStats: Record<string, { userCount: number }> = {};

        for (const tenantId of tenantIds) {
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
          
          orgStats[tenantId] = { userCount: count || 0 };
        }

        const organizations = tenants?.map(t => ({
          ...t,
          user_count: orgStats[t.id]?.userCount || 0,
        })) || [];

        return new Response(
          JSON.stringify({ organizations }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-orphans': {
        console.log('[manage-organizations] Fetching orphan data...');
        
        // Get all auth users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) {
          console.error('[manage-organizations] authError:', authError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch auth users' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const authUsers = authData?.users || [];
        const orphanUsers: any[] = [];

        // Check each auth user for orphan status
        for (const authUser of authUsers) {
          // Skip the current super admin
          if (authUser.id === user.id) continue;

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, tenant_id')
            .eq('user_id', authUser.id)
            .maybeSingle();

          const { data: userRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', authUser.id);

          const hasProfile = !!profile;
          const hasRoles = (userRoles?.length || 0) > 0;
          const hasTenant = !!profile?.tenant_id;

          // User is orphan if: no profile OR (no roles AND no tenant)
          if (!hasProfile || (!hasRoles && !hasTenant)) {
            orphanUsers.push({
              id: authUser.id,
              email: authUser.email,
              created_at: authUser.created_at,
              has_profile: hasProfile,
              has_roles: hasRoles,
              tenant_name: null,
            });
          }
        }

        // Get profiles without tenant (orphan profiles)
        const { data: orphanProfilesData } = await supabaseAdmin
          .from('profiles')
          .select('id, user_id, full_name, created_at')
          .is('tenant_id', null);

        const orphanProfiles: any[] = [];
        for (const profile of orphanProfilesData || []) {
          // Skip profiles for super admins
          const { data: profileRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          const isSuperAdminProfile = (profileRoles ?? []).some((r: any) => r.role === 'super_admin');
          if (isSuperAdminProfile) continue;

          // Get email from auth
          const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
          
          orphanProfiles.push({
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: authUserData?.user?.email || 'unknown',
            created_at: profile.created_at,
          });
        }

        console.log(`[manage-organizations] Found ${orphanUsers.length} orphan users, ${orphanProfiles.length} orphan profiles`);

        return new Response(
          JSON.stringify({ orphanUsers, orphanProfiles }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-orphan-user': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!password) {
          return new Response(
            JSON.stringify({ error: 'Password confirmation required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify password
        const userEmail = user.email;
        if (!userEmail) {
          return new Response(
            JSON.stringify({ error: 'User email not found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });

        if (signInError) {
          return new Response(
            JSON.stringify({ error: 'Senha incorreta. Operação cancelada.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is super_admin
        const { data: targetRoles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const isTargetSuperAdmin = (targetRoles ?? []).some((r: any) => r.role === 'super_admin');
        if (isTargetSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Não é possível excluir um super admin' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete user_roles
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        
        // Delete profiles
        await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
        
        // Delete auth user
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          console.log(`[manage-organizations] Deleted orphan auth user: ${userId}`);
        } catch (e) {
          console.log(`[manage-organizations] Could not delete auth user ${userId}:`, e);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-orphan-profile': {
        if (!profileId) {
          return new Response(
            JSON.stringify({ error: 'profileId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!password) {
          return new Response(
            JSON.stringify({ error: 'Password confirmation required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify password
        const userEmail = user.email;
        if (!userEmail) {
          return new Response(
            JSON.stringify({ error: 'User email not found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });

        if (signInError) {
          return new Response(
            JSON.stringify({ error: 'Senha incorreta. Operação cancelada.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get profile to find user_id
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('id', profileId)
          .single();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: 'Profile not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if target is super_admin
        const { data: targetRoles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.user_id);

        const isTargetSuperAdmin = (targetRoles ?? []).some((r: any) => r.role === 'super_admin');
        if (isTargetSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Não é possível excluir perfil de um super admin' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete user_roles
        await supabaseAdmin.from('user_roles').delete().eq('user_id', profile.user_id);
        
        // Delete profile
        await supabaseAdmin.from('profiles').delete().eq('id', profileId);
        
        // Delete auth user
        try {
          await supabaseAdmin.auth.admin.deleteUser(profile.user_id);
          console.log(`[manage-organizations] Deleted orphan profile and user: ${profileId}`);
        } catch (e) {
          console.log(`[manage-organizations] Could not delete auth user:`, e);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-all-orphan-users': {
        if (!password) {
          return new Response(
            JSON.stringify({ error: 'Password confirmation required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify password
        const userEmail = user.email;
        if (!userEmail) {
          return new Response(
            JSON.stringify({ error: 'User email not found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });

        if (signInError) {
          return new Response(
            JSON.stringify({ error: 'Senha incorreta. Operação cancelada.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all auth users
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
        const authUsers = authData?.users || [];
        let deletedCount = 0;

        for (const authUser of authUsers) {
          // Skip the current super admin
          if (authUser.id === user.id) continue;

          // Check if super_admin
          const { data: targetRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', authUser.id);

          const isTargetSuperAdmin = (targetRoles ?? []).some((r: any) => r.role === 'super_admin');
          if (isTargetSuperAdmin) continue;

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, tenant_id')
            .eq('user_id', authUser.id)
            .maybeSingle();

          const hasProfile = !!profile;
          const hasRoles = (targetRoles?.length || 0) > 0;
          const hasTenant = !!profile?.tenant_id;

          // User is orphan if: no profile OR (no roles AND no tenant)
          if (!hasProfile || (!hasRoles && !hasTenant)) {
            await supabaseAdmin.from('user_roles').delete().eq('user_id', authUser.id);
            await supabaseAdmin.from('profiles').delete().eq('user_id', authUser.id);
            
            try {
              await supabaseAdmin.auth.admin.deleteUser(authUser.id);
              deletedCount++;
              console.log(`[manage-organizations] Deleted orphan user: ${authUser.email}`);
            } catch (e) {
              console.log(`[manage-organizations] Could not delete auth user ${authUser.id}:`, e);
            }
          }
        }

        console.log(`[manage-organizations] Deleted ${deletedCount} orphan users`);

        return new Response(
          JSON.stringify({ success: true, deletedCount }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!organizationId || !organizationData) {
          return new Response(
            JSON.stringify({ error: 'organizationId and organizationData required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const allowed: Record<string, any> = {};
        const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'is_active', 'subscription_status'];
        
        for (const field of allowedFields) {
          if (field in organizationData) {
            allowed[field] = organizationData[field];
          }
        }

        const { error: updateError } = await supabaseAdmin
          .from('tenants')
          .update(allowed)
          .eq('id', organizationId);

        if (updateError) {
          console.error('[manage-organizations] updateError:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update organization' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[manage-organizations] Organization updated: ${organizationId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle-status': {
        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: 'organizationId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get current status
        const { data: org, error: orgError } = await supabaseAdmin
          .from('tenants')
          .select('is_active')
          .eq('id', organizationId)
          .single();

        if (orgError) {
          console.error('[manage-organizations] orgError:', orgError);
          return new Response(
            JSON.stringify({ error: 'Organization not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const newStatus = !org.is_active;

        const { error: updateError } = await supabaseAdmin
          .from('tenants')
          .update({ is_active: newStatus })
          .eq('id', organizationId);

        if (updateError) {
          console.error('[manage-organizations] toggleError:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to toggle status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[manage-organizations] Organization ${organizationId} status toggled to ${newStatus}`);

        return new Response(
          JSON.stringify({ success: true, is_active: newStatus }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-permanent': {
        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: 'organizationId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!password) {
          return new Response(
            JSON.stringify({ error: 'Password confirmation required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify password by attempting to sign in
        const userEmail = user.email;
        if (!userEmail) {
          return new Response(
            JSON.stringify({ error: 'User email not found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });

        if (signInError) {
          console.error('[manage-organizations] Password verification failed:', signInError.message);
          return new Response(
            JSON.stringify({ error: 'Senha incorreta. Operação cancelada.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // =========================================================================
        // CRITICAL SECURITY CHECK: Prevent super admin from deleting their own org
        // =========================================================================
        const { data: currentUserProfile } = await supabaseAdmin
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (currentUserProfile?.tenant_id === organizationId) {
          console.error('[manage-organizations] BLOCKED: Super admin attempted to delete their own organization');
          return new Response(
            JSON.stringify({ 
              error: 'Você não pode excluir sua própria organização. Para isso, transfira seu usuário para outra organização primeiro.' 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[manage-organizations] Starting permanent deletion of organization: ${organizationId}`);

        // Get all users from this organization
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('tenant_id', organizationId);

        const userIds = profiles?.map(p => p.user_id) || [];

        // =========================================================================
        // SAFETY: Filter out super_admin users - they should NEVER be deleted
        // =========================================================================
        const safeUserIds: string[] = [];
        const protectedUsers: string[] = [];

        for (const uid of userIds) {
          const { data: userRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', uid);

          const hasSuperAdmin = (userRoles ?? []).some((r: any) => r.role === 'super_admin');
          
          if (hasSuperAdmin) {
            protectedUsers.push(uid);
            console.log(`[manage-organizations] PROTECTED: Super admin user ${uid} will NOT be deleted`);
          } else {
            safeUserIds.push(uid);
          }
        }

        // Delete in order to respect foreign keys
        // 1. Delete user_roles for SAFE users only (not super admins)
        for (const uid of safeUserIds) {
          await supabaseAdmin.from('user_roles').delete().eq('user_id', uid);
        }

        // 2. Delete profiles for SAFE users only
        for (const uid of safeUserIds) {
          await supabaseAdmin.from('profiles').delete().eq('user_id', uid);
        }

        // If there are protected super admin users, move them to a different tenant or orphan them
        if (protectedUsers.length > 0) {
          console.log(`[manage-organizations] Orphaning ${protectedUsers.length} super admin profile(s) from deleted org`);
          for (const uid of protectedUsers) {
            // Set tenant_id to NULL - super admin will need to be reassigned
            await supabaseAdmin
              .from('profiles')
              .update({ tenant_id: null })
              .eq('user_id', uid);
          }
        }

        // 3. Delete related data (order by dependency)
        // Comprehensive list of all tables with tenant_id FK to tenants
        // Order matters: child tables first, then parent tables
        const tablesToClean = [
          // Comanda sub-tables
          'comanda_payments',
          'comanda_orders',
          'comanda_participants',
          'comanda_history',
          'comandas',
          // Order sub-tables
          'order_item_addons',
          'order_items',
          'order_status_history',
          'kitchen_order_items',
          // Payment / financial
          'payments',
          'payment_machine_records',
          'payment_events',
          'apply_queue', // references payment_events
          'plan_change_prorations',
          'ledger_entries',
          'coupon_redemptions',
          // Deliveries
          'deliveries',
          // Orders (after sub-tables)
          'orders',
          // Stock
          'stock_movements',
          'stock_entries',
          // Recipes
          'recipe_items',
          'recipes',
          // Products
          'product_addon_mapping',
          'product_addons',
          'product_variations',
          'products',
          // iFood
          'ifood_menu_mapping',
          'ifood_orders',
          'ifood_logs',
          'ifood_integrations',
          // Marketplace
          'marketplace_orders',
          'marketplace_logs',
          'marketplace_integrations',
          // Categories & ingredients
          'categories',
          'ingredients',
          // Delivery
          'couriers',
          'delivery_zones',
          'coupons',
          // Customer
          'customer_registrations',
          'exit_validations',
          // Sales & goals
          'sales_goals',
          'goal_notifications_sent',
          'sales_forecast_history',
          // Cash
          'cash_movements',
          'cash_registers',
          // Kitchen
          'kitchen_stations',
          'kitchen_display_config',
          // Loyalty
          'loyalty_transactions',
          'loyalty_customers',
          'loyalty_config',
          // Dispatcher
          'dispatcher_messages',
          'dispatcher_triggers',
          'dispatcher_config',
          'caller_id_config',
          'call_logs',
          // Mobile
          'mobile_sessions',
          'mobile_command_config',
          // Service calls
          'service_calls',
          // SMS
          'sms_campaigns',
          // Notifications
          'notification_outbox',
          'billing_notifications',
          // Operational
          'operational_alerts',
          'ops_recommendations',
          'disputes',
          'fraud_flags',
          // Modules - IMPORTANT: tenant_addon_subscriptions has a DELETE trigger
          // that inserts into tenant_module_audit, so delete audit AFTER subscriptions
          'tenant_addon_subscriptions',
          'tenant_module_audit',
          'tenant_module_usage',
          'module_purchases',
          'partner_tenant_addon_subscriptions',
          'tenant_entitlements',
          // Partner / billing
          'partner_earnings',
          'partner_invoices',
          'partner_tenants',
          // Tenant billing
          'tenant_billing_profiles',
          'tenant_fee_overrides',
          'tenant_pending_coupons',
          'tenant_service_config',
          // Domains & SEO
          'organization_domains',
          'marketing_seo_audit_history',
          'marketing_seo_pages',
          'marketing_seo_reports',
          'marketing_seo_settings',
          // Password panel
          'password_queue',
          'password_panel_config',
          // Consent & compliance
          'consent_records',
          'data_subject_requests',
          'payment_terms_acceptance',
          'sensitive_actions_log',
          // SMS
          'sms_messages',
          'sms_config',
          // TEF
          'tef_transactions',
          'tef_config',
          // Tables & sessions
          'table_sessions',
          // Waiter
          'waiter_commissions',
          'waiter_commission_config',
          'waiter_performance',
          // Misc
          'suggestions',
          'suppliers',
          'tickets',
          'trial_events',
          'upsell_events',
          'usage_enforcement_log',
          'subscription_cycles',
          'tenant_subscriptions',
          // Events
          'events',
          // Logs & audit
          'audit_logs',
          'duplicate_alerts',
          // Tenant-level config/invoices
          'tenant_invoices',
          'subscriptions',
          // User roles for this tenant's users
          // user_roles already cleaned per-user above
          // Stores
          'tables',
          'store_user_access',
          'stores',
        ];

        for (const table of tablesToClean) {
          try {
            await supabaseAdmin.from(table).delete().eq('tenant_id', organizationId);
            console.log(`[manage-organizations] Cleaned table: ${table}`);
          } catch (e) {
            console.log(`[manage-organizations] Could not clean ${table}:`, e);
          }
        }

        // 4. Delete the tenant itself
        const { error: deleteTenantError } = await supabaseAdmin
          .from('tenants')
          .delete()
          .eq('id', organizationId);

        if (deleteTenantError) {
          console.error('[manage-organizations] deleteTenantError:', deleteTenantError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete organization' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 5. Delete auth users (ONLY safe users, never super admins)
        for (const uid of safeUserIds) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(uid);
            console.log(`[manage-organizations] Deleted auth user: ${uid}`);
          } catch (e) {
            console.log(`[manage-organizations] Could not delete auth user ${uid}:`, e);
          }
        }

        console.log(`[manage-organizations] Organization permanently deleted: ${organizationId}`);
        console.log(`[manage-organizations] Deleted ${safeUserIds.length} users, protected ${protectedUsers.length} super admins`);

        return new Response(
          JSON.stringify({ 
            success: true,
            deletedUsers: safeUserIds.length,
            protectedSuperAdmins: protectedUsers.length
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[manage-organizations] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
