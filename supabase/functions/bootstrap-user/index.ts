import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[bootstrap-user] Function called')
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[bootstrap-user] Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('[bootstrap-user] Authorization header present')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Client with user's token for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify user using getUser() - more reliable than getClaims()
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    
    if (userError || !user) {
      console.error('[bootstrap-user] User auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    const userEmail = user.email || ''
    const userMetadata = user.user_metadata ?? {}

    // Optional: tenant/org name and category sent by the client during signup
    let requestedTenantName: string | undefined;
    let requestedBusinessCategory: string | undefined;
    try {
      // Not all requests will contain JSON (e.g., legacy callers)
      const body = await req.json().catch(() => null);
      requestedTenantName = body?.tenantName;
      requestedBusinessCategory = body?.businessCategory;
    } catch {
      // ignore
    }

    // Also check user metadata for category (from signUp options.data)
    const businessCategory = requestedBusinessCategory || userMetadata?.business_category || 'restaurant';
    
    console.log(`Bootstrapping user: ${userId} (${userEmail}) with category: ${businessCategory}`);

    // Check if profile already has tenant
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingProfile?.tenant_id) {
      console.log('User already has tenant assigned')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already bootstrapped',
          tenant_id: existingProfile.tenant_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a new tenant (organization) for this signup
    const baseNameRaw = (requestedTenantName || userMetadata?.tenant_name || userMetadata?.business_name || userMetadata?.full_name || userEmail)?.toString()
    const baseName = (baseNameRaw || 'Novo estabelecimento').trim().slice(0, 80)

    const slugify = (input: string) => {
      const normalized = input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      return normalized || 'estabelecimento'
    }

    const slugBase = slugify(baseName)
    const makeSlug = () => `${slugBase}-${crypto.randomUUID().slice(0, 8)}`

    let tenantId: string | null = null
    let lastTenantError: any = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = makeSlug()
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({ name: baseName, slug, business_category: businessCategory })
        .select('id')
        .single()

      if (!tenantError && tenant?.id) {
        tenantId = tenant.id
        break
      }

      lastTenantError = tenantError
    }

    if (!tenantId) {
      console.error('[bootstrap-user] Failed to create tenant:', { error: lastTenantError, userId })
      return new Response(
        JSON.stringify({ error: 'Operation failed', code: 'SETUP_001' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Created tenant: ${tenantId} for user: ${userId}`)

    // Upsert profile with tenant_id (create if missing)
    const fullName = (userMetadata?.full_name || baseName || userEmail)?.toString().trim().slice(0, 120) || 'Usuário'
    if (existingProfile?.id) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ tenant_id: tenantId })
        .eq('user_id', userId)

      if (profileError) {
        console.error('[bootstrap-user] Profile update error:', { error: profileError, userId })
        return new Response(
          JSON.stringify({ error: 'Operation failed', code: 'SETUP_002' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          tenant_id: tenantId,
          is_active: true,
        })

      if (profileInsertError) {
        console.error('[bootstrap-user] Profile insert error:', { error: profileInsertError, userId })
        return new Response(
          JSON.stringify({ error: 'Operation failed', code: 'SETUP_002' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('Profile ensured with tenant_id')

    // First user in this tenant becomes admin
    const { data: existingRoleInTenant } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!existingRoleInTenant) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          tenant_id: tenantId,
        })

      if (roleError) {
        console.error('[bootstrap-user] Role assignment error:', { error: roleError, userId, role: 'admin' })
        return new Response(
          JSON.stringify({ error: 'Operation failed', code: 'SETUP_003' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Role assigned: admin')
    }

    // Sync modules included in the tenant's plan (provision "brinde" modules)
    // This ensures any modules bundled with the plan are automatically activated
    try {
      const { error: syncError } = await supabaseAdmin.rpc('sync_tenant_modules_from_plan', {
        p_tenant_id: tenantId,
      })
      if (syncError) {
        console.error('[bootstrap-user] Module sync error (non-fatal):', syncError)
        // Continue - module sync failure shouldn't block user creation
      } else {
        console.log('[bootstrap-user] Plan modules synced successfully for tenant:', tenantId)
      }
    } catch (syncErr) {
      console.error('[bootstrap-user] Module sync exception (non-fatal):', syncErr)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User bootstrapped successfully',
        tenant_id: tenantId,
        role: 'admin',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bootstrap error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
