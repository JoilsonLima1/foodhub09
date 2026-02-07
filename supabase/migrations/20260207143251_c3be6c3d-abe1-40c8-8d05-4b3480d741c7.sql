-- =============================================
-- PARTNER POLICIES (Super Admin controls)
-- =============================================
CREATE TABLE public.partner_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  -- NULL partner_id means GLOBAL default policy
  
  -- Plan limits
  max_plans_per_partner INT NOT NULL DEFAULT 5,
  allow_free_plan BOOLEAN NOT NULL DEFAULT false,
  min_paid_plan_price NUMERIC(10,2) NOT NULL DEFAULT 49.90,
  
  -- Free plan constraints
  free_plan_max_modules INT NOT NULL DEFAULT 4,
  free_plan_max_features INT NOT NULL DEFAULT 4,
  free_plan_constraints JSONB DEFAULT '{}',
  
  -- Trial limits
  max_trial_days_allowed INT NOT NULL DEFAULT 30,
  trial_allowed_modules TEXT[] DEFAULT '{}',
  trial_allowed_features TEXT[] DEFAULT '{}',
  
  -- Module/Feature catalog allowed for partners
  allowed_modules_catalog TEXT[] DEFAULT '{}',
  allowed_features_catalog TEXT[] DEFAULT '{}',
  
  -- Per-plan limits
  max_modules_per_plan INT NOT NULL DEFAULT 10,
  max_features_per_plan INT NOT NULL DEFAULT 10,
  
  -- Hierarchy enforcement
  require_plan_hierarchy BOOLEAN NOT NULL DEFAULT false,
  
  -- Billing options
  allow_offline_billing BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(partner_id)
);

-- Insert global default policy
INSERT INTO public.partner_policies (partner_id) VALUES (NULL);

-- =============================================
-- UPDATE partner_plans with trial_days
-- =============================================
ALTER TABLE public.partner_plans 
ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 14,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS included_features TEXT[] DEFAULT '{}';

-- =============================================
-- TENANT SUBSCRIPTIONS
-- =============================================
CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_tenant_id UUID REFERENCES public.partner_tenants(id) ON DELETE SET NULL,
  partner_plan_id UUID REFERENCES public.partner_plans(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
  
  -- Dates
  trial_starts_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  -- Billing mode
  billing_mode TEXT NOT NULL DEFAULT 'trial' CHECK (billing_mode IN ('trial', 'automatic', 'offline')),
  
  -- Payment info (for automatic billing)
  external_subscription_id TEXT,
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'asaas', NULL)),
  
  -- Amounts
  monthly_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'BRL',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.partner_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Partner policies: Super Admin can manage all, partners can read their own
CREATE POLICY "Super admins can manage partner policies"
ON public.partner_policies FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Partners can read their policy"
ON public.partner_policies FOR SELECT
USING (
  partner_id IS NULL OR
  partner_id IN (
    SELECT pu.partner_id FROM public.partner_users pu 
    WHERE pu.user_id = auth.uid() AND pu.is_active = true
  )
);

-- Tenant subscriptions: partners can manage their tenants' subscriptions
CREATE POLICY "Partners can manage tenant subscriptions"
ON public.tenant_subscriptions FOR ALL
USING (
  partner_tenant_id IN (
    SELECT pt.id FROM public.partner_tenants pt
    JOIN public.partner_users pu ON pu.partner_id = pt.partner_id
    WHERE pu.user_id = auth.uid() AND pu.is_active = true
  )
);

CREATE POLICY "Tenant admins can read their subscription"
ON public.tenant_subscriptions FOR SELECT
USING (
  tenant_id IN (
    SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage all subscriptions"
ON public.tenant_subscriptions FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- HELPER FUNCTION: Get effective policy for partner
-- =============================================
CREATE OR REPLACE FUNCTION public.get_partner_policy(p_partner_id UUID)
RETURNS public.partner_policies
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pp FROM public.partner_policies pp WHERE pp.partner_id = p_partner_id),
    (SELECT pp FROM public.partner_policies pp WHERE pp.partner_id IS NULL)
  ) AS policy
