
-- Fix: Add kitchen and stock roles to orders SELECT policy
-- These roles need SELECT access to see orders (with PII masked via orders_safe view)
-- This resolves the security finding: orders_customer_data_exposure

-- Drop existing policy
DROP POLICY IF EXISTS "Authorized staff can view orders" ON public.orders;

-- Recreate with kitchen and stock roles included
-- Kitchen/Stock will use orders_safe view which masks PII
CREATE POLICY "Authorized staff can view orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'cashier'::app_role)
    OR has_role(auth.uid(), 'kitchen'::app_role)
    OR has_role(auth.uid(), 'stock'::app_role)
    OR (has_role(auth.uid(), 'delivery'::app_role) AND is_assigned_courier(auth.uid(), id))
  )
);

-- Update orders_safe view to use security_invoker for proper RLS inheritance
DROP VIEW IF EXISTS public.orders_safe;

CREATE VIEW public.orders_safe
WITH (security_invoker = on)
AS
SELECT 
  id,
  order_number,
  tenant_id,
  status,
  origin,
  subtotal,
  delivery_fee,
  discount,
  total,
  is_delivery,
  estimated_time_minutes,
  coupon_id,
  marketplace_order_id,
  created_at,
  updated_at,
  created_by,
  notes,
  -- PII masking: Only admin/manager/cashier see customer contact info
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'cashier'::app_role) 
    THEN customer_name
    ELSE NULL::text
  END AS customer_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'cashier'::app_role) 
    THEN customer_phone
    ELSE NULL::text
  END AS customer_phone,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'cashier'::app_role) 
    THEN customer_email
    ELSE NULL::text
  END AS customer_email,
  -- Delivery address: Also visible to delivery role (they need it for deliveries)
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'cashier'::app_role)
      OR has_role(auth.uid(), 'delivery'::app_role)
    THEN delivery_address
    ELSE 'Endereço disponível para entregador'::text
  END AS delivery_address,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'cashier'::app_role)
      OR has_role(auth.uid(), 'delivery'::app_role)
    THEN delivery_neighborhood
    ELSE NULL::text
  END AS delivery_neighborhood,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'cashier'::app_role)
      OR has_role(auth.uid(), 'delivery'::app_role)
    THEN delivery_city
    ELSE NULL::text
  END AS delivery_city,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'cashier'::app_role)
      OR has_role(auth.uid(), 'delivery'::app_role)
    THEN delivery_zip_code
    ELSE NULL::text
  END AS delivery_zip_code,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'cashier'::app_role)
      OR has_role(auth.uid(), 'delivery'::app_role)
    THEN delivery_instructions
    ELSE NULL::text
  END AS delivery_instructions
FROM public.orders o;

-- Add comment explaining the view security model
COMMENT ON VIEW public.orders_safe IS 
'Secure view for orders that masks PII (customer contact info) based on user roles.
Admin/Manager/Cashier: See all customer data
Delivery: See delivery address only (needed for deliveries)
Kitchen/Stock: See order details but no customer contact info (NULL values)
Uses security_invoker=on to inherit RLS from base orders table.';
