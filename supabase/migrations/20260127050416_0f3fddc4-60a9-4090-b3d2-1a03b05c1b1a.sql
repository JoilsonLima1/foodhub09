-- Drop existing policy and recreate with super_admin support
DROP POLICY IF EXISTS "Managers can manage couriers" ON public.couriers;

CREATE POLICY "Managers can manage couriers" 
ON public.couriers 
FOR ALL 
TO authenticated
USING (
  (tenant_id = public.get_user_tenant_id(auth.uid()) 
    AND (public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  (tenant_id = public.get_user_tenant_id(auth.uid()) 
    AND (public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);