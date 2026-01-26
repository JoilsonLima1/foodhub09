-- Drop the problematic SECURITY DEFINER view
DROP VIEW IF EXISTS public.orders_safe;

-- Recreate view with SECURITY INVOKER (safe approach)
CREATE OR REPLACE VIEW public.orders_safe
WITH (security_invoker = on)
AS
SELECT 
  id,
  order_number,
  tenant_id,
  status,
  origin,
  is_delivery,
  subtotal,
  discount,
  delivery_fee,
  total,
  notes,
  estimated_time_minutes,
  created_at,
  updated_at,
  created_by,
  coupon_id,
  marketplace_order_id,
  -- PII fields: only admin/manager/cashier/delivery can see customer contact
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') 
         OR has_role(auth.uid(), 'cashier') OR has_role(auth.uid(), 'delivery')
    THEN customer_name 
    ELSE NULL 
  END as customer_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') 
         OR has_role(auth.uid(), 'cashier') OR has_role(auth.uid(), 'delivery')
    THEN customer_phone 
    ELSE NULL 
  END as customer_phone,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') 
         OR has_role(auth.uid(), 'cashier') OR has_role(auth.uid(), 'delivery')
    THEN customer_email 
    ELSE NULL 
  END as customer_email,
  -- Address fields: only admin/manager/delivery can see delivery address
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') 
         OR has_role(auth.uid(), 'delivery')
    THEN delivery_address 
    ELSE NULL 
  END as delivery_address,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') 
         OR has_role(auth.uid(), 'delivery')
    THEN delivery_neighborhood 
    ELSE NULL 
  END as delivery_neighborhood,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') 
         OR has_role(auth.uid(), 'delivery')
    THEN delivery_city 
    ELSE NULL 
  END as delivery_city,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') 
         OR has_role(auth.uid(), 'delivery')
    THEN delivery_zip_code 
    ELSE NULL 
  END as delivery_zip_code,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') 
         OR has_role(auth.uid(), 'delivery')
    THEN delivery_instructions 
    ELSE NULL 
  END as delivery_instructions
FROM public.orders
WHERE tenant_id = get_user_tenant_id(auth.uid());