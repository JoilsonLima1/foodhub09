-- Add policy for super_admin to manage all tenants
CREATE POLICY "Super admins can manage all tenants"
ON public.tenants
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Ensure subscriptions table has proper super_admin access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.subscriptions'::regclass 
    AND polname = 'Super admins can manage all subscriptions'
  ) THEN
    CREATE POLICY "Super admins can manage all subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;