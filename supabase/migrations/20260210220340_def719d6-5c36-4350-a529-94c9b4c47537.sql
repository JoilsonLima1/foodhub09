
-- =====================================================
-- BLOCO 1: Per-plan config - Free = 0%
-- =====================================================

-- Atualizar per_plan_config para Free = 0%
UPDATE public.platform_fee_config
SET per_plan_config = jsonb_set(
  per_plan_config,
  '{free}',
  '{"percent": 0, "fixed": 0}'::jsonb
),
updated_at = now();

-- =====================================================
-- BLOCO 3a: Guardrail - Idempotência webhook via UNIQUE constraint
-- =====================================================

-- Adicionar constraint de idempotência no payment_events (provider_payment_id + event_type)
-- Primeiro verificar se já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payment_events_idempotency'
  ) THEN
    CREATE UNIQUE INDEX idx_payment_events_idempotency 
      ON public.payment_events (provider_payment_id, event_type)
      WHERE status = 'pending';
  END IF;
END $$;

-- =====================================================
-- BLOCO 3b: Guardrail - Email único por subconta Asaas
-- =====================================================

-- Índice único no provider_account_id para evitar subcontas duplicadas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_partner_payment_accounts_provider_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_partner_payment_accounts_provider_unique
      ON public.partner_payment_accounts (provider, provider_account_id)
      WHERE provider_account_id IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- BLOCO 3c: Guardrail - Função de alerta de falha de cron
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_cron_health(p_hours_lookback INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_failed_runs INTEGER;
  v_missing_phases JSONB;
  v_last_success TIMESTAMPTZ;
BEGIN
  -- Count failed runs in the lookback period
  SELECT COUNT(*) INTO v_failed_runs
  FROM public.cron_runs
  WHERE status = 'failed'
    AND started_at >= now() - (p_hours_lookback || ' hours')::interval;

  -- Find last successful complete cycle
  SELECT MAX(finished_at) INTO v_last_success
  FROM public.cron_runs
  WHERE status = 'done'
    AND started_at >= now() - interval '7 days';

  -- Check for phases that haven't run recently
  SELECT jsonb_agg(phase) INTO v_missing_phases
  FROM (
    SELECT phase FROM unnest(ARRAY['A','B','C','D']) AS phase
    EXCEPT
    SELECT DISTINCT phase FROM public.cron_runs
    WHERE started_at >= now() - interval '48 hours'
      AND status = 'done'
  ) missing;

  v_result := jsonb_build_object(
    'healthy', v_failed_runs = 0 AND v_missing_phases IS NULL,
    'failed_runs_24h', v_failed_runs,
    'last_success', v_last_success,
    'missing_phases_48h', COALESCE(v_missing_phases, '[]'::jsonb),
    'checked_at', now()
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- BLOCO 2: Melhorar execute_partner_payout_v2 com auto-enqueue
-- =====================================================

-- Função para processar payouts pendentes em batch (chamada pelo cron ou edge function)
CREATE OR REPLACE FUNCTION public.process_pending_settlements_to_payouts(
  p_partner_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement RECORD;
  v_count INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
BEGIN
  -- Find approved settlements that don't have payout jobs yet
  FOR v_settlement IN
    SELECT s.id, s.partner_id, s.total_partner_net
    FROM public.settlements s
    JOIN public.partner_payment_accounts ppa ON ppa.partner_id = s.partner_id
    JOIN public.partner_settlement_configs psc ON psc.partner_id = s.partner_id
    WHERE s.status = 'approved'
      AND ppa.status = 'approved'
      AND psc.auto_payout_enabled = true
      AND (p_partner_id IS NULL OR s.partner_id = p_partner_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.payout_jobs pj
        WHERE pj.settlement_id = s.id
          AND pj.status NOT IN ('failed', 'cancelled')
      )
      AND s.total_partner_net >= COALESCE(psc.payout_min_amount, 0)
    ORDER BY s.created_at ASC
    LIMIT 20
  LOOP
    BEGIN
      PERFORM public.enqueue_payout_job(
        p_partner_id := v_settlement.partner_id,
        p_settlement_id := v_settlement.id
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'settlement_id', v_settlement.id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'enqueued', v_count,
    'errors', v_errors
  );
END;
$$;

-- Função de reconciliação: verificar se provider_transfers batem com payout_jobs
CREATE OR REPLACE FUNCTION public.reconcile_payout_transfers(
  p_partner_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orphaned_transfers INTEGER;
  v_missing_transfers INTEGER;
  v_amount_mismatch INTEGER;
BEGIN
  -- Transfers sem payout_job correspondente
  SELECT COUNT(*) INTO v_orphaned_transfers
  FROM public.provider_transfers pt
  WHERE pt.payout_job_id IS NULL
    AND (p_partner_id IS NULL OR pt.partner_id = p_partner_id);

  -- Payout jobs done sem provider_transfer
  SELECT COUNT(*) INTO v_missing_transfers
  FROM public.payout_jobs pj
  WHERE pj.status = 'done'
    AND pj.provider_transfer_id IS NULL
    AND (p_partner_id IS NULL OR pj.partner_id = p_partner_id);

  -- Payout jobs com amount diferente do provider_transfer
  SELECT COUNT(*) INTO v_amount_mismatch
  FROM public.payout_jobs pj
  JOIN public.provider_transfers pt ON pt.id::text = pj.provider_transfer_id
  WHERE pj.status = 'done'
    AND pj.amount != pt.amount
    AND (p_partner_id IS NULL OR pj.partner_id = p_partner_id);

  RETURN jsonb_build_object(
    'success', true,
    'orphaned_transfers', v_orphaned_transfers,
    'missing_transfers', v_missing_transfers,
    'amount_mismatches', v_amount_mismatch,
    'is_clean', (v_orphaned_transfers = 0 AND v_missing_transfers = 0 AND v_amount_mismatch = 0),
    'checked_at', now()
  );
END;
$$;
