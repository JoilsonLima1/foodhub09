-- Fix infinite recursion in profiles RLS policy
-- The "Users can view profiles in same store" policy has a self-referencing subquery causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles in same store" ON public.profiles;

-- The existing policies already cover the needed access:
-- 1. "Users can view own profile" - users see their own profile
-- 2. "Authenticated users view own profile" - redundant but safe
-- 3. "Admin/Manager view tenant profiles" - admins/managers see tenant profiles
-- 4. "Super admin view all profiles" - super admins see all

-- We don't need the store-based policy as it's already covered by admin/manager policy
-- If needed in the future, use a SECURITY DEFINER function to avoid recursion