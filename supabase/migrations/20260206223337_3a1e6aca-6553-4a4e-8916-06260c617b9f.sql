-- =============================================================================
-- MODULE USAGE LIMITS SYSTEM
-- Tracks per-tenant monthly usage for quota-controlled features
-- =============================================================================

-- 1) Plan-level module limits configuration table
-- Super Admin can configure limits for each module per plan
CREATE TABLE IF NOT EXISTS public.module_plan_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_slug TEXT NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  limit_key TEXT NOT NULL,  -- e.g., 'audits_per_month', 'pages_per_month'
  limit_value INTEGER NOT NULL DEFAULT -1,  -- -1 = unlimited
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_slug, plan_id, limit_key)
);

-- 2) Tenant monthly usage tracking
CREATE TABLE IF NOT EXISTS public.tenant_module_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  usage_key TEXT NOT NULL,  -- matches limit_key above
  usage_count INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,  -- first day of the usage month
  period_end DATE NOT NULL,    -- last day of the usage month
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_slug, usage_key, period_start)
);

-- Enable RLS
ALTER TABLE public.module_plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_module_usage ENABLE ROW LEVEL SECURITY;

-- RLS for module_plan_limits: Super Admin can manage, anyone can read
CREATE POLICY "Super admins can manage module limits"
  ON public.module_plan_limits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Anyone can read module limits"
  ON public.module_plan_limits
  FOR SELECT
  USING (true);

-- RLS for tenant_module_usage: tenants see their own data
CREATE POLICY "Tenants can view their own usage"
  ON public.tenant_module_usage
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert/update usage"
  ON public.tenant_module_usage
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  );

-- 3) Function to check if tenant can perform action based on limits
CREATE OR REPLACE FUNCTION public.check_module_limit(
  p_tenant_id UUID,
  p_module_slug TEXT,
  p_limit_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_limit INTEGER;
  v_current_usage INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Get tenant's plan
  SELECT subscription_plan_id INTO v_plan_id
  FROM tenants
  WHERE id = p_tenant_id;

  -- Get limit for this module/plan combination
  SELECT limit_value INTO v_limit
  FROM module_plan_limits
  WHERE module_slug = p_module_slug
    AND plan_id = v_plan_id
    AND limit_key = p_limit_key;

  -- If no limit defined, treat as unlimited
  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'limit', -1,
      'used', 0,
      'remaining', -1
    );
  END IF;

  -- Calculate current period (month)
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- Get current usage
  SELECT COALESCE(usage_count, 0) INTO v_current_usage
  FROM tenant_module_usage
  WHERE tenant_id = p_tenant_id
    AND module_slug = p_module_slug
    AND usage_key = p_limit_key
    AND period_start = v_period_start;

  IF v_current_usage IS NULL THEN
    v_current_usage := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_current_usage < v_limit,
    'limit', v_limit,
    'used', v_current_usage,
    'remaining', GREATEST(0, v_limit - v_current_usage)
  );
END;
$$;

-- 4) Function to increment usage counter
CREATE OR REPLACE FUNCTION public.increment_module_usage(
  p_tenant_id UUID,
  p_module_slug TEXT,
  p_usage_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_new_count INTEGER;
  v_check JSONB;
BEGIN
  -- First check if allowed
  v_check := check_module_limit(p_tenant_id, p_module_slug, p_usage_key);
  
  IF NOT (v_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_exceeded',
      'limit', v_check->'limit',
      'used', v_check->'used'
    );
  END IF;

  -- Calculate current period
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- Upsert usage record
  INSERT INTO tenant_module_usage (tenant_id, module_slug, usage_key, usage_count, period_start, period_end)
  VALUES (p_tenant_id, p_module_slug, p_usage_key, 1, v_period_start, v_period_end)
  ON CONFLICT (tenant_id, module_slug, usage_key, period_start)
  DO UPDATE SET 
    usage_count = tenant_module_usage.usage_count + 1,
    updated_at = now()
  RETURNING usage_count INTO v_new_count;

  RETURN jsonb_build_object(
    'success', true,
    'new_count', v_new_count,
    'limit', v_check->'limit',
    'remaining', GREATEST(0, (v_check->>'limit')::INTEGER - v_new_count)
  );
END;
$$;

-- 5) Seed default limits for marketing_ceo module
-- Free/Starter: 1 audit/month, 5 pages/month
-- Professional: 4 audits/month, 20 pages/month
-- Enterprise: unlimited (-1)

INSERT INTO module_plan_limits (module_slug, plan_id, limit_key, limit_value)
SELECT 
  'marketing_ceo',
  sp.id,
  'audits_per_month',
  CASE 
    WHEN sp.name ILIKE '%starter%' THEN 1
    WHEN sp.name ILIKE '%professional%' OR sp.name ILIKE '%pro%' THEN 4
    WHEN sp.name ILIKE '%enterprise%' THEN -1
    ELSE 1
  END
FROM subscription_plans sp
WHERE sp.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO module_plan_limits (module_slug, plan_id, limit_key, limit_value)
SELECT 
  'marketing_ceo',
  sp.id,
  'pages_per_month',
  CASE 
    WHEN sp.name ILIKE '%starter%' THEN 5
    WHEN sp.name ILIKE '%professional%' OR sp.name ILIKE '%pro%' THEN 20
    WHEN sp.name ILIKE '%enterprise%' THEN -1
    ELSE 5
  END
FROM subscription_plans sp
WHERE sp.is_active = true
ON CONFLICT DO NOTHING;

-- Enable realtime for usage tracking (optional, for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_module_usage;