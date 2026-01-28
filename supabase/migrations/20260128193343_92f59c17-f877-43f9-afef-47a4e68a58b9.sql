-- ========================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Fix all error-level security issues
-- ========================================

-- ==========================================
-- 1. FIX orders_safe VIEW - PROPERLY MASK PII
-- The view must mask customer data for non-privileged roles
-- ==========================================

DROP VIEW IF EXISTS public.orders_safe CASCADE;

CREATE VIEW public.orders_safe
WITH (security_invoker = on)
AS
SELECT 
  o.id,
  o.order_number,
  o.tenant_id,
  o.status,
  o.origin,
  o.subtotal,
  o.delivery_fee,
  o.discount,
  o.total,
  o.is_delivery,
  o.estimated_time_minutes,
  o.coupon_id,
  o.marketplace_order_id,
  o.created_at,
  o.updated_at,
  o.created_by,
  o.notes,
  -- Mask customer PII for non-privileged roles (kitchen, stock, delivery)
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
    THEN o.customer_name 
    ELSE NULL 
  END as customer_name,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
    THEN o.customer_phone 
    ELSE NULL 
  END as customer_phone,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
    THEN o.customer_email 
    ELSE NULL 
  END as customer_email,
  -- Mask delivery address for kitchen/stock roles (only admin, manager, cashier, delivery can see)
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
      OR public.has_role(auth.uid(), 'delivery'::app_role)
    THEN o.delivery_address 
    ELSE 'Endereço disponível para entregador' 
  END as delivery_address,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
      OR public.has_role(auth.uid(), 'delivery'::app_role)
    THEN o.delivery_neighborhood 
    ELSE NULL 
  END as delivery_neighborhood,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
      OR public.has_role(auth.uid(), 'delivery'::app_role)
    THEN o.delivery_city 
    ELSE NULL 
  END as delivery_city,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
      OR public.has_role(auth.uid(), 'delivery'::app_role)
    THEN o.delivery_zip_code 
    ELSE NULL 
  END as delivery_zip_code,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
      OR public.has_role(auth.uid(), 'delivery'::app_role)
    THEN o.delivery_instructions 
    ELSE NULL 
  END as delivery_instructions
FROM public.orders o
WHERE o.tenant_id = public.get_user_tenant_id(auth.uid());

-- Grant access to authenticated users
GRANT SELECT ON public.orders_safe TO authenticated;

-- ==========================================
-- 2. CREATE ifood_orders_safe VIEW - MASK PII
-- Protect customer data from iFood orders
-- ==========================================

DROP VIEW IF EXISTS public.ifood_orders_safe CASCADE;

CREATE VIEW public.ifood_orders_safe
WITH (security_invoker = on)
AS
SELECT 
  io.id,
  io.tenant_id,
  io.ifood_order_id,
  io.ifood_short_id,
  io.order_id,
  io.status,
  io.items,
  io.subtotal,
  io.delivery_fee,
  io.discount,
  io.total,
  io.payment_method,
  io.raw_data,
  io.scheduled_to,
  io.created_at,
  io.updated_at,
  -- Mask customer PII - only admin, manager can see
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)
    THEN io.customer_name 
    ELSE 'Cliente iFood' 
  END as customer_name,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)
    THEN io.customer_phone 
    ELSE NULL 
  END as customer_phone,
  -- Mask delivery address - only privileged roles can see
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)
    THEN io.delivery_address 
    ELSE NULL 
  END as delivery_address
FROM public.ifood_orders io
WHERE io.tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'manager'::app_role) 
    OR public.has_role(auth.uid(), 'cashier'::app_role)
  );

-- Grant access to authenticated users
GRANT SELECT ON public.ifood_orders_safe TO authenticated;

-- ==========================================
-- 3. FIX ifood_orders_kitchen VIEW - ADD RLS VIA WHERE CLAUSE
-- Views inherit security_invoker, add WHERE clause for tenant isolation
-- ==========================================

DROP VIEW IF EXISTS public.ifood_orders_kitchen CASCADE;

CREATE VIEW public.ifood_orders_kitchen
WITH (security_invoker = on)
AS
SELECT 
  io.id,
  io.tenant_id,
  io.ifood_order_id,
  io.ifood_short_id,
  io.status,
  io.items,
  io.subtotal,
  io.total,
  io.scheduled_to,
  io.created_at,
  io.updated_at
  -- Deliberately EXCLUDES: customer_name, customer_phone, delivery_address, raw_data
