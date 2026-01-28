-- Drop and recreate function with new field
DROP FUNCTION IF EXISTS public.get_public_subscription_plans();

CREATE FUNCTION public.get_public_subscription_plans()
 RETURNS TABLE(
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
   feature_courier_app boolean,
   feature_public_menu boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    sp.feature_courier_app,
    sp.feature_public_menu
  FROM public.subscription_plans sp
  WHERE sp.is_active = true
  ORDER BY sp.display_order
$function$;