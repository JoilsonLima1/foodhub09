-- Fix 1: Add write protection policies to suppliers table
CREATE POLICY "Stock managers can manage suppliers" 
ON public.suppliers FOR ALL
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'stock'::app_role))
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'stock'::app_role))
);

-- Fix 2: Restrict branding storage bucket write access to super_admin only
-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete branding assets" ON storage.objects;

-- Create new restricted policies for super_admin only
CREATE POLICY "Super admins can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update branding assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete branding assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'super_admin'::app_role));