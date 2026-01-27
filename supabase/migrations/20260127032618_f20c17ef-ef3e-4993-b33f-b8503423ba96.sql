-- =====================================================
-- SECURITY FIX: Address error-level security findings
-- =====================================================

-- 1. FIX: Branding Storage Bucket - Restrict to super_admin only
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete branding assets" ON storage.objects;

-- Create super_admin-only policies for write operations
CREATE POLICY "Super admins can upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding' 
  AND public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Super admins can update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Super admins can delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding'
  AND public.has_role(auth.uid(), 'super_admin')
);

-- 2. FIX: Payment Machine Records - Restrict to cashiers, managers, admins only
-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Users can view tenant machine records" ON public.payment_machine_records;

-- Create role-restricted SELECT policy for payment records
CREATE POLICY "Authorized staff can view payment records"
ON public.payment_machine_records FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'cashier')
  )
);

-- 3. FIX: Orders table customer data exposure
-- The orders_safe VIEW already handles PII masking via RBAC
-- We need to ensure the base orders table is only accessible through the view for non-privileged roles
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view tenant orders" ON public.orders;

-- Create role-based SELECT policy: Only admin/manager/cashier/delivery can see full data
-- Kitchen and stock roles should use orders_safe view instead
CREATE POLICY "Authorized staff can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'cashier')
    OR public.has_role(auth.uid(), 'delivery')
  )
);

-- Kitchen and stock roles still need to see orders, but via orders_safe view
-- Add a separate policy for kitchen/stock with limited access (no PII columns returned by RLS is not possible)
-- Instead, we ensure they query orders_safe which masks PII

-- 4. NOTE: orders_safe is a VIEW with security_invoker=on
-- Views inherit RLS from base tables when security_invoker is enabled
-- The view already masks PII based on user roles
-- No additional RLS needed on the view itself (views don't have RLS, they use base table RLS)