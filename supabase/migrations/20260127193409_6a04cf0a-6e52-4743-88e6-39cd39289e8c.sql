-- Drop the existing policy that doesn't include super_admin
DROP POLICY IF EXISTS "Managers can view tenant profiles" ON public.profiles;

-- Create updated policy that includes super_admin
CREATE POLICY "Managers can view tenant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);