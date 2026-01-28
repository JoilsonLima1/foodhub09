-- Fix security issues: subscription_plans and business_category_configs public exposure
-- These tables need to be publicly readable for the signup flow but can be restricted 
-- to only expose necessary fields for unauthenticated users

-- Create a function to get public subscription plans with limited fields (no Stripe IDs)
CREATE OR REPLACE FUNCTION public.get_public_subscription_plans()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  monthly_price numeric,
  currency text,
  display_order integer,
  max_users integer,
  max_products integer,
  max_orders_per_month integer,
  feature_pos boolean,
  feature_kitchen_display boolean,
  feature_delivery_management boolean,
  feature_stock_control boolean,
  feature_reports_basic boolean,
  feature_reports_advanced boolean,
  feature_ai_forecast boolean,
  feature_multi_branch boolean,
  feature_api_access boolean,
  feature_white_label boolean,
  feature_priority_support boolean,
  feature_custom_integrations boolean,
  feature_cmv_reports boolean,
  feature_goal_notifications boolean,
  feature_courier_app boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sp.id,
    sp.name,
    sp.slug,
    sp.description,
    sp.monthly_price,
    sp.currency,
    sp.display_order,
    sp.max_users,
    sp.max_products,
    sp.max_orders_per_month,
    sp.feature_pos,
    sp.feature_kitchen_display,
    sp.feature_delivery_management,
    sp.feature_stock_control,
    sp.feature_reports_basic,
    sp.feature_reports_advanced,
    sp.feature_ai_forecast,
    sp.feature_multi_branch,
    sp.feature_api_access,
    sp.feature_white_label,
    sp.feature_priority_support,
    sp.feature_custom_integrations,
    sp.feature_cmv_reports,
    sp.feature_goal_notifications,
    sp.feature_courier_app
  FROM public.subscription_plans sp
  WHERE sp.is_active = true
  ORDER BY sp.display_order
$$;

-- Create a function to get public business category configs with limited fields
-- Excludes: features, terminology, theme (internal configuration details)
CREATE OR REPLACE FUNCTION public.get_public_business_categories()
RETURNS TABLE (
  id uuid,
  category_key text,
  name text,
  description text,
  icon text,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bcc.id,
    bcc.category_key,
    bcc.name,
    bcc.description,
    bcc.icon,
    bcc.display_order
  FROM public.business_category_configs bcc
  WHERE bcc.is_active = true
  ORDER BY bcc.display_order
$$;

-- Now restrict the direct table access - drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view category configs" ON public.business_category_configs;
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;

-- Add restrictive policies - only authenticated users can view direct table
CREATE POLICY "Authenticated users can view category configs"
  ON public.business_category_configs
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view active plans"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Add comment documenting the security pattern
COMMENT ON FUNCTION public.get_public_subscription_plans IS 
'Public function for landing page pricing. Returns limited fields only - excludes stripe_price_id and stripe_product_id. Use this instead of direct table access for unauthenticated users.';

COMMENT ON FUNCTION public.get_public_business_categories IS 
'Public function for signup category selection. Returns limited fields only - excludes features, terminology, and theme. Use this instead of direct table access for unauthenticated users.';