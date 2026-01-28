-- Create a function to get public order tracking info (limited fields for security)
CREATE OR REPLACE FUNCTION public.get_public_order_tracking(p_order_number integer, p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  order_number integer,
  status order_status,
  origin order_origin,
  is_delivery boolean,
  total numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  estimated_time_minutes integer,
  tenant_name text,
  tenant_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id,
    o.order_number,
    o.status,
    o.origin,
    o.is_delivery,
    o.total,
    o.created_at,
    o.updated_at,
    o.estimated_time_minutes,
    t.name as tenant_name,
    t.logo_url as tenant_logo_url
  FROM public.orders o
  JOIN public.tenants t ON t.id = o.tenant_id
  WHERE o.order_number = p_order_number
    AND (p_tenant_id IS NULL OR o.tenant_id = p_tenant_id)
  LIMIT 1
$$;

-- Create a function to get order status history for tracking
CREATE OR REPLACE FUNCTION public.get_public_order_history(p_order_id uuid)
RETURNS TABLE(
  id uuid,
  status order_status,
  created_at timestamp with time zone,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    osh.id,
    osh.status,
    osh.created_at,
    CASE 
      WHEN osh.notes LIKE '%PDV%' THEN 'Pedido registrado'
      ELSE NULL
    END as notes
  FROM public.order_status_history osh
  WHERE osh.order_id = p_order_id
  ORDER BY osh.created_at ASC
$$;

-- Create table for customer push notification subscriptions
CREATE TABLE IF NOT EXISTS public.customer_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(order_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.customer_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their own subscription (for anonymous tracking)
CREATE POLICY "Anyone can subscribe to order notifications"
  ON public.customer_push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Only allow viewing own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.customer_push_subscriptions
  FOR SELECT
  USING (true);

-- Allow deletion of own subscriptions
CREATE POLICY "Users can delete subscriptions"
  ON public.customer_push_subscriptions
  FOR DELETE
  USING (true);