import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Client with user's token for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token)
    
    if (claimsError || !claims?.claims) {
      console.error('Claims error:', claimsError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub as string
    const userEmail = claims.claims.email as string
    
    console.log(`Bootstrapping user: ${userId} (${userEmail})`)

    // Get the demo tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', 'foodhub-demo')
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant error:', tenantError)
      return new Response(
        JSON.stringify({ error: 'Demo tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found demo tenant: ${tenant.id}`)

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

    // Update profile with tenant_id
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ tenant_id: tenant.id })
      .eq('user_id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Profile updated with tenant_id')

    // Check if user already has any role
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingRole) {
      // Check if this tenant already has an admin (first user gets admin, others get cashier)
      const { data: existingAdmins } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('role', 'admin')
        .limit(1)

      // First user in tenant becomes admin, subsequent users become cashier
      const roleToAssign = (!existingAdmins || existingAdmins.length === 0) ? 'admin' : 'cashier'
      
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: roleToAssign,
          tenant_id: tenant.id
        })

      if (roleError) {
        console.error('Role insert error:', roleError)
        return new Response(
          JSON.stringify({ error: 'Failed to assign role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log(`Role assigned: ${roleToAssign}`)
    } else {
      console.log('User already has a role assigned')
    }

    // Determine what role was assigned for the response
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User bootstrapped successfully',
        tenant_id: tenant.id,
        role: userRole?.role || 'unknown'
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
