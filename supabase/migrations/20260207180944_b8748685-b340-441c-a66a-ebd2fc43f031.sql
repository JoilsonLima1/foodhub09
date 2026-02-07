-- =====================================================
-- PHASE 9: SCALE, PERFORMANCE, RESILIENCE & HARDENING
-- 100% ADDITIVE - NO BREAKING CHANGES
-- =====================================================

-- =====================================================
-- PART 1: PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payment_events_provider_payment_id 
  ON public.payment_events(provider, provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_partner_received 
  ON public.payment_events(partner_id, received_at);

CREATE INDEX IF NOT EXISTS idx_payment_events_tenant_received 
  ON public.payment_events(tenant_id, received_at);

CREATE INDEX IF NOT EXISTS idx_payment_events_status_received 
  ON public.payment_events(status, received_at);

CREATE INDEX IF NOT EXISTS idx_transaction_effects_source_event 
  ON public.transaction_effects(source_event_id);

CREATE INDEX IF NOT EXISTS idx_transaction_effects_target_created 
  ON public.transaction_effects(target, created_at);

CREATE INDEX IF NOT EXISTS idx_transaction_effects_direction_target 
  ON public.transaction_effects(direction, target);

CREATE INDEX IF NOT EXISTS idx_settlements_partner_period 
  ON public.settlements(partner_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_settlement_status 
  ON public.partner_payouts(partner_id, settlement_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_reconciliation_provider_checked_status 
  ON public.financial_reconciliation(provider, checked_at, status);

CREATE INDEX IF NOT EXISTS idx_disputes_partner_status_opened 
  ON public.disputes(partner_id, status, opened_at);

CREATE INDEX IF NOT EXISTS idx_ops_recommendations_status_created_type 
  ON public.ops_recommendations(status, created_at, type);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_severity_created 
  ON public.operational_alerts(severity, created_at);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_status_created 
  ON public.operational_alerts(status, created_at);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity_created 
  ON public.fraud_flags(severity, created_at);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_status_created 
  ON public.fraud_flags(status, created_at);

-- =====================================================
-- PART 2: READ-ONLY OPTIMIZED VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.v_partner_financial_kpis AS
SELECT 
  p.id AS partner_id,
  p.name AS partner_name,
  DATE_TRUNC('day', pe.received_at) AS period_day,
  DATE_TRUNC('week', pe.received_at) AS period_week,
  DATE_TRUNC('month', pe.received_at) AS period_month,
  COUNT(DISTINCT pe.id) AS total_events,
  COUNT(DISTINCT CASE WHEN pe.event_type = 'PAYMENT_CONFIRMED' THEN pe.id END) AS confirmed_payments,
  COUNT(DISTINCT CASE WHEN pe.event_type IN ('PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK') THEN pe.id END) AS refunds_chargebacks,
  COALESCE(SUM(CASE WHEN te.direction = 'credit' AND te.target = 'partner' THEN te.amount ELSE 0 END), 0) AS total_credited,
  COALESCE(SUM(CASE WHEN te.direction = 'debit' AND te.target = 'partner' THEN te.amount ELSE 0 END), 0) AS total_debited,
  COALESCE(SUM(CASE WHEN te.direction = 'credit' AND te.target = 'platform' THEN te.amount ELSE 0 END), 0) AS platform_fees,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'open') AS open_disputes
FROM public.partners p
LEFT JOIN public.payment_events pe ON pe.partner_id = p.id
LEFT JOIN public.transaction_effects te ON te.source_event_id = pe.id
LEFT JOIN public.disputes d ON d.partner_id = p.id AND d.source_event_id = pe.id
GROUP BY p.id, p.name, DATE_TRUNC('day', pe.received_at), DATE_TRUNC('week', pe.received_at), DATE_TRUNC('month', pe.received_at);

CREATE OR REPLACE VIEW public.v_ops_backoffice_summary AS
SELECT 
  (SELECT COUNT(*) FROM public.operational_alerts WHERE acknowledged_at IS NULL AND severity IN ('critical', 'high')) AS critical_alerts_open,
  (SELECT COUNT(*) FROM public.operational_alerts WHERE acknowledged_at IS NULL) AS total_alerts_open,
  (SELECT COUNT(*) FROM public.financial_reconciliation WHERE status = 'mismatch') AS reconciliation_mismatches,
  (SELECT COUNT(*) FROM public.partner_payouts WHERE status = 'failed') AS payouts_failed,
  (SELECT COUNT(*) FROM public.partner_payouts WHERE status = 'pending') AS payouts_pending,
  (SELECT COUNT(*) FROM public.disputes WHERE status IN ('open', 'investigating')) AS disputes_open,
  (SELECT COUNT(*) FROM public.ops_recommendations WHERE status = 'pending') AS recommendations_pending,
  (SELECT COUNT(*) FROM public.fraud_flags WHERE status != 'resolved' AND severity IN ('high', 'critical')) AS high_risk_fraud_flags,
  (SELECT COUNT(*) FROM public.payment_events WHERE received_at > NOW() - INTERVAL '24 hours') AS events_last_24h,
  (SELECT COUNT(*) FROM public.payment_events WHERE received_at > NOW() - INTERVAL '1 hour') AS events_last_hour;

-- =====================================================
-- PART 3: ARCHIVE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_events_archive (
  id UUID PRIMARY KEY,
  provider TEXT,
  provider_event_id TEXT,
  provider_payment_id TEXT,
  event_type TEXT,
  tenant_id UUID,
  partner_id UUID,
  amount_gross NUMERIC,
  amount_net NUMERIC,
  currency TEXT,
  payment_method TEXT,
  occurred_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  payload JSONB,
  correlation_id TEXT,
  status TEXT,
  applied_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_archive_received 
  ON public.payment_events_archive(received_at);

CREATE INDEX IF NOT EXISTS idx_payment_events_archive_provider 
  ON public.payment_events_archive(provider, provider_payment_id);

CREATE TABLE IF NOT EXISTS public.transaction_effects_archive (
  id UUID PRIMARY KEY,
  source_event_id UUID,
  target TEXT,
  target_record_id UUID,
  direction TEXT,
  amount NUMERIC,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_effects_archive_source 
  ON public.transaction_effects_archive(source_event_id);

CREATE INDEX IF NOT EXISTS idx_transaction_effects_archive_created 
  ON public.transaction_effects_archive(created_at);

-- =====================================================
-- PART 4: UNION VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.payment_events_all AS
SELECT id, provider, provider_event_id, provider_payment_id, event_type,
       tenant_id, partner_id, amount_gross, amount_net, currency, payment_method,
       occurred_at, received_at, payload, correlation_id, status, applied_at,
       error_message, created_at, updated_at,
       false AS is_archived 
FROM public.payment_events
UNION ALL
SELECT id, provider, provider_event_id, provider_payment_id, event_type,
       tenant_id, partner_id, amount_gross, amount_net, currency, payment_method,
       occurred_at, received_at, payload, correlation_id, status, applied_at,
       error_message, created_at, updated_at,
       true AS is_archived 
FROM public.payment_events_archive;

CREATE OR REPLACE VIEW public.transaction_effects_all AS
SELECT id, source_event_id, target, target_record_id, direction, amount,
       reason, metadata, created_at,
       false AS is_archived 
FROM public.transaction_effects
UNION ALL
SELECT id, source_event_id, target, target_record_id, direction, amount,
       reason, metadata, created_at,
       true AS is_archived 
FROM public.transaction_effects_archive;

-- =====================================================
-- PART 5: APPLY QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.apply_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.payment_events(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'done', 'failed', 'dead_letter')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_apply_queue_status_next 
  ON public.apply_queue(status, next_attempt_at) WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_apply_queue_event_id 
  ON public.apply_queue(event_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apply_queue_event_unique 
  ON public.apply_queue(event_id) WHERE status NOT IN ('done', 'dead_letter');

-- =====================================================
-- PART 6: OPS METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ops_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  provider TEXT,
  events_received INT DEFAULT 0,
  events_applied_ok INT DEFAULT 0,
  events_apply_error INT DEFAULT 0,
  duplicates_ignored INT DEFAULT 0,
  avg_apply_duration_ms NUMERIC(10,2),
  p95_apply_duration_ms NUMERIC(10,2),
  queue_lag_p95_seconds NUMERIC(10,2),
  reconciliation_mismatch_count INT DEFAULT 0,
  payout_failed_count INT DEFAULT 0,
  payout_success_count INT DEFAULT 0,
  disputes_opened_count INT DEFAULT 0,
  disputes_resolved_count INT DEFAULT 0,
  total_volume_processed NUMERIC(20,2) DEFAULT 0,
  platform_revenue NUMERIC(20,2) DEFAULT 0,
  partner_payouts_total NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date, provider)
);

CREATE INDEX IF NOT EXISTS idx_ops_metrics_daily_date 
  ON public.ops_metrics_daily(metric_date);

-- =====================================================
-- PART 7: FEATURE FLAGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_feature_flags (flag_key, enabled, description)
VALUES 
  ('async_apply_queue', false, 'When enabled, webhook enqueues events for async processing'),
  ('materialized_views_enabled', false, 'When enabled, dashboard uses materialized views'),
  ('archive_ledger_enabled', true, 'When enabled, housekeeping job archives old ledger entries')
ON CONFLICT (flag_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.apply_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_effects_archive ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using user_roles table for super_admin check)
CREATE POLICY "Super admins can manage apply_queue"
  ON public.apply_queue FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Super admins can manage ops_metrics"
  ON public.ops_metrics_daily FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Super admins can manage feature_flags"
  ON public.system_feature_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Super admins can read payment_events_archive"
  ON public.payment_events_archive FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Super admins can read transaction_effects_archive"
  ON public.transaction_effects_archive FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));