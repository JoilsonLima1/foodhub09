import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create client with user's auth
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

    // Get requesting user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has admin or manager role
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, tenantId, userId, userData, userIds, roles: newRoles } = body;

    console.log(`[manage-users] Action: ${action}, TenantId: ${tenantId}`);

    switch (action) {
      case 'get-emails': {
        if (!userIds || !Array.isArray(userIds)) {
          return new Response(
            JSON.stringify({ error: 'userIds array required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const emails: Record<string, string> = {};
        
        for (const uid of userIds) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (userData?.user?.email) {
            emails[uid] = userData.user.email;
          }
        }

        return new Response(
          JSON.stringify({ emails }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (!tenantId || !userData) {
          return new Response(
            JSON.stringify({ error: 'tenantId and userData required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { email, password, full_name, phone, roles: userRolesToAdd } = userData;

        if (!email || !password || !full_name) {
          return new Response(
            JSON.stringify({ error: 'email, password and full_name are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create user in auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name }
        });

        if (createError) {
          console.error('[manage-users] Create user error:', createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const newUserId = newUser.user.id;

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: newUserId,
            full_name,
            phone: phone || null,
            tenant_id: tenantId,
            is_active: true,
          });

        if (profileError) {
          console.error('[manage-users] Profile error:', profileError);
          // Rollback: delete auth user
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
          return new Response(
            JSON.stringify({ error: 'Failed to create profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add roles
        if (userRolesToAdd && userRolesToAdd.length > 0) {
          const roleInserts = userRolesToAdd.map((role: string) => ({
            user_id: newUserId,
            role,
            tenant_id: tenantId,
          }));

          const { error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .insert(roleInserts);

          if (rolesError) {
            console.error('[manage-users] Roles error:', rolesError);
          }
        }

        console.log(`[manage-users] User created: ${newUserId}`);

        return new Response(
          JSON.stringify({ success: true, userId: newUserId }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-roles': {
        if (!tenantId || !userId || !newRoles) {
          return new Response(
            JSON.stringify({ error: 'tenantId, userId and roles required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete existing roles for this user in this tenant
        const { error: deleteError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('tenant_id', tenantId);

        if (deleteError) {
          console.error('[manage-users] Delete roles error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to update roles' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Insert new roles
        if (newRoles.length > 0) {
          const roleInserts = newRoles.map((role: string) => ({
            user_id: userId,
            role,
            tenant_id: tenantId,
          }));

          const { error: insertError } = await supabaseAdmin
            .from('user_roles')
            .insert(roleInserts);

          if (insertError) {
            console.error('[manage-users] Insert roles error:', insertError);
            return new Response(
              JSON.stringify({ error: 'Failed to add new roles' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log(`[manage-users] Roles updated for user: ${userId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!tenantId || !userId) {
          return new Response(
            JSON.stringify({ error: 'tenantId and userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent self-deletion
        if (userId === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete roles first
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('tenant_id', tenantId);

        // Delete profile
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', userId)
          .eq('tenant_id', tenantId);

        // Delete auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error('[manage-users] Delete auth user error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[manage-users] User deleted: ${userId}`);

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
    console.error('[manage-users] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
