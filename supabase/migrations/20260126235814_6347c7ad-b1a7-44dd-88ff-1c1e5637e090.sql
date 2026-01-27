-- Create subscription_plans table for managing plan features
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Feature limits
  max_users INTEGER DEFAULT 5,
  max_products INTEGER DEFAULT 100,
  max_orders_per_month INTEGER DEFAULT 500,
  
  -- Feature toggles
  feature_pos BOOLEAN DEFAULT true,
  feature_kitchen_display BOOLEAN DEFAULT true,
  feature_delivery_management BOOLEAN DEFAULT true,
  feature_stock_control BOOLEAN DEFAULT false,
  feature_reports_basic BOOLEAN DEFAULT true,
  feature_reports_advanced BOOLEAN DEFAULT false,
  feature_ai_forecast BOOLEAN DEFAULT false,
  feature_multi_branch BOOLEAN DEFAULT false,
  feature_api_access BOOLEAN DEFAULT false,
  feature_white_label BOOLEAN DEFAULT false,
  feature_priority_support BOOLEAN DEFAULT false,
  feature_custom_integrations BOOLEAN DEFAULT false,
  feature_cmv_reports BOOLEAN DEFAULT false,
  feature_goal_notifications BOOLEAN DEFAULT false,
  feature_courier_app BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can manage all plans
CREATE POLICY "Super admins can manage plans"
ON public.subscription_plans
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Policy: Everyone can view active plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can manage all subscriptions
CREATE POLICY "Super admins can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Policy: Admins/managers can view their tenant subscription
CREATE POLICY "Tenant admins can view subscription"
ON public.subscriptions
FOR SELECT
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Add subscription reference to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days');

-- Create trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- Insert default plans with Stripe IDs
INSERT INTO public.subscription_plans (
  name, slug, description, stripe_price_id, monthly_price, display_order,
  max_users, max_products, max_orders_per_month,
  feature_pos, feature_kitchen_display, feature_delivery_management, feature_stock_control,
  feature_reports_basic, feature_reports_advanced, feature_ai_forecast, feature_multi_branch,
  feature_api_access, feature_white_label, feature_priority_support, feature_custom_integrations,
  feature_cmv_reports, feature_goal_notifications, feature_courier_app
) VALUES 
(
  'Starter', 'starter', 'Ideal para pequenos negócios iniciando no delivery',
  'price_1StzZ8DXXTXOfufHndx7Soux', 99, 1,
  3, 50, 300,
  true, true, true, false,
  true, false, false, false,
  false, false, false, false,
  false, false, true
),
(
  'Professional', 'professional', 'Para negócios em crescimento com operação completa',
  'price_1StzauDXXTXOfufHATEvcWkt', 199, 2,
  10, 200, 1000,
  true, true, true, true,
  true, true, true, false,
  false, false, false, false,
  true, true, true
),
(
  'Enterprise', 'enterprise', 'Para redes e franquias com necessidades avançadas',
  'price_1StzbGDXXTXOfufHnrgVlKqR', 499, 3,
  -1, -1, -1,
  true, true, true, true,
  true, true, true, true,
  true, true, true, true,
  true, true, true
);