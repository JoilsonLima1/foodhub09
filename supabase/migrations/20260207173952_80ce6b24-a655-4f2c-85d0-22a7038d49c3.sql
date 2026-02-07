-- ============================================================
-- PHASE 7: COMPLIANCE, AUDIT, OBSERVABILITY, ANTI-FRAUD
-- 100% ADDITIVE - NO MODIFICATIONS TO EXISTING TABLES/RPCS
-- ============================================================

-- ============================================================
-- 1. FINANCIAL AUDIT LOG (IMMUTABLE TRAIL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'webhook', 'admin', 'partner', 'tenant')),
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  correlation_id TEXT,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_entity 
  ON public.financial_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_actor 
  ON public.financial_audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_correlation 
  ON public.financial_audit_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_action 
  ON public.financial_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_created 
  ON public.financial_audit_log(created_at DESC);

-- RLS: Only super_admin can read audit logs
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit logs"
  ON public.financial_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 2. OPERATIONAL LOGS (STRUCTURED LOGGING)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.operational_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('webhook', 'rpc', 'settlement', 'payout', 'reconciliation', 'security', 'system')),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  correlation_id TEXT,
  partner_id UUID,
  tenant_id UUID,
  provider_payment_id TEXT,
  event_id UUID,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_operational_logs_scope 
  ON public.operational_logs(scope, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_logs_level 
  ON public.operational_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_logs_correlation 
  ON public.operational_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_operational_logs_partner 
  ON public.operational_logs(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_logs_tenant 
  ON public.operational_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_logs_payment 
  ON public.operational_logs(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_operational_logs_created 
  ON public.operational_logs(created_at DESC);

-- RLS: Super admins and partners can view their logs
ALTER TABLE public.operational_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all logs"
  ON public.operational_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 3. RATE LIMITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window 
  ON public.rate_limits(window_start);

-- ============================================================
-- 4. FRAUD FLAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id),
  tenant_id UUID REFERENCES public.tenants(id),
  type TEXT NOT NULL CHECK (type IN (
    'chargeback_spike', 
    'refund_spike', 
    'webhook_anomaly', 
    'payout_anomaly',
    'velocity_abuse',
    'amount_anomaly',
    'pattern_suspicious'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL DEFAULT '{}',
  source_event_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_partner 
  ON public.fraud_flags(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_tenant 
  ON public.fraud_flags(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_type 
  ON public.fraud_flags(type, severity);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status 
  ON public.fraud_flags(status);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity 
  ON public.fraud_flags(severity, created_at DESC);

-- RLS
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage fraud flags"
  ON public.fraud_flags FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 5. OPERATIONAL ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'webhook_failures',
    'reconciliation_mismatch', 
    'payout_failed',
    'integrity_failed',
    'fraud_high',
    'rate_limit_exceeded',
    'settlement_error',
    'provider_error'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  partner_id UUID REFERENCES public.partners(id),
  tenant_id UUID REFERENCES public.tenants(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  title TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  idempotency_key TEXT UNIQUE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_type 
  ON public.operational_alerts(type, status);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_severity 
  ON public.operational_alerts(severity, status);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_partner 
  ON public.operational_alerts(partner_id);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_status 
  ON public.operational_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_created 
  ON public.operational_alerts(created_at DESC);

-- RLS
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage alerts"
  ON public.operational_alerts FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));