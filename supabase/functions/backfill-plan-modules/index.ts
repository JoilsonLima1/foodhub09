import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface BackfillResult {
  tenant_id: string;
  tenant_name: string;
  plan_name: string | null;
  modules_added: number;
  modules_reactivated: number;
  modules_removed: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[backfill-plan-modules] Function called')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!

    // User client to verify auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })

    // Admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user is super_admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (!roleCheck) {
      console.error('[backfill-plan-modules] User is not super_admin:', user.id)
      return new Response(
        JSON.stringify({ error: 'Forbidden - super_admin required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse optional tenant_id filter
    let targetTenantId: string | null = null
    try {
      const body = await req.json().catch(() => null)
      targetTenantId = body?.tenant_id || null
    } catch {
      // ignore
    }

    console.log('[backfill-plan-modules] Starting backfill', { targetTenantId })

    // Fetch all tenants with active plans (or specific tenant)
    let tenantsQuery = supabaseAdmin
      .from('tenants')
      .select(`
        id,
        name,
        subscription_plan_id,
        subscription_status,
        subscription_plans:subscription_plan_id(id, name)
      `)
      .not('subscription_plan_id', 'is', null)

    if (targetTenantId) {
      tenantsQuery = tenantsQuery.eq('id', targetTenantId)
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery

    if (tenantsError) {
      console.error('[backfill-plan-modules] Error fetching tenants:', tenantsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tenants' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tenants with plans found',
          results: [],
          summary: { total: 0, processed: 0, failed: 0 }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[backfill-plan-modules] Processing ${tenants.length} tenants`)

    const results: BackfillResult[] = []
    let successCount = 0
    let failCount = 0

    for (const tenant of tenants) {
      const result: BackfillResult = {
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        plan_name: (tenant.subscription_plans as any)?.name || null,
        modules_added: 0,
        modules_reactivated: 0,
        modules_removed: 0,
        errors: [],
      }

      try {
        // Call the force_sync function which handles add/remove/reactivate
        const { data: syncResult, error: syncError } = await supabaseAdmin
          .rpc('force_sync_tenant_modules', { p_tenant_id: tenant.id })

        if (syncError) {
          result.errors.push(`Sync error: ${syncError.message}`)
          failCount++
        } else if (syncResult) {
          // Parse results from the function
          for (const row of syncResult) {
            if (row.action_taken === 'ADDED') result.modules_added++
            if (row.action_taken === 'REACTIVATED') result.modules_reactivated++
            if (row.action_taken === 'REMOVED') result.modules_removed++
          }
          successCount++
        } else {
          // No changes needed
          successCount++
        }
      } catch (err: any) {
        result.errors.push(`Exception: ${err.message}`)
        failCount++
      }

      results.push(result)
    }

    // Log backfill completion
    console.log('[backfill-plan-modules] Completed:', {
      total: tenants.length,
      success: successCount,
      failed: failCount,
      totalAdded: results.reduce((sum, r) => sum + r.modules_added, 0),
      totalReactivated: results.reduce((sum, r) => sum + r.modules_reactivated, 0),
      totalRemoved: results.reduce((sum, r) => sum + r.modules_removed, 0),
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill completed for ${tenants.length} tenants`,
        summary: {
          total: tenants.length,
          processed: successCount,
          failed: failCount,
          modules_added: results.reduce((sum, r) => sum + r.modules_added, 0),
          modules_reactivated: results.reduce((sum, r) => sum + r.modules_reactivated, 0),
          modules_removed: results.reduce((sum, r) => sum + r.modules_removed, 0),
        },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[backfill-plan-modules] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})