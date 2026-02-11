
-- ====================================================
-- PIX AUTOMÁTICO SEM CPF - Schema
-- ====================================================

-- 1) PSP Providers catalog
CREATE TABLE public.pix_psp_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  supports_txid BOOLEAN NOT NULL DEFAULT true,
  supports_webhook BOOLEAN NOT NULL DEFAULT true,
  supports_subaccount BOOLEAN NOT NULL DEFAULT false,
  supports_split BOOLEAN NOT NULL DEFAULT false,
  pricing_model TEXT NOT NULL DEFAULT 'percentual' CHECK (pricing_model IN ('percentual', 'fixo', 'hibrido')),
  default_percent_fee NUMERIC(5,4) NOT NULL DEFAULT 0,
  default_fixed_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  api_docs_url TEXT,
  webhook_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_psp_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage PSP providers"
  ON public.pix_psp_providers FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can view active PSP providers"
  ON public.pix_psp_providers FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- 2) Tenant PSP Accounts (subcontas)
CREATE TABLE public.tenant_psp_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  psp_provider_id UUID NOT NULL REFERENCES public.pix_psp_providers(id) ON DELETE CASCADE,
  subaccount_id TEXT,
  api_key_encrypted TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected', 'not_required')),
  kyc_submitted_at TIMESTAMPTZ,
  kyc_approved_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, psp_provider_id)
);

ALTER TABLE public.tenant_psp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage tenant PSP accounts"
  ON public.tenant_psp_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view own PSP accounts"
  ON public.tenant_psp_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid() AND p.tenant_id = tenant_psp_accounts.tenant_id
      AND ur.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Tenant admins can update own PSP accounts"
  ON public.tenant_psp_accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid() AND p.tenant_id = tenant_psp_accounts.tenant_id
      AND ur.role = 'admin'
    )
  );

-- 3) PIX Pricing Plans
CREATE TABLE public.pix_pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  pricing_type TEXT NOT NULL DEFAULT 'percentual' CHECK (pricing_type IN ('percentual', 'fixo', 'hibrido')),
  percent_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  fixed_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_fee NUMERIC(10,2),
  free_until TIMESTAMPTZ,
  is_subsidized BOOLEAN NOT NULL DEFAULT false,
  subsidy_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage PIX pricing plans"
  ON public.pix_pricing_plans FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can view active PIX pricing plans"
  ON public.pix_pricing_plans FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- 4) PIX Availability Rules (motor de decisão)
CREATE TABLE public.pix_availability_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'partner', 'tenant', 'plan', 'category')),
  scope_id TEXT,
  psp_provider_id UUID REFERENCES public.pix_psp_providers(id) ON DELETE CASCADE,
  pricing_plan_id UUID REFERENCES public.pix_pricing_plans(id) ON DELETE SET NULL,
  priority INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope, scope_id, psp_provider_id)
);

ALTER TABLE public.pix_availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage PIX availability rules"
  ON public.pix_availability_rules FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can view enabled PIX rules"
  ON public.pix_availability_rules FOR SELECT
  USING (is_enabled = true AND auth.role() = 'authenticated');

-- 5) PIX Transactions log
CREATE TABLE public.pix_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  store_id UUID REFERENCES public.stores(id),
  order_id UUID REFERENCES public.orders(id),
  psp_provider_id UUID NOT NULL REFERENCES public.pix_psp_providers(id),
  txid TEXT NOT NULL,
  e2e_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  psp_fee NUMERIC(10,2) DEFAULT 0,
  platform_fee NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2) DEFAULT 0,
  pricing_plan_id UUID REFERENCES public.pix_pricing_plans(id),
  qr_code TEXT,
  qr_code_url TEXT,
  pix_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled', 'refunded', 'error')),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  webhook_received_at TIMESTAMPTZ,
  webhook_payload JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pix_transactions_tenant ON public.pix_transactions(tenant_id);
CREATE INDEX idx_pix_transactions_txid ON public.pix_transactions(txid);
CREATE INDEX idx_pix_transactions_status ON public.pix_transactions(status);
CREATE INDEX idx_pix_transactions_order ON public.pix_transactions(order_id);

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all PIX transactions"
  ON public.pix_transactions FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view own PIX transactions"
  ON public.pix_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.tenant_id = pix_transactions.tenant_id
    )
  );

CREATE POLICY "System can insert PIX transactions"
  ON public.pix_transactions FOR INSERT
  WITH CHECK (true);

