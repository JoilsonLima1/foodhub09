
-- =============================================
-- STONE PAYMENT MODULE - Database Schema
-- =============================================

-- 1) payment_provider_accounts
CREATE TABLE IF NOT EXISTS public.payment_provider_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'partner', 'tenant')),
  scope_id UUID,
  provider TEXT NOT NULL DEFAULT 'stone',
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  integration_type TEXT NOT NULL CHECK (integration_type IN ('stone_online', 'stone_connect', 'stone_tef', 'stone_openbank')),
  credentials_encrypted JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  display_name TEXT,
  auto_capture BOOLEAN NOT NULL DEFAULT true,
  allow_partial_refund BOOLEAN NOT NULL DEFAULT true,
  payment_timeout_seconds INTEGER NOT NULL DEFAULT 300,
  last_tested_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) payment_provider_webhooks
CREATE TABLE IF NOT EXISTS public.payment_provider_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_account_id UUID NOT NULL REFERENCES public.payment_provider_accounts(id) ON DELETE CASCADE,
  webhook_url TEXT,
  webhook_secret_hash TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  events_filter TEXT[] DEFAULT '{}',
  last_received_at TIMESTAMPTZ,
  total_received INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) payment_provider_transactions
CREATE TABLE IF NOT EXISTS public.payment_provider_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  partner_id UUID,
  provider_account_id UUID NOT NULL REFERENCES public.payment_provider_accounts(id),
  internal_reference TEXT,
  internal_reference_type TEXT CHECK (internal_reference_type IN ('order', 'sale', 'invoice', 'subscription')),
  provider_reference TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled', 'refunded', 'failed', 'chargeback')),
  method TEXT CHECK (method IN ('credit_card', 'debit_card', 'pix', 'boleto', 'ted', 'other')),
  raw_provider_payload JSONB,
  idempotency_key TEXT UNIQUE,
  error_message TEXT,
  captured_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) payment_provider_events
CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  provider_account_id UUID REFERENCES public.payment_provider_accounts(id),
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  idempotency_key TEXT UNIQUE,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  process_status TEXT NOT NULL DEFAULT 'pending' CHECK (process_status IN ('pending', 'ok', 'retry', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) stone_global_settings
CREATE TABLE IF NOT EXISTS public.stone_global_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  allow_tenant_credentials BOOLEAN NOT NULL DEFAULT true,
  allow_partner_credentials BOOLEAN NOT NULL DEFAULT true,
  force_master_credentials BOOLEAN NOT NULL DEFAULT false,
  enabled_integration_types TEXT[] NOT NULL DEFAULT ARRAY['stone_online', 'stone_connect', 'stone_tef', 'stone_openbank'],
  platform_fee_enabled BOOLEAN NOT NULL DEFAULT false,
  platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) stone_audit_log
CREATE TABLE IF NOT EXISTS public.stone_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  scope_type TEXT,
  scope_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ppa_scope ON public.payment_provider_accounts(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_ppa_provider ON public.payment_provider_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_ppt_tenant ON public.payment_provider_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ppt_status ON public.payment_provider_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ppt_provider_ref ON public.payment_provider_transactions(provider_reference);
CREATE INDEX IF NOT EXISTS idx_ppe_tenant ON public.payment_provider_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ppe_status ON public.payment_provider_events(process_status);
CREATE INDEX IF NOT EXISTS idx_stone_audit_user ON public.stone_audit_log(user_id);

-- Enable RLS
ALTER TABLE public.payment_provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stone_global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stone_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Super Admins full access
CREATE POLICY "sa_full_provider_accounts" ON public.payment_provider_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "sa_full_provider_webhooks" ON public.payment_provider_webhooks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "sa_full_provider_transactions" ON public.payment_provider_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "sa_full_provider_events" ON public.payment_provider_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "sa_full_stone_settings" ON public.stone_global_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "sa_full_stone_audit" ON public.stone_audit_log FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- RLS: Tenants manage own provider accounts
CREATE POLICY "tenant_own_provider_accounts" ON public.payment_provider_accounts FOR ALL
  USING (
    scope_type = 'tenant' AND scope_id IN (
      SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND tenant_id IS NOT NULL
    )
  );

-- RLS: Tenants view own transactions
CREATE POLICY "tenant_own_transactions" ON public.payment_provider_transactions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND tenant_id IS NOT NULL
    )
  );

-- RLS: Tenants view own events
CREATE POLICY "tenant_own_events" ON public.payment_provider_events FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND tenant_id IS NOT NULL
    )
  );

-- RLS: Tenants view own webhooks (via provider account)
CREATE POLICY "tenant_own_webhooks" ON public.payment_provider_webhooks FOR ALL
  USING (
    provider_account_id IN (
      SELECT id FROM public.payment_provider_accounts
      WHERE scope_type = 'tenant' AND scope_id IN (
        SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND tenant_id IS NOT NULL
      )
    )
  );

-- Insert default global settings
INSERT INTO public.stone_global_settings (id) VALUES (gen_random_uuid());

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_stone_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ppa_updated_at BEFORE UPDATE ON public.payment_provider_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_stone_updated_at();

CREATE TRIGGER trg_ppw_updated_at BEFORE UPDATE ON public.payment_provider_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_stone_updated_at();

CREATE TRIGGER trg_ppt_updated_at BEFORE UPDATE ON public.payment_provider_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_stone_updated_at();

CREATE TRIGGER trg_sgs_updated_at BEFORE UPDATE ON public.stone_global_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_stone_updated_at();
