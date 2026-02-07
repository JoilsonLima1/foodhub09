-- =====================================================
-- PHASE 12: Add-ons, Proration, Coupons, Entitlements
-- 100% ADDITIVE - NO CHANGES TO EXISTING TABLES
-- =====================================================

-- =====================================================
-- A) PARTNER ADD-ONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pricing_type TEXT NOT NULL DEFAULT 'recurring' CHECK (pricing_type IN ('recurring', 'one_time')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly') OR billing_period IS NULL),
  module_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_addons_partner ON public.partner_addons(partner_id);

ALTER TABLE public.partner_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage addons via partner_users"
  ON public.partner_addons FOR ALL
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Super admins access partner_addons"
  ON public.partner_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- B) PARTNER TENANT ADDON SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_tenant_addon_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.partner_addons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'pending', 'expired')),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ptas_tenant ON public.partner_tenant_addon_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptas_partner ON public.partner_tenant_addon_subscriptions(partner_id);
CREATE INDEX IF NOT EXISTS idx_ptas_addon ON public.partner_tenant_addon_subscriptions(addon_id);

ALTER TABLE public.partner_tenant_addon_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage ptas via partner_users"
  ON public.partner_tenant_addon_subscriptions FOR ALL
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Tenants view own addon subscriptions"
  ON public.partner_tenant_addon_subscriptions FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Super admins access ptas"
  ON public.partner_tenant_addon_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- C) PARTNER COUPONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  max_redemptions INTEGER,
  max_redemptions_per_tenant INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  applies_to TEXT NOT NULL DEFAULT 'any' CHECK (applies_to IN ('plan', 'addon', 'any')),
  min_amount NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_partner_coupon_code UNIQUE (partner_id, code)
);

CREATE INDEX IF NOT EXISTS idx_partner_coupons_partner ON public.partner_coupons(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_coupons_code ON public.partner_coupons(code);

ALTER TABLE public.partner_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage coupons via partner_users"
  ON public.partner_coupons FOR ALL
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Tenants view partner coupons via partner_tenants"
  ON public.partner_coupons FOR SELECT
  USING (
    partner_id IN (
      SELECT pt.partner_id FROM public.partner_tenants pt
      JOIN public.profiles p ON p.tenant_id = pt.tenant_id
      WHERE p.user_id = auth.uid()
    )
    AND is_active = true
    AND (valid_to IS NULL OR valid_to > now())
  );

CREATE POLICY "Super admins access partner_coupons"
  ON public.partner_coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- D) COUPON REDEMPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.partner_coupons(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.tenant_invoices(id),
  discount_amount NUMERIC(10, 2) NOT NULL,
  original_amount NUMERIC(10, 2) NOT NULL,
  final_amount NUMERIC(10, 2) NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_coupon_invoice_redemption UNIQUE (coupon_id, tenant_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_tenant ON public.coupon_redemptions(tenant_id);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view redemptions via partner_users"
  ON public.coupon_redemptions FOR SELECT
  USING (
    coupon_id IN (
      SELECT c.id FROM public.partner_coupons c
      JOIN public.partner_users pu ON pu.partner_id = c.partner_id
      WHERE pu.user_id = auth.uid() AND pu.is_active = true
    )
  );

CREATE POLICY "Tenants view own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Super admins access coupon_redemptions"
  ON public.coupon_redemptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- E) TENANT ENTITLEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tenant_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  entitlement_key TEXT NOT NULL,
  entitlement_value JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL CHECK (source IN ('plan', 'addon', 'policy', 'manual', 'promotion')),
  source_id UUID,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_entitlements_tenant ON public.tenant_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_entitlements_key ON public.tenant_entitlements(entitlement_key);

ALTER TABLE public.tenant_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view own entitlements"
  ON public.tenant_entitlements FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Partners manage entitlements via partner_users"
  ON public.tenant_entitlements FOR ALL
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Super admins access tenant_entitlements"
  ON public.tenant_entitlements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- F) PENDING COUPON APPLICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tenant_pending_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.partner_coupons(id) ON DELETE CASCADE,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('next_invoice', 'specific_addon')),
  target_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired', 'invalid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenant_pending_coupons_tenant ON public.tenant_pending_coupons(tenant_id);

ALTER TABLE public.tenant_pending_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage pending coupons"
  ON public.tenant_pending_coupons FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Super admins access tenant_pending_coupons"
  ON public.tenant_pending_coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- G) PLAN CHANGE PRORATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plan_change_prorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_plan_id UUID,
  to_plan_id UUID,
  from_plan_name TEXT,
  to_plan_name TEXT,
  days_remaining INTEGER NOT NULL,
  days_in_cycle INTEGER NOT NULL,
  from_amount NUMERIC(10, 2) NOT NULL,
  to_amount NUMERIC(10, 2) NOT NULL,
  proration_credit NUMERIC(10, 2) NOT NULL,
  proration_charge NUMERIC(10, 2) NOT NULL,
  net_amount NUMERIC(10, 2) NOT NULL,
  invoice_id UUID REFERENCES public.tenant_invoices(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'waived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plan_change_prorations_tenant ON public.plan_change_prorations(tenant_id);

ALTER TABLE public.plan_change_prorations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view own prorations"
  ON public.plan_change_prorations FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Partners view prorations via partner_tenants"
  ON public.plan_change_prorations FOR SELECT
  USING (
    tenant_id IN (
      SELECT pt.tenant_id FROM public.partner_tenants pt
      JOIN public.partner_users pu ON pu.partner_id = pt.partner_id
      WHERE pu.user_id = auth.uid() AND pu.is_active = true
    )
  );

CREATE POLICY "Super admins access plan_change_prorations"
  ON public.plan_change_prorations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_partner_addons_updated_at') THEN
    CREATE TRIGGER update_partner_addons_updated_at
      BEFORE UPDATE ON public.partner_addons
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ptas_updated_at') THEN
    CREATE TRIGGER update_ptas_updated_at
      BEFORE UPDATE ON public.partner_tenant_addon_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_partner_coupons_updated_at') THEN
    CREATE TRIGGER update_partner_coupons_updated_at
      BEFORE UPDATE ON public.partner_coupons
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;