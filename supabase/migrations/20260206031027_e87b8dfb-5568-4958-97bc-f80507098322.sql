-- =============================================================
-- SECURITY FIX: Resolve 3 error-level security vulnerabilities
-- =============================================================

-- 1. FIX: billing_settings public exposure
-- The billing_settings table should only be readable by super_admin
-- Currently uses an RPC function for public access which is appropriate
-- Add RLS to block direct table access

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Super admin can manage billing settings" ON public.billing_settings;
DROP POLICY IF EXISTS "Public read billing settings" ON public.billing_settings;

-- Only super_admin can read/modify billing_settings directly
CREATE POLICY "Super admin can manage billing settings"
ON public.billing_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- 2. FIX: ifood_orders_kitchen is a VIEW with security_invoker=on
-- Views with security_invoker inherit RLS from the base table
-- The base table is ifood_orders which already has tenant-scoped RLS
-- We need to verify the view is correctly configured (it should already be)
-- No additional action needed for the view itself, but we should ensure
-- the base ifood_orders table has proper RLS

-- Ensure ifood_orders has RLS enabled (should already be)
ALTER TABLE public.ifood_orders ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for ifood_orders to ensure proper access control
DROP POLICY IF EXISTS "Tenant users can view ifood orders" ON public.ifood_orders;
DROP POLICY IF EXISTS "Tenant admin/manager can manage ifood orders" ON public.ifood_orders;

-- Only tenant users with proper roles can view ifood orders
CREATE POLICY "Tenant users can view ifood orders"
ON public.ifood_orders
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id)
);

-- Only admin/manager can insert/update/delete
CREATE POLICY "Tenant admin/manager can manage ifood orders"
ON public.ifood_orders
FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 3. FIX: customer_registrations KYC data overexposure
-- Sensitive PII (CPF, selfie_url, document_url) should only be visible to admin/manager
-- Kitchen/stock staff should not have access to customer identity documents

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Tenant users can view customer registrations" ON public.customer_registrations;
DROP POLICY IF EXISTS "Admin/Manager can view customer registrations" ON public.customer_registrations;

-- Create restricted policy - only admin/manager can view customer registrations
CREATE POLICY "Admin/Manager can view customer registrations"
ON public.customer_registrations
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Keep existing INSERT/UPDATE/DELETE policies or create if missing
DROP POLICY IF EXISTS "Tenant admin can manage customer registrations" ON public.customer_registrations;

CREATE POLICY "Tenant admin can manage customer registrations"
ON public.customer_registrations
FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Create a safe view for basic customer info that operational staff might need
-- This excludes all PII/KYC data
CREATE OR REPLACE VIEW public.customer_registrations_safe
WITH (security_invoker = on)
AS
SELECT 
  id,
  tenant_id,
  full_name,
  is_verified,
  registration_type,
  created_at
  -- Excludes: cpf, phone, email, document_url, selfie_url, ip_address, device_id
FROM public.customer_registrations;

-- Grant access to authenticated users
GRANT SELECT ON public.customer_registrations_safe TO authenticated;