$$;

-- =============================================
-- VALIDATION FUNCTION: Check plan against policy
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_partner_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy partner_policies;
  v_plan_count INT;
BEGIN
  -- Get the effective policy
  SELECT * INTO v_policy FROM public.get_partner_policy(NEW.partner_id);
  
  -- Count existing plans
  SELECT COUNT(*) INTO v_plan_count 
  FROM public.partner_plans 
  WHERE partner_id = NEW.partner_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Check max plans
  IF v_plan_count >= v_policy.max_plans_per_partner THEN
    RAISE EXCEPTION 'Limite de planos atingido (máx: %)', v_policy.max_plans_per_partner;
  END IF;
  
  -- Check free plan allowed
  IF NEW.is_free = true AND v_policy.allow_free_plan = false THEN
    RAISE EXCEPTION 'Plano gratuito não permitido para este parceiro';
  END IF;
  
  -- Check minimum price for paid plans
  IF NEW.is_free = false AND NEW.monthly_price < v_policy.min_paid_plan_price THEN
    RAISE EXCEPTION 'Preço mínimo para plano pago: R$ %', v_policy.min_paid_plan_price;
  END IF;
  
  -- Check trial days
  IF NEW.trial_days > v_policy.max_trial_days_allowed THEN
    RAISE EXCEPTION 'Período de trial máximo: % dias', v_policy.max_trial_days_allowed;
  END IF;
  
  -- Check modules count
  IF array_length(NEW.included_modules, 1) > v_policy.max_modules_per_plan THEN
    RAISE EXCEPTION 'Máximo de módulos por plano: %', v_policy.max_modules_per_plan;
  END IF;
  
  -- Check features count
  IF array_length(NEW.included_features, 1) > v_policy.max_features_per_plan THEN
    RAISE EXCEPTION 'Máximo de features por plano: %', v_policy.max_features_per_plan;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_partner_plan_trigger ON public.partner_plans;
CREATE TRIGGER validate_partner_plan_trigger
BEFORE INSERT OR UPDATE ON public.partner_plans
FOR EACH ROW EXECUTE FUNCTION public.validate_partner_plan();

-- =============================================
-- FUNCTION: Check if tenant subscription allows access
-- =============================================
CREATE OR REPLACE FUNCTION public.check_tenant_subscription_access(p_tenant_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription tenant_subscriptions;
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription FROM public.tenant_subscriptions WHERE tenant_id = p_tenant_id;
  
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p_user_id 
    AND ur.tenant_id = p_tenant_id 
    AND ur.role = 'admin'
  ) INTO v_is_admin;
  
  -- No subscription = allow (legacy tenants)
  IF v_subscription IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_subscription');
  END IF;
  
  -- Active or trial with valid dates
  IF v_subscription.status IN ('active', 'trial') THEN
    IF v_subscription.status = 'trial' AND v_subscription.trial_ends_at < now() THEN
      -- Trial expired
      IF v_is_admin THEN
        RETURN jsonb_build_object('allowed', true, 'reason', 'admin_renewal', 'show_renewal_banner', true);
      ELSE
        RETURN jsonb_build_object('allowed', false, 'reason', 'trial_expired');
      END IF;
    END IF;
    RETURN jsonb_build_object('allowed', true, 'reason', 'active');
  END IF;
  
  -- Expired or canceled - only admin can access
  IF v_subscription.status IN ('expired', 'canceled', 'past_due') THEN
    IF v_is_admin THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'admin_renewal', 'show_renewal_banner', true);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'subscription_' || v_subscription.status);
    END IF;
  END IF;
  
  RETURN jsonb_build_object('allowed', false, 'reason', 'unknown');
END;
$$;