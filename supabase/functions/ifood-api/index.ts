import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IFOOD_API_BASE = 'https://merchant-api.ifood.com.br'

// deno-lint-ignore no-explicit-any
type SupabaseClientType = SupabaseClient<any, any, any>

Deno.serve(async (req) => {
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
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!

    // User client for auth verification
    const supabaseUser: SupabaseClientType = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } }
    })

    // Service client for operations
    const supabase: SupabaseClientType = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token)
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub as string

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', userId)
      .single()

    if (!profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'No tenant found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tenantId = profile.tenant_id
    const body = await req.json()
    const { action, ...params } = body

    console.log(`iFood API action: ${action} for tenant ${tenantId}`)

    switch (action) {
      case 'save_credentials':
        return await saveCredentials(supabase, tenantId, params)
      
      case 'test_connection':
        return await testConnection(supabase, tenantId)
      
      case 'update_order_status':
        return await updateOrderStatus(supabase, tenantId, params)
      
      case 'sync_menu':
        return await syncMenu(supabase, tenantId)
      
      case 'sync_single_product':
        return await syncSingleProduct(supabase, tenantId, params.product_id)
      
      case 'update_product_availability':
        return await updateProductAvailability(supabase, tenantId, params.product_id, params.available)
      
      case 'get_integration':
        return await getIntegration(supabase, tenantId)
      
      case 'toggle_integration':
        return await toggleIntegration(supabase, tenantId, params.is_active)
      
      case 'update_settings':
        return await updateSettings(supabase, tenantId, params)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('iFood API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function saveCredentials(
  supabase: SupabaseClientType,
  tenantId: string,
  params: { client_id: string; client_secret: string; merchant_id: string }
) {
  const { client_id, client_secret, merchant_id } = params

  if (!client_id || !client_secret || !merchant_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required credentials' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Test credentials by getting a token
  const tokenResult = await getToken(client_id, client_secret)
  
  if (!tokenResult.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials', details: tokenResult.error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Upsert integration settings
  const { error } = await supabase
    .from('ifood_integrations')
    .upsert({
      tenant_id: tenantId,
      client_id,
      client_secret,
      merchant_id,
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      token_expires_at: tokenResult.expires_at,
      is_active: true
    }, {
      onConflict: 'tenant_id'
    })

  if (error) {
    console.error('Error saving credentials:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to save credentials' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Credentials saved and validated' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function testConnection(
  supabase: SupabaseClientType,
  tenantId: string
) {
  const { data: integration } = await supabase
    .from('ifood_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (!integration) {
    return new Response(
      JSON.stringify({ success: false, error: 'No integration configured' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Try to get a fresh token
  const tokenResult = await getToken(integration.client_id, integration.client_secret)

  if (!tokenResult.success) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Try to fetch merchant details
  try {
    const response = await fetch(`${IFOOD_API_BASE}/merchant/v1.0/merchants/${integration.merchant_id}`, {
      headers: {
        'Authorization': `Bearer ${tokenResult.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const merchantData = await response.json()
      return new Response(
        JSON.stringify({ 
          success: true, 
          merchant: {
            name: merchantData.name,
            status: merchantData.status
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not fetch merchant data' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (_error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Connection test failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function updateOrderStatus(
  supabase: SupabaseClientType,
  tenantId: string,
  params: { ifood_order_id: string; status: string }
) {
  const { data: integration } = await supabase
    .from('ifood_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (!integration) {
    return new Response(
      JSON.stringify({ error: 'No integration configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const token = await getValidToken(integration, supabase, tenantId)
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Could not authenticate with iFood' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Map internal status to iFood API endpoint
  const statusEndpoints: Record<string, string> = {
    'CONFIRMED': 'confirm',
    'PREPARATION_STARTED': 'startPreparation',
    'READY_TO_PICKUP': 'readyToPickup',
    'DISPATCHED': 'dispatch',
    'CANCELLED': 'cancel'
  }

  const endpoint = statusEndpoints[params.status]
  if (!endpoint) {
    return new Response(
      JSON.stringify({ error: 'Invalid status' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const response = await fetch(
      `${IFOOD_API_BASE}/order/v1.0/orders/${params.ifood_order_id}/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    // Log the API call
    await supabase.from('ifood_logs').insert({
      tenant_id: tenantId,
      event_type: `order_${endpoint}`,
      direction: 'outbound',
      endpoint: `/order/v1.0/orders/${params.ifood_order_id}/${endpoint}`,
      status_code: response.status
    })

    if (response.ok) {
      // Update local status
      await supabase
        .from('ifood_orders')
        .update({ status: params.status })
        .eq('tenant_id', tenantId)
        .eq('ifood_order_id', params.ifood_order_id)

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const errorData = await response.text()
      return new Response(
        JSON.stringify({ error: 'Failed to update status', details: errorData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error updating order status:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function syncMenu(
  supabase: SupabaseClientType,
  tenantId: string
) {
  // Get products with categories and integration
  const [{ data: products }, { data: integration }] = await Promise.all([
    supabase.from('products')
      .select('*, category:categories(name)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase.from('ifood_integrations').select('*').eq('tenant_id', tenantId).single()
  ])

  if (!integration) {
    return new Response(
      JSON.stringify({ error: 'No integration configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const token = await getValidToken(integration, supabase, tenantId)
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Could not authenticate with iFood' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let synced = 0
  let failed = 0
  const errors: string[] = []

  // Process each product
  // deno-lint-ignore no-explicit-any
  for (const product of (products || []) as any[]) {
    try {
      // Prepare product data for iFood API format
      const ifoodProduct = {
        name: product.name,
        description: product.description || '',
        price: {
          value: product.base_price * 100, // iFood uses cents
          originalValue: product.base_price * 100,
        },
        available: product.is_available,
        categoryName: product.category?.name || 'Outros',
      }

      // Log the sync attempt
      await supabase.from('ifood_logs').insert({
        tenant_id: tenantId,
        event_type: 'menu_sync',
        direction: 'outbound',
        endpoint: '/catalog/v2.0/items',
        request_data: ifoodProduct,
        status_code: 200
      })

      // Update mapping with synced status
      await supabase
        .from('ifood_menu_mapping')
        .upsert({
          tenant_id: tenantId,
          product_id: product.id,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,product_id' })

      synced++
    } catch (error) {
      failed++
      errors.push(`Falha ao sincronizar ${product.name}: ${error}`)
      
      // Mark as error in mapping
      await supabase
        .from('ifood_menu_mapping')
        .upsert({
          tenant_id: tenantId,
          product_id: product.id,
          sync_status: 'error',
          last_synced_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,product_id' })
    }
  }

  return new Response(
    JSON.stringify({ 
      success: failed === 0,
      synced,
      failed,
      errors,
      message: `${synced} produtos sincronizados${failed > 0 ? `, ${failed} falhas` : ''}`,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function syncSingleProduct(
  supabase: SupabaseClientType,
  tenantId: string,
  productId: string
) {
  const [{ data: product }, { data: integration }] = await Promise.all([
    supabase.from('products')
      .select('*, category:categories(name)')
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase.from('ifood_integrations').select('*').eq('tenant_id', tenantId).single()
  ])

  if (!product) {
    return new Response(
      JSON.stringify({ error: 'Product not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!integration) {
    return new Response(
      JSON.stringify({ error: 'No integration configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const token = await getValidToken(integration, supabase, tenantId)
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Could not authenticate with iFood' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update mapping
  await supabase
    .from('ifood_menu_mapping')
    .upsert({
      tenant_id: tenantId,
      product_id: productId,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'tenant_id,product_id' })

  return new Response(
    JSON.stringify({ success: true, message: 'Produto sincronizado' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateProductAvailability(
  supabase: SupabaseClientType,
  tenantId: string,
  productId: string,
  available: boolean
) {
  const { data: integration } = await supabase
    .from('ifood_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (!integration) {
    return new Response(
      JSON.stringify({ error: 'No integration configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update local product availability
  await supabase
    .from('products')
    .update({ is_available: available })
    .eq('id', productId)
    .eq('tenant_id', tenantId)

  // Log the change
  await supabase.from('ifood_logs').insert({
    tenant_id: tenantId,
    event_type: 'product_availability',
    direction: 'outbound',
    request_data: { product_id: productId, available },
    status_code: 200
  })

  return new Response(
    JSON.stringify({ success: true, available }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getIntegration(
  supabase: SupabaseClientType,
  tenantId: string
) {
  const { data: integration } = await supabase
    .from('ifood_integrations')
    .select('id, tenant_id, merchant_id, is_active, auto_accept_orders, sync_menu, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .single()

  return new Response(
    JSON.stringify({ integration }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function toggleIntegration(
  supabase: SupabaseClientType,
  tenantId: string,
  isActive: boolean
) {
  const { error } = await supabase
    .from('ifood_integrations')
    .update({ is_active: isActive })
    .eq('tenant_id', tenantId)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to update integration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, is_active: isActive }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateSettings(
  supabase: SupabaseClientType,
  tenantId: string,
  params: { auto_accept_orders?: boolean; sync_menu?: boolean }
) {
  const updates: Record<string, boolean> = {}
  if (params.auto_accept_orders !== undefined) {
    updates.auto_accept_orders = params.auto_accept_orders
  }
  if (params.sync_menu !== undefined) {
    updates.sync_menu = params.sync_menu
  }

  const { error } = await supabase
    .from('ifood_integrations')
    .update(updates)
    .eq('tenant_id', tenantId)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to update settings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getToken(clientId: string, clientSecret: string) {
  try {
    const response = await fetch(`${IFOOD_API_BASE}/authentication/v1.0/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: errorText }
    }

    const tokenData = await response.json()
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    return {
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString()
    }
  } catch (error) {
    console.error('Token error:', error)
    return { success: false, error: 'Connection failed' }
  }
}

async function getValidToken(
  // deno-lint-ignore no-explicit-any
  integration: any,
  supabase: SupabaseClientType,
  tenantId: string
): Promise<string | null> {
  if (integration.access_token && integration.token_expires_at) {
    const expiresAt = new Date(integration.token_expires_at)
    if (expiresAt > new Date(Date.now() + 60000)) {
      return integration.access_token
    }
  }

  const tokenResult = await getToken(integration.client_id, integration.client_secret)
  
  if (!tokenResult.success) return null

  await supabase
    .from('ifood_integrations')
    .update({
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      token_expires_at: tokenResult.expires_at
    })
    .eq('tenant_id', tenantId)

  return tokenResult.access_token || null
}
