-- =====================================================
-- PHASE 8: BACKOFFICE OPERACIONAL (100% ADDITIVE)
-- =====================================================

-- 1. OPS RECOMMENDATIONS TABLE (action queue for safe corrections)
CREATE TABLE IF NOT EXISTS public.ops_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('missing_event', 'mismatch_amount', 'orphan_payment', 'unlinked_payment', 'duplicate_suspected', 'manual_review')),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  partner_id UUID REFERENCES public.partners(id),
  suggested_action TEXT NOT NULL CHECK (suggested_action IN ('reprocess', 'insert_synthetic_event', 'link_payment', 'manual_review', 'dismiss')),
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'applied', 'failed')),
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  error_message TEXT,
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_recommendations_status ON public.ops_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ops_recommendations_type ON public.ops_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_ops_recommendations_provider ON public.ops_recommendations(provider);
CREATE INDEX IF NOT EXISTS idx_ops_recommendations_created_at ON public.ops_recommendations(created_at DESC);

-- 2. DISPUTES TABLE (chargeback/refund workflow tracking)
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'asaas',
  provider_payment_id TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  partner_id UUID REFERENCES public.partners(id),
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('chargeback', 'refund', 'partial_refund')),
  status TEXT NOT NULL DEFAULT 'opened' CHECK (status IN ('opened', 'under_review', 'evidence_requested', 'won', 'lost', 'closed')),
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  opened_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  evidence_deadline_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  source_event_id UUID,
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_type ON public.disputes(dispute_type);
CREATE INDEX IF NOT EXISTS idx_disputes_tenant ON public.disputes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_partner ON public.disputes(partner_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_at ON public.disputes(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_provider_payment ON public.disputes(provider, provider_payment_id);

-- 3. DISPUTE TIMELINE TABLE (audit trail for dispute actions)
CREATE TABLE IF NOT EXISTS public.dispute_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'status_change', 'note_added', 'evidence_added', 'escalated', 'resolved', 'reopened')),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'partner', 'provider')),
  actor_id UUID,
  previous_status TEXT,
  new_status TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_timeline_dispute ON public.dispute_timeline(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_timeline_created ON public.dispute_timeline(created_at DESC);

-- 4. ARCHIVE TABLES FOR LOG RETENTION
CREATE TABLE IF NOT EXISTS public.operational_logs_archive (
  id UUID PRIMARY KEY,
  correlation_id TEXT,
  scope TEXT,
  level TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_logs_archive_correlation ON public.operational_logs_archive(correlation_id);
CREATE INDEX IF NOT EXISTS idx_op_logs_archive_created ON public.operational_logs_archive(created_at DESC);

CREATE TABLE IF NOT EXISTS public.financial_audit_log_archive (
  id UUID PRIMARY KEY,
  entity_type TEXT,
  entity_id UUID,
  action TEXT,
  actor_type TEXT,
  actor_id UUID,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_audit_archive_entity ON public.financial_audit_log_archive(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit_archive_created ON public.financial_audit_log_archive(created_at DESC);

-- 5. ADD DEDUPE KEYS TO EXISTING TABLES (SAFE - only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'operational_alerts' AND column_name = 'dedupe_key') THEN
    ALTER TABLE public.operational_alerts ADD COLUMN dedupe_key TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'fraud_flags' AND column_name = 'dedupe_key') THEN
    ALTER TABLE public.fraud_flags ADD COLUMN dedupe_key TEXT;
  END IF;
END $$;

-- Create unique indexes for dedupe (if not exist)
CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_alerts_dedupe ON public.operational_alerts(dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fraud_flags_dedupe ON public.fraud_flags(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- 6. ENABLE RLS ON NEW TABLES
ALTER TABLE public.ops_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_logs_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_log_archive ENABLE ROW LEVEL SECURITY;

-- Super admin policies (read/write)
CREATE POLICY "Super admins can manage ops_recommendations"
  ON public.ops_recommendations FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage disputes"
  ON public.disputes FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view dispute_timeline"
  ON public.dispute_timeline FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage log archives"
  ON public.operational_logs_archive FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage audit archives"
  ON public.financial_audit_log_archive FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Partners can view their own disputes (read-only) via partner_users
CREATE POLICY "Partners can view own disputes"
  ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = disputes.partner_id
        AND pu.user_id = auth.uid()
    )
  );

-- Partners can view their own dispute timeline
CREATE POLICY "Partners can view own dispute timeline"
  ON public.dispute_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.partner_users pu ON pu.partner_id = d.partner_id
      WHERE d.id = dispute_timeline.dispute_id
        AND pu.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_phase8()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ops_recommendations_updated
  BEFORE UPDATE ON public.ops_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_phase8();

CREATE TRIGGER trg_disputes_updated
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_phase8();