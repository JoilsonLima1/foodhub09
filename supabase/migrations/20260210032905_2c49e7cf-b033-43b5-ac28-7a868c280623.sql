
-- =============================================
-- 1) Partner Policy Overrides table
-- =============================================
CREATE TABLE IF NOT EXISTS public.partner_policy_overrides (
  partner_id UUID PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  allow_free_plan BOOLEAN DEFAULT NULL,
  allow_partner_gateway BOOLEAN DEFAULT NULL,
  billing_owner TEXT DEFAULT NULL,
  allow_offline_billing BOOLEAN DEFAULT NULL,
  max_plans INTEGER DEFAULT NULL,
  min_paid_price NUMERIC DEFAULT NULL,
  max_modules_per_plan INTEGER DEFAULT NULL,
  max_features_per_plan INTEGER DEFAULT NULL,
  max_trial_days INTEGER DEFAULT NULL,
  tx_fee_max_percent NUMERIC DEFAULT NULL,
  tx_fee_max_fixed_cents INTEGER DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_policy_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_overrides" ON public.partner_policy_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "partner_read_own_override" ON public.partner_policy_overrides
  FOR SELECT TO authenticated
  USING (
    partner_id IN (
      SELECT pu.partner_id FROM public.partner_users pu WHERE pu.user_id = auth.uid() AND pu.is_active = true
    )
  );

CREATE TRIGGER update_partner_policy_overrides_updated_at
  BEFORE UPDATE ON public.partner_policy_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2) Add approval fields to partner_plans
-- =============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_approval_status') THEN
    CREATE TYPE public.plan_approval_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE public.partner_plans
  ADD COLUMN IF NOT EXISTS approval_status public.plan_approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID DEFAULT NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_plans_approval 
  ON public.partner_plans(partner_id, approval_status) WHERE is_active = true;

-- =============================================
-- 3) Trigger: only super_admin can approve/reject
-- =============================================
CREATE OR REPLACE FUNCTION public.enforce_plan_approval_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.approval_status IN ('approved', 'rejected') AND 
      (OLD.approval_status IS DISTINCT FROM NEW.approval_status)) THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Somente Super Admin pode aprovar ou rejeitar planos';
    END IF;
    IF NEW.approval_status = 'approved' THEN
      NEW.approved_at := now();
      NEW.approved_by := auth.uid();
      NEW.rejection_reason := NULL;
    END IF;
  END IF;

  IF OLD.approval_status = 'approved' AND 
     NEW.approval_status = 'approved' AND
     NOT public.has_role(auth.uid(), 'super_admin') AND
     (OLD.name IS DISTINCT FROM NEW.name OR 
      OLD.monthly_price IS DISTINCT FROM NEW.monthly_price OR
      OLD.included_modules IS DISTINCT FROM NEW.included_modules OR
      OLD.included_features IS DISTINCT FROM NEW.included_features OR
      OLD.trial_days IS DISTINCT FROM NEW.trial_days OR
      OLD.max_users IS DISTINCT FROM NEW.max_users OR
      OLD.max_products IS DISTINCT FROM NEW.max_products) THEN
    NEW.approval_status := 'pending';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_plan_approval ON public.partner_plans;
CREATE TRIGGER trg_enforce_plan_approval
  BEFORE UPDATE ON public.partner_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_approval_rules();

CREATE OR REPLACE FUNCTION public.enforce_plan_approval_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.approval_status := 'pending';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_plan_approval_insert ON public.partner_plans;
CREATE TRIGGER trg_enforce_plan_approval_insert
  BEFORE INSERT ON public.partner_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_approval_on_insert();

