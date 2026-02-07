-- =====================================================
-- PHASE 10: Split Real, Onboarding de Parceiros, Repasse Automático
-- 100% ADITIVO - NÃO ALTERA TABELAS/RPCS EXISTENTES
-- =====================================================

-- =====================================================
-- 1. TABELA: partner_payment_accounts (Onboarding/Subconta)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'asaas',
  provider_account_id TEXT,
  provider_wallet_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending', 'approved', 'rejected', 'disabled')),
  kyc_level TEXT NOT NULL DEFAULT 'none' CHECK (kyc_level IN ('none', 'basic', 'full')),
  capabilities JSONB NOT NULL DEFAULT '{"split": false, "transfers": false, "pix": false}'::jsonb,
  onboarding_url TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_payment_accounts_status ON public.partner_payment_accounts(status);
CREATE INDEX IF NOT EXISTS idx_partner_payment_accounts_provider ON public.partner_payment_accounts(provider);

ALTER TABLE public.partner_payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage partner payment accounts"
  ON public.partner_payment_accounts FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Partners can view own payment account"
  ON public.partner_payment_accounts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.partner_users pu 
    WHERE pu.partner_id = partner_payment_accounts.partner_id 
    AND pu.user_id = auth.uid() 
    AND pu.is_active = true
  ));

-- =====================================================
-- 2. TABELA: partner_settlement_configs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_settlement_configs (
  partner_id UUID PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  settlement_mode TEXT NOT NULL DEFAULT 'invoice' CHECK (settlement_mode IN ('split', 'invoice', 'manual')),
  payout_schedule TEXT NOT NULL DEFAULT 'weekly' CHECK (payout_schedule IN ('daily', 'weekly', 'biweekly', 'monthly', 'manual')),
  payout_min_amount NUMERIC(12,2) NOT NULL DEFAULT 100.00,
  chargeback_reserve_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  auto_payout_enabled BOOLEAN NOT NULL DEFAULT false,
  payout_day_of_week INTEGER CHECK (payout_day_of_week BETWEEN 0 AND 6),
  payout_day_of_month INTEGER CHECK (payout_day_of_month BETWEEN 1 AND 28),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_settlement_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage settlement configs"
  ON public.partner_settlement_configs FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Partners can view own settlement config"
  ON public.partner_settlement_configs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.partner_users pu 
    WHERE pu.partner_id = partner_settlement_configs.partner_id 
    AND pu.user_id = auth.uid() 
    AND pu.is_active = true
  ));

-- =====================================================
-- 3. TABELA: payout_jobs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payout_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  settlement_id UUID REFERENCES public.settlements(id),
  dedupe_key TEXT NOT NULL UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'done', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ,
  provider_transfer_id TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_jobs_status ON public.payout_jobs(status);
CREATE INDEX IF NOT EXISTS idx_payout_jobs_partner ON public.payout_jobs(partner_id);
CREATE INDEX IF NOT EXISTS idx_payout_jobs_scheduled ON public.payout_jobs(scheduled_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_payout_jobs_next_attempt ON public.payout_jobs(next_attempt_at) WHERE status IN ('queued', 'failed');

ALTER TABLE public.payout_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage payout jobs"
  ON public.payout_jobs FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Partners can view own payout jobs"
  ON public.payout_jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.partner_users pu 
    WHERE pu.partner_id = payout_jobs.partner_id 
    AND pu.user_id = auth.uid() 
    AND pu.is_active = true
  ));

-- =====================================================
-- 4. TABELA: provider_transfers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.provider_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'asaas',
  provider_transfer_id TEXT NOT NULL,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  settlement_id UUID REFERENCES public.settlements(id),
  payout_job_id UUID REFERENCES public.payout_jobs(id),
  amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2),
  fee NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'pending', 'confirmed', 'failed', 'reversed')),
  transfer_type TEXT NOT NULL DEFAULT 'payout' CHECK (transfer_type IN ('payout', 'split', 'refund')),
  bank_account_info JSONB,
  payload JSONB,
  error_message TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_transfer_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_transfers_partner ON public.provider_transfers(partner_id);
CREATE INDEX IF NOT EXISTS idx_provider_transfers_status ON public.provider_transfers(status);
CREATE INDEX IF NOT EXISTS idx_provider_transfers_settlement ON public.provider_transfers(settlement_id);

ALTER TABLE public.provider_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage provider transfers"
  ON public.provider_transfers FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Partners can view own transfers"
  ON public.provider_transfers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.partner_users pu 
    WHERE pu.partner_id = provider_transfers.partner_id 
    AND pu.user_id = auth.uid() 
    AND pu.is_active = true
  ));

-- =====================================================
-- 5. FEATURE FLAGS (using correct column names)
-- =====================================================
INSERT INTO public.system_feature_flags (flag_key, enabled, description)
VALUES 
  ('async_payout_jobs', true, 'Habilita processamento assíncrono de jobs de repasse'),
  ('split_payments_enabled', true, 'Habilita pagamentos com split quando disponível'),
  ('partner_onboarding_auto_sync', true, 'Sincroniza automaticamente status de onboarding do parceiro')
ON CONFLICT (flag_key) DO NOTHING;

-- =====================================================
-- 6. Triggers para updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_phase10_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_partner_payment_accounts_updated ON public.partner_payment_accounts;
CREATE TRIGGER trigger_partner_payment_accounts_updated
  BEFORE UPDATE ON public.partner_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_phase10_timestamps();

DROP TRIGGER IF EXISTS trigger_partner_settlement_configs_updated ON public.partner_settlement_configs;
CREATE TRIGGER trigger_partner_settlement_configs_updated
  BEFORE UPDATE ON public.partner_settlement_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_phase10_timestamps();

DROP TRIGGER IF EXISTS trigger_payout_jobs_updated ON public.payout_jobs;
CREATE TRIGGER trigger_payout_jobs_updated
  BEFORE UPDATE ON public.payout_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_phase10_timestamps();

DROP TRIGGER IF EXISTS trigger_provider_transfers_updated ON public.provider_transfers;
CREATE TRIGGER trigger_provider_transfers_updated
  BEFORE UPDATE ON public.provider_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_phase10_timestamps();