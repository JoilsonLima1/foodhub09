import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IFOOD_API_BASE = 'https://merchant-api.ifood.com.br'

// deno-lint-ignore no-explicit-any
type SupabaseClientType = SupabaseClient<any, any, any>

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase: SupabaseClientType = createClient(supabaseUrl, supabaseServiceKey)

    // Get tenant_id from query param (webhook URL includes it)
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenant_id')

    if (!tenantId) {
      console.error('Missing tenant_id in webhook URL')
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    console.log(`iFood webhook received for tenant ${tenantId}:`, JSON.stringify(body).slice(0, 500))

    // Log the incoming webhook
    await supabase.from('ifood_logs').insert({
      tenant_id: tenantId,
      event_type: body.code || body.eventType || 'unknown',
      direction: 'inbound',
      endpoint: '/ifood-webhook',
      request_data: body,
      status_code: 200
    })

    // Get integration settings
    const { data: integration, error: intError } = await supabase
      .from('ifood_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (intError || !integration?.is_active) {
      console.log('Integration not active or not found')
      return new Response(
        JSON.stringify({ success: true, message: 'Integration not active' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different event types
    const eventType = body.code || body.eventType

    switch (eventType) {
      case 'PLACED':
      case 'PLC':
        await handleNewOrder(supabase, tenantId, integration, body)
        break
      case 'CONFIRMED':
      case 'CFM':
        await updateOrderStatus(supabase, tenantId, body.orderId, 'CONFIRMED')
        break
      case 'CANCELLED':
      case 'CAN':
        await updateOrderStatus(supabase, tenantId, body.orderId, 'CANCELLED')
        break
      case 'DISPATCHED':
      case 'DSP':
        await updateOrderStatus(supabase, tenantId, body.orderId, 'DISPATCHED')
        break
      case 'DELIVERED':
      case 'CON':
        await updateOrderStatus(supabase, tenantId, body.orderId, 'CONCLUDED')
        break
      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// deno-lint-ignore no-explicit-any
async function handleNewOrder(
  supabase: SupabaseClientType,
  tenantId: string,
  // deno-lint-ignore no-explicit-any
  integration: any,
  // deno-lint-ignore no-explicit-any
  webhookData: any
) {
  const orderId = webhookData.orderId || webhookData.id

  // Fetch full order details from iFood API
  const orderDetails = await fetchOrderDetails(integration, orderId, supabase, tenantId)

  if (!orderDetails) {
    console.error('Could not fetch order details')
    return
  }

  // Parse order data
  // deno-lint-ignore no-explicit-any
  const items = orderDetails.items?.map((item: any) => ({
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    options: item.options || [],
    observations: item.observations
  })) || []

  const deliveryAddress = orderDetails.delivery?.deliveryAddress ? {
    street: orderDetails.delivery.deliveryAddress.streetName,
    number: orderDetails.delivery.deliveryAddress.streetNumber,
    neighborhood: orderDetails.delivery.deliveryAddress.neighborhood,
    city: orderDetails.delivery.deliveryAddress.city,
    state: orderDetails.delivery.deliveryAddress.state,
    zip_code: orderDetails.delivery.deliveryAddress.postalCode,
    complement: orderDetails.delivery.deliveryAddress.complement,
    reference: orderDetails.delivery.deliveryAddress.reference
  } : null

  // Insert iFood order
  const { data: ifoodOrder, error: insertError } = await supabase
    .from('ifood_orders')
    .insert({
      tenant_id: tenantId,
      ifood_order_id: orderId,
      ifood_short_id: orderDetails.displayId || orderDetails.shortId,
      status: 'PLACED',
      customer_name: orderDetails.customer?.name || 'Cliente iFood',
      customer_phone: orderDetails.customer?.phone?.number,
      delivery_address: deliveryAddress,
      items: items,
      subtotal: orderDetails.total?.subTotal || 0,
      delivery_fee: orderDetails.total?.deliveryFee || 0,
      discount: orderDetails.total?.benefits || 0,
      total: orderDetails.total?.orderAmount || 0,
      payment_method: orderDetails.payments?.[0]?.name || 'iFood',
      scheduled_to: orderDetails.schedule?.deliveryDateTimeStart,
      raw_data: orderDetails
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error inserting iFood order:', insertError)
    return
  }

  console.log('iFood order saved:', ifoodOrder.id)

  // Create corresponding order in main orders table
  // deno-lint-ignore no-explicit-any
  const orderItems = items.map((item: any) => ({
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price / 100, // Convert from cents
    total_price: item.total_price / 100,
    notes: item.observations
  }))

  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      tenant_id: tenantId,
      customer_name: orderDetails.customer?.name || 'Cliente iFood',
      customer_phone: orderDetails.customer?.phone?.number,
      delivery_address: deliveryAddress ? `${deliveryAddress.street}, ${deliveryAddress.number}` : null,
      delivery_neighborhood: deliveryAddress?.neighborhood,
      delivery_city: deliveryAddress?.city,
      delivery_zip_code: deliveryAddress?.zip_code,
      delivery_instructions: deliveryAddress?.reference,
      is_delivery: orderDetails.orderType === 'DELIVERY',
      origin: 'ifood',
      status: 'pending',
      subtotal: (orderDetails.total?.subTotal || 0) / 100,
      delivery_fee: (orderDetails.total?.deliveryFee || 0) / 100,
      discount: (orderDetails.total?.benefits || 0) / 100,
      total: (orderDetails.total?.orderAmount || 0) / 100,
      marketplace_order_id: orderId,
      notes: `Pedido iFood #${orderDetails.displayId || orderDetails.shortId}`
    })
    .select()
    .single()

  if (orderError) {
    console.error('Error creating main order:', orderError)
  } else {
    // Link iFood order to main order
    await supabase
      .from('ifood_orders')
      .update({ order_id: newOrder.id })
      .eq('id', ifoodOrder.id)

    // Insert order items
    for (const item of orderItems) {
      await supabase.from('order_items').insert({
        order_id: newOrder.id,
        ...item
      })
    }

    console.log('Main order created:', newOrder.id)
  }

  // Auto-accept if enabled
  if (integration.auto_accept_orders) {
    await confirmOrder(integration, orderId, supabase, tenantId)
  }
}

async function fetchOrderDetails(
  // deno-lint-ignore no-explicit-any
  integration: any,
  orderId: string,
  supabase: SupabaseClientType,
  tenantId: string
) {
  try {
    const token = await getValidToken(integration, supabase, tenantId)
    if (!token) return null

    const response = await fetch(`${IFOOD_API_BASE}/order/v1.0/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch order:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching order details:', error)
    return null
  }
}

async function confirmOrder(
  // deno-lint-ignore no-explicit-any
  integration: any,
  orderId: string,
  supabase: SupabaseClientType,
  tenantId: string
) {
  try {
    const token = await getValidToken(integration, supabase, tenantId)
    if (!token) return

    const response = await fetch(`${IFOOD_API_BASE}/order/v1.0/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    // Log the confirmation attempt
    await supabase.from('ifood_logs').insert({
      tenant_id: tenantId,
      event_type: 'order_confirm',
      direction: 'outbound',
      endpoint: `/order/v1.0/orders/${orderId}/confirm`,
      status_code: response.status,
      response_data: { success: response.ok }
    })

    if (response.ok) {
      console.log('Order auto-confirmed:', orderId)
      await updateOrderStatus(supabase, tenantId, orderId, 'CONFIRMED')
    } else {
      console.error('Failed to confirm order:', response.status)
    }
  } catch (error) {
    console.error('Error confirming order:', error)
  }
}

async function updateOrderStatus(
  supabase: SupabaseClientType,
  tenantId: string,
  ifoodOrderId: string,
  status: string
) {
  await supabase
    .from('ifood_orders')
    .update({ status })
    .eq('tenant_id', tenantId)
    .eq('ifood_order_id', ifoodOrderId)

  console.log(`Order ${ifoodOrderId} status updated to ${status}`)
}

async function getValidToken(
  // deno-lint-ignore no-explicit-any
  integration: any,
  supabase: SupabaseClientType,
  tenantId: string
): Promise<string | null> {
  // Check if current token is still valid
  if (integration.access_token && integration.token_expires_at) {
    const expiresAt = new Date(integration.token_expires_at)
    if (expiresAt > new Date(Date.now() + 60000)) { // 1 minute buffer
      return integration.access_token
    }
  }

  // Need to refresh token
  try {
    const response = await fetch(`${IFOOD_API_BASE}/authentication/v1.0/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: integration.client_id,
        client_secret: integration.client_secret
      })
    })

    if (!response.ok) {
      console.error('Token refresh failed:', response.status)
      return null
    }

    const tokenData = await response.json()
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    // Update stored tokens
    await supabase
      .from('ifood_integrations')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString()
      })
      .eq('tenant_id', tenantId)

    return tokenData.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}