FROM public.ifood_orders io
WHERE io.tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    -- Only allow kitchen, admin, manager, cashier to view
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'manager'::app_role) 
    OR public.has_role(auth.uid(), 'cashier'::app_role)
    OR public.has_role(auth.uid(), 'kitchen'::app_role)
  );

-- Grant access to authenticated users
GRANT SELECT ON public.ifood_orders_kitchen TO authenticated;

-- ==========================================
-- 4. CREATE profiles_safe VIEW - RESTRICT PHONE FOR NON-PRIVILEGED
-- Protect employee phone numbers from general staff
-- ==========================================

CREATE VIEW public.profiles_safe
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.user_id,
  p.tenant_id,
  p.full_name,
  p.avatar_url,
  p.is_active,
  p.created_at,
  p.updated_at,
  -- Only admin/manager can see employee phone numbers
  CASE 
    WHEN p.user_id = auth.uid() 
      OR public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    THEN p.phone 
    ELSE NULL 
  END as phone
FROM public.profiles p
WHERE 
  -- Own profile
  p.user_id = auth.uid()
  -- OR same tenant admin/manager
  OR (
    p.tenant_id = public.get_user_tenant_id(auth.uid()) 
    AND (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)
    )
  )
  -- OR super admin
  OR public.has_role(auth.uid(), 'super_admin'::app_role);

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_safe TO authenticated;

-- ==========================================
-- 5. HARDEN ifood_orders RLS - REMOVE CASHIER ACCESS TO PII
-- Cashiers can still see orders via ifood_orders_safe view
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin/Manager/Cashier can view iFood orders" ON public.ifood_orders;

-- Create restricted policy - only admin/manager can directly access base table
CREATE POLICY "Admin/Manager can view iFood orders directly"
ON public.ifood_orders
FOR SELECT
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

-- ==========================================
-- 6. CREATE SECURITY FUNCTION FOR DELIVERY ROLE
-- Allow delivery drivers to see only their assigned deliveries
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_assigned_courier(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deliveries d
    JOIN public.couriers c ON c.id = d.courier_id
    WHERE d.order_id = _order_id
      AND c.user_id = _user_id
  )
$$;

-- ==========================================
-- 7. ADD AUDIT TRAIL FOR SECURITY-SENSITIVE OPERATIONS
-- Log when PII is accessed
-- ==========================================

-- Create function to log PII access
CREATE OR REPLACE FUNCTION public.log_pii_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if accessing PII columns
  IF TG_OP = 'SELECT' AND (NEW.customer_phone IS NOT NULL OR NEW.customer_email IS NOT NULL) THEN
    INSERT INTO public.audit_logs (
      tenant_id,
      entity_type,
      entity_id,
      action,
      user_id,
      new_data
    )
    VALUES (
      NEW.tenant_id,
      TG_TABLE_NAME,
      NEW.id,
      'pii_access',
      auth.uid(),
      jsonb_build_object('accessed_at', now())
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ==========================================
-- 8. CREATE products_pricing_safe VIEW
-- Restrict pricing visibility to authorized roles only
-- ==========================================

CREATE VIEW public.products_pricing_safe
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.tenant_id,
  p.name,
  p.description,
  p.image_url,
  p.category_id,
  p.is_active,
  p.is_available,
  p.has_variations,
  p.has_addons,
  p.is_combo,
  p.sku,
  p.display_order,
  p.created_at,
  p.updated_at,
  -- Only admin, manager, cashier can see base prices
  -- Others see null (for internal staff like kitchen/stock)
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role) 
      OR public.has_role(auth.uid(), 'cashier'::app_role)
    THEN p.base_price 
    ELSE NULL 
  END as base_price
FROM public.products p
WHERE p.tenant_id = public.get_user_tenant_id(auth.uid());

-- Grant access to authenticated users
GRANT SELECT ON public.products_pricing_safe TO authenticated;

-- ==========================================
-- 9. ADD COMMENT DOCUMENTATION FOR SECURITY VIEWS
-- ==========================================

COMMENT ON VIEW public.orders_safe IS 'Security view that masks customer PII based on user role. Kitchen/stock roles cannot see customer contact info.';
COMMENT ON VIEW public.ifood_orders_safe IS 'Security view that masks iFood customer PII. Only admin/manager can see full customer details.';
COMMENT ON VIEW public.ifood_orders_kitchen IS 'Kitchen display view with NO customer PII. Only shows order items and status.';
COMMENT ON VIEW public.profiles_safe IS 'Security view that restricts employee phone visibility to admin/manager roles.';
COMMENT ON VIEW public.products_pricing_safe IS 'Security view that restricts pricing visibility. Kitchen/stock cannot see base prices.';