
-- ============================================
-- HARDENING: Idempotency + Cron Lock Infra
-- ============================================

-- 1) Unique index for invoice idempotency (partner + period)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_ar_invoices_idempotent
  ON public.partner_ar_invoices (partner_id, reference_period_start, reference_period_end)
  WHERE status != 'canceled';

-- 2) Cron runs lock table for phase-level idempotency
CREATE TABLE IF NOT EXISTS public.cron_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'all',
  period TEXT NOT NULL,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'skipped')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  results JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: only one successful run per job+phase+period
CREATE UNIQUE INDEX IF NOT EXISTS idx_cron_runs_unique_success
  ON public.cron_runs (job_name, phase, period)
  WHERE status = 'success';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_cron_runs_lookup
  ON public.cron_runs (job_name, period, status);

-- Enable RLS (service role only)
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

-- No public access policies — only service_role can read/write
-- (edge functions use service role key)

-- 3) Update get_partner_access_state to be purely state-based (compute from data, don't side-effect on every call)
CREATE OR REPLACE FUNCTION public.get_partner_access_state(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config partner_billing_config%ROWTYPE;
  v_overdue_count INTEGER;
  v_overdue_amount NUMERIC;
  v_max_days INTEGER;
  v_level INTEGER;
  v_action TEXT;
  v_blocked BOOLEAN := false;
  v_read_only BOOLEAN := false;
  v_message TEXT := '';
  v_access TEXT := 'full';
BEGIN
  SELECT * INTO v_config FROM partner_billing_config WHERE partner_id = p_partner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'access', 'full', 'dunning_level', 0, 'blocked', false, 
      'read_only', false, 'message', '', 'overdue_count', 0, 
      'overdue_amount', 0, 'max_days_overdue', 0
    );
  END IF;

  -- Compute from actual invoice data (SSOT)
  SELECT 
    COUNT(*), 
    COALESCE(SUM(amount), 0), 
    COALESCE(MAX(EXTRACT(DAY FROM now() - due_date)::INTEGER), 0)
  INTO v_overdue_count, v_overdue_amount, v_max_days
  FROM partner_ar_invoices
  WHERE partner_id = p_partner_id AND status = 'overdue';

  IF v_overdue_count = 0 THEN
    RETURN jsonb_build_object(
      'access', 'full', 'dunning_level', 0, 'blocked', false, 
      'read_only', false, 'message', '', 'overdue_count', 0, 
      'overdue_amount', 0, 'max_days_overdue', 0
    );
  END IF;

  -- Derive level from policy thresholds (state-based, no side effects here)
  v_level := 0;
  IF v_config.dunning_policy IS NOT NULL THEN
    IF v_max_days >= COALESCE((v_config.dunning_policy->'L4'->>'days_overdue')::INTEGER, 31) THEN
      v_level := 4; v_action := COALESCE(v_config.dunning_policy->'L4'->>'action', 'block');
    ELSIF v_max_days >= COALESCE((v_config.dunning_policy->'L3'->>'days_overdue')::INTEGER, 16) THEN
      v_level := 3; v_action := COALESCE(v_config.dunning_policy->'L3'->>'action', 'restrict');
    ELSIF v_max_days >= COALESCE((v_config.dunning_policy->'L2'->>'days_overdue')::INTEGER, 8) THEN
      v_level := 2; v_action := COALESCE(v_config.dunning_policy->'L2'->>'action', 'restrict');
    ELSIF v_max_days >= COALESCE((v_config.dunning_policy->'L1'->>'days_overdue')::INTEGER, 1) THEN
      v_level := 1; v_action := COALESCE(v_config.dunning_policy->'L1'->>'action', 'warn');
    END IF;
  ELSE
    -- Default thresholds if no policy configured
    IF v_max_days >= 31 THEN v_level := 4; v_action := 'block';
    ELSIF v_max_days >= 16 THEN v_level := 3; v_action := 'restrict';
    ELSIF v_max_days >= 8 THEN v_level := 2; v_action := 'restrict';
    ELSIF v_max_days >= 1 THEN v_level := 1; v_action := 'warn';
    END IF;
  END IF;

  -- Map action to access state
  IF v_action IN ('block', 'terminate') THEN
    v_blocked := true;
    v_access := 'blocked';
    v_message := 'Acesso bloqueado: ' || v_overdue_count || ' fatura(s) em atraso há ' || v_max_days || ' dias (R$ ' || ROUND(v_overdue_amount, 2) || '). Regularize para restaurar.';
  ELSIF v_action = 'restrict' THEN
    v_read_only := true;
    v_access := 'read_only';
    v_message := 'Acesso restrito: ' || v_overdue_count || ' fatura(s) em atraso há ' || v_max_days || ' dias (R$ ' || ROUND(v_overdue_amount, 2) || '). Regularize para evitar bloqueio.';
  ELSIF v_action = 'warn' THEN
    v_message := 'Atenção: ' || v_overdue_count || ' fatura(s) em atraso há ' || v_max_days || ' dias (R$ ' || ROUND(v_overdue_amount, 2) || '). Regularize para evitar restrições.';
  END IF;

  RETURN jsonb_build_object(
    'access', v_access,
    'dunning_level', v_level,
    'blocked', v_blocked,
    'read_only', v_read_only,
    'message', v_message,
    'overdue_count', v_overdue_count,
    'overdue_amount', v_overdue_amount,
    'max_days_overdue', v_max_days
  );
END;
$$;

-- 4) Update generate_partner_monthly_invoice to return existing invoice if already created (true idempotency)
CREATE OR REPLACE FUNCTION public.generate_partner_monthly_invoice(
  p_partner_id UUID,
  p_period TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config partner_billing_config%ROWTYPE;
  v_existing_invoice partner_ar_invoices%ROWTYPE;
  v_accrual JSONB;
  v_total_tx_fees NUMERIC;
  v_monthly_fee NUMERIC;
  v_total NUMERIC;
  v_inv_id UUID;
  v_inv_number TEXT;
  v_due_date DATE;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  SELECT * INTO v_config FROM partner_billing_config WHERE partner_id = p_partner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_billing_config');
  END IF;

  v_period_start := (p_period || '-01')::DATE;
  v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- IDEMPOTENCY: Return existing invoice if found (not canceled)
  SELECT * INTO v_existing_invoice
  FROM partner_ar_invoices
  WHERE partner_id = p_partner_id
    AND reference_period_start = v_period_start
    AND status != 'canceled'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'invoice_id', v_existing_invoice.id,
      'invoice_number', v_existing_invoice.invoice_number,
      'total', v_existing_invoice.amount,
      'due_date', v_existing_invoice.due_date,
      'status', v_existing_invoice.status
    );
  END IF;

  v_accrual := accrue_partner_tx_fees_for_period(p_partner_id, p_period);
  IF v_accrual->>'error' IS NOT NULL THEN
    RETURN v_accrual;
  END IF;

  v_total_tx_fees := COALESCE((v_accrual->>'total_tx_fees')::NUMERIC, 0);
  v_monthly_fee := v_config.monthly_fee_cents / 100.0;
  v_total := v_monthly_fee + v_total_tx_fees;

  v_due_date := (v_period_end + (v_config.billing_day || ' days')::INTERVAL)::DATE;
  v_inv_number := 'PAR-' || REPLACE(p_period, '-', '') || '-' || SUBSTRING(p_partner_id::TEXT, 1, 8);

  INSERT INTO partner_ar_invoices (
    partner_id, invoice_number, amount, currency, description,
    reference_period_start, reference_period_end, due_date, status, line_items
  ) VALUES (
    p_partner_id, v_inv_number, v_total, 'BRL',
    'Fatura mensal — período ' || to_char(v_period_start, 'MM/YYYY'),
    v_period_start, v_period_end, v_due_date, 'pending',
    jsonb_build_array(
      jsonb_build_object('type', 'monthly_fee', 'description', 'Mensalidade plataforma', 'amount', v_monthly_fee),
      jsonb_build_object('type', 'tx_fee', 'description', 'Taxa sobre assinaturas pagas (' || (v_accrual->>'invoices_processed') || ' faturas)', 'amount', v_total_tx_fees)
    )
  )
  RETURNING id INTO v_inv_id;

  INSERT INTO partner_ar_invoice_items (ar_invoice_id, item_type, description, quantity, unit_amount_cents, total_cents)
  VALUES
    (v_inv_id, 'monthly_fee', 'Mensalidade plataforma', 1, v_config.monthly_fee_cents, v_config.monthly_fee_cents),
    (v_inv_id, 'tx_fee', 'Taxa sobre assinaturas pagas — período ' || p_period, COALESCE((v_accrual->>'invoices_processed')::INTEGER, 0), 0, (v_total_tx_fees * 100)::INTEGER);

  -- Handle refund/reversal entries (negative amounts in ledger)
  UPDATE partner_fee_ledger
  SET ar_invoice_id = v_inv_id, status = 'invoiced'
  WHERE partner_id = p_partner_id AND period = p_period AND status IN ('accrued', 'reversal');

  UPDATE partner_billing_config SET last_invoice_period = p_period WHERE partner_id = p_partner_id;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'invoice_id', v_inv_id,
    'invoice_number', v_inv_number,
    'total', v_total,
    'monthly_fee', v_monthly_fee,
    'tx_fees', v_total_tx_fees,
    'due_date', v_due_date
  );
END;
$$;
