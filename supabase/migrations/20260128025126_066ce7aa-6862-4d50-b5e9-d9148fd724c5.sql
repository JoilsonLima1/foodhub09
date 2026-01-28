-- =============================================================================
-- SECURITY FIX: iFood Orders PII Exposure + orders_safe View Protection
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX: Restrict iFood orders access to authorized roles only
-- Kitchen/stock roles should NOT see customer PII (customer_name, customer_phone, delivery_address)
-- -----------------------------------------------------------------------------

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Staff can view iFood orders" ON public.ifood_orders;

-- Create restrictive policy - only admin/manager/cashier can see full iFood orders
CREATE POLICY "Admin/Manager/Cashier can view iFood orders"
ON public.ifood_orders
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'cashier'::app_role)
  )
);

-- -----------------------------------------------------------------------------
-- 2. CREATE: Safe view for kitchen/stock roles (PII masked)
-- Kitchen staff need order items for preparation, NOT customer contact info
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.ifood_orders_kitchen
WITH (security_invoker = on)
AS
SELECT 
  id,
  tenant_id,
  ifood_order_id,
  ifood_short_id,
  status,
  items,
  subtotal,
  total,
  scheduled_to,
  created_at,
  updated_at
  -- Explicitly EXCLUDE: customer_name, customer_phone, delivery_address, raw_data
FROM public.ifood_orders
WHERE tenant_id = public.get_user_tenant_id(auth.uid());

-- Grant SELECT on the safe view to all authenticated users
GRANT SELECT ON public.ifood_orders_kitchen TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. FIX: Add RLS protection to orders_safe view
-- The orders_safe view already has security_invoker=on, but we need to ensure
-- the underlying table RLS is properly enforced. Since it's a view with 
-- security_invoker, it inherits RLS from the base 'orders' table.
-- 
-- However, we should add a comment to clarify this is a security view
-- -----------------------------------------------------------------------------

COMMENT ON VIEW public.orders_safe IS 'Security view for orders with PII masking. Uses security_invoker=on to inherit RLS from base orders table. Kitchen/stock roles receive masked customer data.';