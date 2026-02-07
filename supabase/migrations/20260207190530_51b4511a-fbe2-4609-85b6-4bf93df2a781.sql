-- =====================================================
-- PHASE 11: TENANT BILLING, DUNNING & LIFECYCLE (ADDITIVE)
-- =====================================================

-- 1. TENANT BILLING PROFILES
CREATE TABLE IF NOT EXISTS public.tenant_billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'asaas',
  provider_customer_id TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  billing_doc TEXT,
  billing_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'incomplete', 'blocked')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_billing_profiles_tenant ON public.tenant_billing_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_profiles_provider_customer ON public.tenant_billing_profiles(provider_customer_id);

-- 2. TENANT INVOICES
CREATE TABLE IF NOT EXISTS public.tenant_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.partner_plans(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'asaas',
  provider_payment_id TEXT UNIQUE,
  provider_payment_url TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'canceled', 'refunded', 'chargeback')),
  period_start DATE,
  period_end DATE,
  paid_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_tenant ON public.tenant_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_partner ON public.tenant_invoices(partner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_status ON public.tenant_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_due_date ON public.tenant_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_provider_payment ON public.tenant_invoices(provider_payment_id);

-- 3. SUBSCRIPTION CYCLES
CREATE TABLE IF NOT EXISTS public.subscription_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  invoice_id UUID REFERENCES public.tenant_invoices(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'overdue', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_cycles_tenant ON public.subscription_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_subscription ON public.subscription_cycles(subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_cycles_unique_period ON public.subscription_cycles(subscription_id, cycle_start, cycle_end);

-- 4. PARTNER DUNNING POLICIES
CREATE TABLE IF NOT EXISTS public.partner_dunning_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  grace_days INT NOT NULL DEFAULT 3,
  suspend_after_days INT NOT NULL DEFAULT 14,
  block_after_days INT NOT NULL DEFAULT 30,
  notify_schedule JSONB NOT NULL DEFAULT '[1, 3, 7, 14]',
  auto_cancel_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_cancel_after_days INT DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert global default policy (partner_id = NULL means global)
INSERT INTO public.partner_dunning_policies (id, partner_id, grace_days, suspend_after_days, block_after_days)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, 3, 14, 30)
ON CONFLICT DO NOTHING;

-- 5. BILLING NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.billing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.tenant_invoices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'inapp', 'sms')),
  template_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_notifications_tenant ON public.billing_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_invoice ON public.billing_notifications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_status ON public.billing_notifications(status);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_scheduled ON public.billing_notifications(scheduled_at) WHERE status = 'queued';

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.tenant_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_dunning_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;

-- Tenant Billing Profiles
CREATE POLICY "tbp_tenant_view" ON public.tenant_billing_profiles FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tbp_super_admin" ON public.tenant_billing_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "tbp_partner_view" ON public.tenant_billing_profiles FOR SELECT
  USING (partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid()));

-- Tenant Invoices
CREATE POLICY "ti_tenant_view" ON public.tenant_invoices FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "ti_super_admin" ON public.tenant_invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "ti_partner_view" ON public.tenant_invoices FOR SELECT
  USING (partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid()));

-- Subscription Cycles
CREATE POLICY "sc_tenant_view" ON public.subscription_cycles FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "sc_super_admin" ON public.subscription_cycles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- Partner Dunning Policies
CREATE POLICY "pdp_partner_manage" ON public.partner_dunning_policies FOR ALL
  USING (partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid()));

CREATE POLICY "pdp_super_admin" ON public.partner_dunning_policies FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- Billing Notifications
CREATE POLICY "bn_tenant_view" ON public.billing_notifications FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "bn_super_admin" ON public.billing_notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- =====================================================
-- TRIGGERS FOR updated_at
-- =====================================================

CREATE TRIGGER update_tenant_billing_profiles_updated_at
  BEFORE UPDATE ON public.tenant_billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_invoices_updated_at
  BEFORE UPDATE ON public.tenant_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_dunning_policies_updated_at
  BEFORE UPDATE ON public.partner_dunning_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();