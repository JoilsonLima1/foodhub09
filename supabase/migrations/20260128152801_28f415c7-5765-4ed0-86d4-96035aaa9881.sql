-- =====================================================
-- FIX 2: profiles - Add super_admin policies and strengthen existing
-- =====================================================

-- Drop existing policies to recreate with proper tenant isolation
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view tenant profiles" ON public.profiles;

-- Policy 1: Users can view their OWN profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Admin/Manager can view profiles within their tenant only
CREATE POLICY "Admin/Manager view tenant profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND tenant_id IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Policy 3: Users can update ONLY their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Admins can update profiles within their tenant
CREATE POLICY "Admin update tenant profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Policy 5: Allow profile insert during bootstrap
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id IS NOT NULL
);

-- Policy 6: Super admin can view ALL profiles
CREATE POLICY "Super admin view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Policy 7: Super admin can update ALL profiles
CREATE POLICY "Super admin update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));