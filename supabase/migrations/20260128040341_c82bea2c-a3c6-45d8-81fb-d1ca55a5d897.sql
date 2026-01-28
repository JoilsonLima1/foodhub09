-- Allow tenant admins and managers to update their own tenant's business_category
CREATE POLICY "Admins can update their own tenant"
ON public.tenants
FOR UPDATE
USING (
  id = get_user_tenant_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  id = get_user_tenant_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);