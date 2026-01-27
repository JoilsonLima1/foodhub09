-- Add policy for admin/manager to manage couriers (INSERT, UPDATE, DELETE)
CREATE POLICY "Managers can manage couriers" 
ON public.couriers 
FOR ALL 
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) 
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid()) 
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);