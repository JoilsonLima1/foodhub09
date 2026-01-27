
-- Add RLS policy to allow admin/manager to view all tenant user roles
CREATE POLICY "Admins can view tenant user roles"
ON public.user_roles
FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Add RLS policy for admin/manager to manage user roles in their tenant
CREATE POLICY "Admins can manage tenant user roles"
ON public.user_roles
FOR ALL
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);