-- =============================================
-- 4) Update get_public_partner_plans to only return approved
-- =============================================
CREATE OR REPLACE FUNCTION public.get_public_partner_plans(p_partner_id UUID)
RETURNS TABLE (
  id UUID, name TEXT, slug TEXT, description TEXT, monthly_price NUMERIC,
  currency TEXT, max_users INTEGER, max_products INTEGER, max_orders_per_month INTEGER,
  included_modules TEXT[], included_features TEXT[], display_order INTEGER,
  trial_days INTEGER, is_free BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pp.id, pp.name, pp.slug, pp.description, pp.monthly_price, pp.currency,
    pp.max_users, pp.max_products, pp.max_orders_per_month,
    pp.included_modules, pp.included_features, pp.display_order, pp.trial_days, pp.is_free
  FROM partner_plans pp
  WHERE pp.partner_id = p_partner_id AND pp.is_active = true AND pp.approval_status = 'approved'
  ORDER BY pp.display_order ASC;
END;
$$;

-- =============================================
-- 5) Fix import RPC with UPSERT / slug dedup
-- =============================================
CREATE OR REPLACE FUNCTION import_platform_templates_for_partner(p_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plans_imported INT := 0;
  v_plans_updated INT := 0;
  v_skipped_free INT := 0;
  v_page_imported BOOLEAN := false;
  v_allow_free BOOLEAN := false;
  v_template RECORD;
  v_page_template RECORD;
  v_target_slug TEXT;
  v_existing_id UUID;
BEGIN
  IF p_partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id cannot be null';
  END IF;

  SELECT COALESCE(
    (SELECT allow_free_plan FROM partner_policies WHERE partner_id = p_partner_id LIMIT 1),
    (SELECT allow_free_plan FROM partner_policies WHERE partner_id IS NULL LIMIT 1),
    false
  ) INTO v_allow_free;

  -- Check override
  SELECT COALESCE(
    (SELECT o.allow_free_plan FROM partner_policy_overrides o WHERE o.partner_id = p_partner_id),
    v_allow_free
  ) INTO v_allow_free;

  FOR v_template IN 
    SELECT * FROM platform_plan_templates WHERE is_active = true ORDER BY display_order
  LOOP
    IF v_template.is_free AND NOT v_allow_free THEN
      v_skipped_free := v_skipped_free + 1;
      CONTINUE;
    END IF;

    v_target_slug := v_template.slug || '-' || substr(p_partner_id::text, 1, 8);

    SELECT id INTO v_existing_id FROM partner_plans 
      WHERE partner_id = p_partner_id AND slug = v_target_slug LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE partner_plans SET
        name = v_template.name, description = v_template.description,
        monthly_price = v_template.monthly_price, currency = v_template.currency,
        max_users = v_template.max_users, max_products = v_template.max_products,
        max_orders_per_month = v_template.max_orders_per_month,
        included_modules = v_template.included_modules, included_features = v_template.included_features,
        is_free = v_template.is_free, trial_days = v_template.trial_days,
        display_order = v_template.display_order, updated_at = now()
      WHERE id = v_existing_id;
      v_plans_updated := v_plans_updated + 1;
    ELSE
      INSERT INTO partner_plans (
        partner_id, name, slug, description, monthly_price, currency,
        max_users, max_products, max_orders_per_month,
        included_modules, included_features, is_free, trial_days,
        is_featured, is_default, display_order, is_active, approval_status
      ) VALUES (
        p_partner_id, v_template.name, v_target_slug, v_template.description,
        v_template.monthly_price, v_template.currency, v_template.max_users,
        v_template.max_products, v_template.max_orders_per_month,
        v_template.included_modules, v_template.included_features, v_template.is_free,
        v_template.trial_days, v_template.is_featured, v_template.is_default,
        v_template.display_order, true, 'pending'
      );
      v_plans_imported := v_plans_imported + 1;
    END IF;
  END LOOP;

  SELECT * INTO v_page_template FROM platform_partner_page_template WHERE is_active = true LIMIT 1;
  IF v_page_template.id IS NOT NULL THEN
    INSERT INTO partner_marketing_pages (
      partner_id, hero_badge, hero_title, hero_subtitle, hero_cta_text,
      hero_image_url, benefits_title, benefits, features_title, features,
      faq_title, faq_items, testimonials, cta_title, cta_subtitle,
      cta_button_text, social_proof_text, show_modules_section,
      show_pricing_section, show_faq_section, show_testimonials_section, published
    ) VALUES (
      p_partner_id, v_page_template.hero_badge, v_page_template.hero_title,
      v_page_template.hero_subtitle, v_page_template.hero_cta_text,
      v_page_template.hero_image_url, v_page_template.benefits_title,
      v_page_template.benefits, v_page_template.features_title, v_page_template.features,
      v_page_template.faq_title, v_page_template.faq_items, v_page_template.testimonials,
      v_page_template.cta_title, v_page_template.cta_subtitle, v_page_template.cta_button_text,
      v_page_template.social_proof_text, v_page_template.show_modules_section,
      v_page_template.show_pricing_section, v_page_template.show_faq_section,
      v_page_template.show_testimonials_section, false
    )
    ON CONFLICT (partner_id) DO UPDATE SET
      hero_badge = EXCLUDED.hero_badge, hero_title = EXCLUDED.hero_title,
      hero_subtitle = EXCLUDED.hero_subtitle, hero_cta_text = EXCLUDED.hero_cta_text,
      benefits = EXCLUDED.benefits, features = EXCLUDED.features,
      faq_items = EXCLUDED.faq_items, testimonials = EXCLUDED.testimonials, updated_at = now();
    v_page_imported := true;
  END IF;

  RETURN jsonb_build_object(
    'plans_imported', v_plans_imported, 'plans_updated', v_plans_updated,
    'page_imported', v_page_imported, 'skipped_free_count', v_skipped_free
  );
END;
$$;

-- =============================================
-- 6) RPC: get effective policy for a partner
-- =============================================
CREATE OR REPLACE FUNCTION public.get_effective_partner_policy(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_global RECORD;
  v_override RECORD;
BEGIN
  SELECT * INTO v_global FROM partner_policies WHERE partner_id IS NULL LIMIT 1;
  SELECT * INTO v_override FROM partner_policy_overrides WHERE partner_id = p_partner_id;

  RETURN jsonb_build_object(
    'allow_free_plan', COALESCE(v_override.allow_free_plan, v_global.allow_free_plan),
    'allow_partner_gateway', COALESCE(v_override.allow_partner_gateway, v_global.allow_partner_gateway),
    'billing_owner', COALESCE(v_override.billing_owner, v_global.billing_owner),
    'allow_offline_billing', COALESCE(v_override.allow_offline_billing, v_global.allow_offline_billing),
    'max_plans', COALESCE(v_override.max_plans, v_global.max_plans_per_partner),
    'min_paid_price', COALESCE(v_override.min_paid_price, v_global.min_paid_plan_price),
    'max_modules_per_plan', COALESCE(v_override.max_modules_per_plan, v_global.max_modules_per_plan),
    'max_features_per_plan', COALESCE(v_override.max_features_per_plan, v_global.max_features_per_plan),
    'max_trial_days', COALESCE(v_override.max_trial_days, v_global.max_trial_days_allowed),
    'tx_fee_max_percent', COALESCE(v_override.tx_fee_max_percent, v_global.max_platform_fee_percent),
    'tx_fee_max_fixed_cents', COALESCE(v_override.tx_fee_max_fixed_cents, (v_global.max_platform_fee_fixed * 100)::int),
    'has_override', v_override.partner_id IS NOT NULL
  );
END;
$$;
