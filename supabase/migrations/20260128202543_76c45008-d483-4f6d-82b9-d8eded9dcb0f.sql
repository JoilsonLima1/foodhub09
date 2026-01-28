-- Drop the restrictive SELECT policy that limits super_admins
DROP POLICY IF EXISTS "Authenticated users can view active addon modules" ON public.addon_modules;

-- Create a new PERMISSIVE SELECT policy for authenticated users to view active modules
CREATE POLICY "Authenticated users can view active addon modules"
ON public.addon_modules
FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'super_admin'::app_role));