-- 6) RPC: Resolve PIX config for a tenant (priority: tenant > partner > plan > category > global)
CREATE OR REPLACE FUNCTION public.resolve_pix_config(p_tenant_id UUID)
RETURNS TABLE(
  psp_provider_id UUID,
  psp_name TEXT,
  psp_display_name TEXT,
  pricing_plan_id UUID,
  pricing_plan_name TEXT,
  percent_rate NUMERIC,
  fixed_rate NUMERIC,
  min_fee NUMERIC,
  max_fee NUMERIC,
  is_subsidized BOOLEAN,
  rule_scope TEXT,
  rule_priority INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_partner_id TEXT;
  v_plan_slug TEXT;
  v_category TEXT;
BEGIN
  SELECT t.partner_id::TEXT, sp.slug, t.business_category
  INTO v_partner_id, v_plan_slug, v_category
  FROM tenants t
  LEFT JOIN subscriptions s ON s.tenant_id = t.id
  LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE t.id = p_tenant_id;

  RETURN QUERY
  WITH ranked_rules AS (
    SELECT DISTINCT ON (r.psp_provider_id)
      r.psp_provider_id,
      p.name AS psp_name,
      p.display_name AS psp_display_name,
      r.pricing_plan_id,
      pp.name AS pricing_plan_name,
      COALESCE(pp.percent_rate, p.default_percent_fee) AS percent_rate,
      COALESCE(pp.fixed_rate, p.default_fixed_fee) AS fixed_rate,
      COALESCE(pp.min_fee, 0::numeric) AS min_fee,
      pp.max_fee,
      COALESCE(pp.is_subsidized, false) AS is_subsidized,
      r.scope AS rule_scope,
      CASE r.scope
        WHEN 'tenant' THEN 5
        WHEN 'partner' THEN 4
        WHEN 'plan' THEN 3
        WHEN 'category' THEN 2
        WHEN 'global' THEN 1
        ELSE 0
      END AS rule_priority
    FROM pix_availability_rules r
    JOIN pix_psp_providers p ON p.id = r.psp_provider_id AND p.is_active = true
    LEFT JOIN pix_pricing_plans pp ON pp.id = r.pricing_plan_id AND pp.is_active = true
    WHERE r.is_enabled = true
      AND (
        (r.scope = 'tenant' AND r.scope_id = p_tenant_id::TEXT)
        OR (r.scope = 'partner' AND r.scope_id = v_partner_id)
        OR (r.scope = 'plan' AND r.scope_id = v_plan_slug)
        OR (r.scope = 'category' AND r.scope_id = v_category)
        OR (r.scope = 'global' AND r.scope_id IS NULL)
      )
    ORDER BY r.psp_provider_id,
      CASE r.scope
        WHEN 'tenant' THEN 5
        WHEN 'partner' THEN 4
        WHEN 'plan' THEN 3
        WHEN 'category' THEN 2
        WHEN 'global' THEN 1
        ELSE 0
      END DESC
  )
  SELECT * FROM ranked_rules
  ORDER BY ranked_rules.rule_priority DESC;
END;
$$;

-- Seed initial PSP providers
INSERT INTO public.pix_psp_providers (name, display_name, description, supports_txid, supports_webhook, supports_subaccount, pricing_model, default_percent_fee, default_fixed_fee, is_active)
VALUES
  ('openpix', 'OpenPix', 'PIX instantâneo com QR dinâmico, TXID e webhook. Sem exigência de CPF.', true, true, true, 'hibrido', 0.0080, 0.00, false),
  ('woovi', 'Woovi', 'PIX com QR dinâmico e suporte a PIX parcelado. TXID e webhook integrados.', true, true, false, 'percentual', 0.0089, 0.00, false),
  ('celcoin', 'Celcoin', 'Infraestrutura bancária robusta com subcontas, TXID e webhook.', true, true, true, 'hibrido', 0.0075, 0.20, false);

-- Seed default pricing plans
INSERT INTO public.pix_pricing_plans (name, slug, description, pricing_type, percent_rate, fixed_rate, min_fee, is_active, display_order)
VALUES
  ('PIX Econômico', 'pix-economico', 'Taxa reduzida para alto volume', 'percentual', 0.0050, 0.00, 0.01, true, 1),
  ('PIX Padrão', 'pix-padrao', 'Taxa padrão para todos os lojistas', 'percentual', 0.0099, 0.00, 0.01, true, 2),
  ('PIX Premium', 'pix-premium', 'Menor taxa com subsídio da plataforma', 'percentual', 0.0030, 0.00, 0.01, true, 3);

-- Update triggers
CREATE TRIGGER update_pix_psp_providers_updated_at
  BEFORE UPDATE ON public.pix_psp_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_psp_accounts_updated_at
  BEFORE UPDATE ON public.tenant_psp_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pix_pricing_plans_updated_at
  BEFORE UPDATE ON public.pix_pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pix_availability_rules_updated_at
  BEFORE UPDATE ON public.pix_availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pix_transactions_updated_at
  BEFORE UPDATE ON public.pix_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
