-- Fix the subscription_plans SELECT policy to be PERMISSIVE instead of RESTRICTIVE
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true);