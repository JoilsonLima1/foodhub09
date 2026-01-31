import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  // Must include all headers used by the web client to avoid CORS preflight failures
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

    const body = await req.json();
    const { action, tenantId, userId, userData, userIds, roles: newRoles, profileData, storeIds } = body;

    console.log(`[manage-users] Action: ${action}, TenantId: ${tenantId}, UserId: ${userId || 'N/A'}`);
    // Never log raw passwords or sensitive data
    const safeBody = {
      ...body,
      userData: userData
        ? { ...userData, password: userData.password ? '[REDACTED]' : undefined }
        : undefined,
    };
    console.log(`[manage-users] Body:`, JSON.stringify(safeBody, null, 2));

    // Resolve requester tenant id (used to prevent tenant spoofing and enforce isolation)
    const { data: requesterProfile, error: requesterProfileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (requesterProfileError) {
      console.error('[manage-users] requesterProfileError:', requesterProfileError);
    }

    const requesterTenantId = requesterProfile?.tenant_id ?? null;

    // Verify permissions (tenant-scoped). super_admin is treated as global.
    const { data: allRoles, error: rolesFetchError } = await supabaseAdmin
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id);

    if (rolesFetchError) {
      console.error('[manage-users] rolesFetchError:', rolesFetchError);
      return new Response(
        JSON.stringify({ error: 'Falha ao validar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = (allRoles ?? []).some((r: any) => r.role === 'super_admin');
    const tenantScopedRoles = (allRoles ?? [])
      .filter((r: any) => requesterTenantId && r.tenant_id === requesterTenantId)
      .map((r: any) => r.role);

    const canManageUsers = isSuperAdmin || tenantScopedRoles.includes('admin') || tenantScopedRoles.includes('manager');

    if (!canManageUsers) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Super admins can act on the tenantId provided; others are locked to their own tenant.
    const effectiveTenantId = isSuperAdmin
      ? (tenantId || requesterTenantId)
      : requesterTenantId;

    if (!effectiveTenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant não encontrado para o usuário autenticado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent non-super-admin from spoofing tenantId
    if (!isSuperAdmin && tenantId && tenantId !== effectiveTenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant inválido' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'list-all-users': {
        // Only super_admin can list all users across all tenants
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas Super Admins podem listar todos os usuários' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch all profiles with tenant info
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, user_id, full_name, phone, avatar_url, is_active, created_at, tenant_id')
          .order('created_at', { ascending: false });

        if (profilesError) {
          console.error('[manage-users] list-all-users profilesError:', profilesError);
          return new Response(
            JSON.stringify({ error: 'Falha ao carregar perfis' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!profiles || profiles.length === 0) {
          return new Response(
            JSON.stringify({ users: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const ids = profiles.map(p => p.user_id);
        const tenantIds = [...new Set(profiles.map(p => p.tenant_id).filter(Boolean))];

        // Fetch tenant names
        const { data: tenants } = await supabaseAdmin
          .from('tenants')
          .select('id, name')
          .in('id', tenantIds);

        const tenantMap: Record<string, string> = {};
        (tenants || []).forEach((t: any) => {
          tenantMap[t.id] = t.name;
        });

        // Fetch all roles for these users
        const { data: allRolesData, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('user_id, role, tenant_id')
          .in('user_id', ids);

        if (rolesError) {
          console.error('[manage-users] list-all-users rolesError:', rolesError);
        }

        const rolesByUser: Record<string, string[]> = {};
        (allRolesData || []).forEach((r: any) => {
          if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
          if (!rolesByUser[r.user_id].includes(r.role)) {
            rolesByUser[r.user_id].push(r.role);
          }
        });

        // Fetch emails
        const emailsByUser: Record<string, string> = {};
        for (const uid of ids) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (u?.user?.email) emailsByUser[uid] = u.user.email;
        }

        const users = profiles.map(p => ({
          id: p.id,
          user_id: p.user_id,
          email: emailsByUser[p.user_id] || 'Email não disponível',
          full_name: p.full_name,
          phone: p.phone,
          avatar_url: p.avatar_url,
          is_active: p.is_active ?? true,
          roles: rolesByUser[p.user_id] || [],
          created_at: p.created_at,
          tenant_id: p.tenant_id,
          tenant_name: p.tenant_id ? tenantMap[p.tenant_id] || null : null,
          organization_name: p.tenant_id ? tenantMap[p.tenant_id] || null : null,
        }));

        return new Response(
          JSON.stringify({ users }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-users': {
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, user_id, full_name, phone, avatar_url, is_active, created_at')
          .eq('tenant_id', effectiveTenantId);

        if (profilesError) {
          console.error('[manage-users] list-users profilesError:', profilesError);
          return new Response(
            JSON.stringify({ error: 'Falha ao carregar perfis' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!profiles || profiles.length === 0) {
          return new Response(
            JSON.stringify({ users: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const ids = profiles.map(p => p.user_id);

        const { data: tenantRoles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('user_id, role')
          .eq('tenant_id', effectiveTenantId)
          .in('user_id', ids);

        if (rolesError) {
          console.error('[manage-users] list-users rolesError:', rolesError);
          return new Response(
            JSON.stringify({ error: 'Falha ao carregar permissões' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const rolesByUser: Record<string, string[]> = {};
        (tenantRoles || []).forEach((r: any) => {
          if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
          rolesByUser[r.user_id].push(r.role);
        });

        const emailsByUser: Record<string, string> = {};
        for (const uid of ids) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (u?.user?.email) emailsByUser[uid] = u.user.email;
        }

        const users = profiles.map(p => ({
          id: p.id,
          user_id: p.user_id,
          email: emailsByUser[p.user_id] || 'Email não disponível',
          full_name: p.full_name,
          phone: p.phone,
          avatar_url: p.avatar_url,
          is_active: p.is_active ?? true,
          roles: rolesByUser[p.user_id] || [],
          created_at: p.created_at,
        }));

        return new Response(
          JSON.stringify({ users }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-profile': {
        if (!userId || !profileData) {
          return new Response(
            JSON.stringify({ error: 'userId and profileData required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const allowed: Record<string, any> = {};
        if ('full_name' in profileData) allowed.full_name = profileData.full_name;
        if ('phone' in profileData) allowed.phone = profileData.phone;
        if ('is_active' in profileData) allowed.is_active = profileData.is_active;

        const { error: updErr } = await supabaseAdmin
          .from('profiles')
          .update(allowed)
          .eq('tenant_id', effectiveTenantId)
          .eq('user_id', userId);

        if (updErr) {
          console.error('[manage-users] update-profile updErr:', updErr);
          return new Response(
            JSON.stringify({ error: 'Failed to update profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
        if (!effectiveTenantId || !userData) {
          return new Response(
            JSON.stringify({ error: 'tenantId and userData required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { email, password, full_name, phone, roles: userRolesToAdd, storeIds } = userData;

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
            tenant_id: effectiveTenantId,
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
              tenant_id: effectiveTenantId,
          }));

          const { error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .insert(roleInserts);

          if (rolesError) {
            console.error('[manage-users] Roles error:', rolesError);
          }
        }

        // Add store access if provided
        if (storeIds && storeIds.length > 0) {
          const storeInserts = storeIds.map((store_id: string) => ({
            user_id: newUserId,
            tenant_id: effectiveTenantId,
            store_id,
            access_level: userRolesToAdd?.includes('admin') ? 'admin' : 
                          userRolesToAdd?.includes('manager') ? 'manager' : 'standard',
          }));

          const { error: storeError } = await supabaseAdmin
            .from('store_user_access')
            .insert(storeInserts);

          if (storeError) {
            console.error('[manage-users] Store access error:', storeError);
          }
        }

        console.log(`[manage-users] User created: ${newUserId}`);

        return new Response(
          JSON.stringify({ success: true, userId: newUserId }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-roles': {
        if (!effectiveTenantId || !userId || !newRoles) {
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
          .eq('tenant_id', effectiveTenantId);

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
            tenant_id: effectiveTenantId,
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

      case 'update-store-access': {
        if (!effectiveTenantId || !userId) {
          return new Response(
            JSON.stringify({ error: 'tenantId and userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete existing store access for this user in this tenant
        const { error: deleteError } = await supabaseAdmin
          .from('store_user_access')
          .delete()
          .eq('user_id', userId)
          .eq('tenant_id', effectiveTenantId);

        if (deleteError) {
          console.error('[manage-users] Delete store access error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to update store access' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Insert new store access if any stores provided
        if (storeIds && storeIds.length > 0) {
          // Get user roles to determine access level
          const { data: userRolesData } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('tenant_id', effectiveTenantId);

          const userRolesList = (userRolesData || []).map((r: any) => r.role);
          const accessLevel = userRolesList.includes('admin') ? 'admin' : 
                              userRolesList.includes('manager') ? 'manager' : 'standard';

          const storeInserts = storeIds.map((store_id: string) => ({
            user_id: userId,
            tenant_id: effectiveTenantId,
            store_id,
            access_level: accessLevel,
          }));

          const { error: insertError } = await supabaseAdmin
            .from('store_user_access')
            .insert(storeInserts);

          if (insertError) {
            console.error('[manage-users] Insert store access error:', insertError);
            return new Response(
              JSON.stringify({ error: 'Failed to add store access' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log(`[manage-users] Store access updated for user: ${userId}, stores: ${storeIds?.length || 0}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!effectiveTenantId || !userId) {
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
          .eq('tenant_id', effectiveTenantId);

        // Delete profile
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', userId)
          .eq('tenant_id', effectiveTenantId);

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

      case 'reset-password': {
        // Only super_admin can reset passwords
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas Super Admins podem resetar senhas' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { newPassword } = body;

        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: 'userId and newPassword required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (newPassword.length < 6) {
          return new Response(
            JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        );

        if (updateError) {
          console.error('[manage-users] Reset password error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Falha ao resetar senha' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[manage-users] Password reset for user: ${userId}`);

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
