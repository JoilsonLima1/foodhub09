-- =============================================
-- FIX 1: Profiles table - Add tenant isolation
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with explicit tenant isolation
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- Admins/Managers can view profiles within their tenant (for staff management)
CREATE POLICY "Managers can view tenant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- =============================================
-- FIX 2: Orders table - Role-based PII access
-- =============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view tenant orders" ON public.orders;

-- Kitchen/Stock: Can see orders but NOT customer PII (handled in app layer)
-- For now, create view-based approach with column-level security

-- Create a view that hides PII for non-privileged roles
CREATE OR REPLACE VIEW public.orders_safe AS
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
  -- PII fields masked for kitchen/stock roles
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

-- Recreate base orders SELECT policy (all tenant staff can see orders)
CREATE POLICY "Users can view tenant orders" 
ON public.orders 
FOR SELECT 
USING (tenant_id = get_user_tenant_id(auth.uid()));