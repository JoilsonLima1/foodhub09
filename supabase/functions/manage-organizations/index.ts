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
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const { action, organizationId, organizationData, password } = body;

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

        console.log(`[manage-organizations] Starting permanent deletion of organization: ${organizationId}`);

        // Get all users from this organization
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('tenant_id', organizationId);

        const userIds = profiles?.map(p => p.user_id) || [];

        // Delete in order to respect foreign keys
        // 1. Delete user_roles for users in this org
        for (const uid of userIds) {
          await supabaseAdmin.from('user_roles').delete().eq('user_id', uid);
        }

        // 2. Delete profiles
        await supabaseAdmin.from('profiles').delete().eq('tenant_id', organizationId);

        // 3. Delete related data (order by dependency)
        const tablesToClean = [
          'order_item_addons',
          'order_items',
          'order_status_history',
          'payments',
          'payment_machine_records',
          'deliveries',
          'orders',
          'stock_movements',
          'stock_entries',
          'recipe_items',
          'recipes',
          'product_addon_mapping',
          'product_addons',
          'product_variations',
          'ifood_menu_mapping',
          'ifood_orders',
          'ifood_logs',
          'ifood_integrations',
          'products',
          'categories',
          'ingredients',
          'couriers',
          'delivery_zones',
          'coupons',
          'sales_goals',
          'goal_notifications_sent',
          'sales_forecast_history',
          'cash_movements',
          'cash_registers',
          'audit_logs',
          'duplicate_alerts',
          'subscriptions',
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

        // 5. Delete auth users
        for (const uid of userIds) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(uid);
            console.log(`[manage-organizations] Deleted auth user: ${uid}`);
          } catch (e) {
            console.log(`[manage-organizations] Could not delete auth user ${uid}:`, e);
          }
        }

        console.log(`[manage-organizations] Organization permanently deleted: ${organizationId}`);

        return new Response(
          JSON.stringify({ success: true }),
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
