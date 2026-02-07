-- =====================================================
-- PHASE 9: RPCs FOR SCALE, RESILIENCE & OBSERVABILITY
-- =====================================================

-- =====================================================
-- RPC: Archive old ledger entries
-- =====================================================
CREATE OR REPLACE FUNCTION public.archive_ledger(before_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '90 days')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events_archived INT := 0;
  v_effects_archived INT := 0;
BEGIN
  -- Archive payment events older than before_date
  WITH archived_events AS (
    DELETE FROM public.payment_events
    WHERE received_at < before_date
      AND status = 'applied'
    RETURNING *
  )
  INSERT INTO public.payment_events_archive
  SELECT 
    id, provider, provider_event_id, provider_payment_id, event_type,
    tenant_id, partner_id, amount_gross, amount_net, currency, payment_method,
    occurred_at, received_at, payload, correlation_id, status, applied_at,
    error_message, created_at, updated_at, NOW()
  FROM archived_events;
  
  GET DIAGNOSTICS v_events_archived = ROW_COUNT;

  -- Archive transaction effects for archived events
  WITH archived_effects AS (
    DELETE FROM public.transaction_effects te
    WHERE NOT EXISTS (
      SELECT 1 FROM public.payment_events pe WHERE pe.id = te.source_event_id
    )
    RETURNING *
  )
  INSERT INTO public.transaction_effects_archive
  SELECT 
    id, source_event_id, target, target_record_id, direction, amount,
    reason, metadata, created_at, NOW()
  FROM archived_effects;
  
  GET DIAGNOSTICS v_effects_archived = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'events_archived', v_events_archived,
    'effects_archived', v_effects_archived,
    'archived_before', before_date
  );
END;
$$;

-- =====================================================
-- RPC: Enqueue event for async processing
-- =====================================================
CREATE OR REPLACE FUNCTION public.enqueue_apply_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.apply_queue (event_id, status, next_attempt_at)
  VALUES (p_event_id, 'queued', NOW())
  ON CONFLICT (event_id) WHERE status NOT IN ('done', 'dead_letter') 
  DO NOTHING;

  RETURN jsonb_build_object('success', true, 'event_id', p_event_id);
END;
$$;

-- =====================================================
-- RPC: Process apply queue (worker function)
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_apply_queue(
  p_batch_size INT DEFAULT 10,
  p_worker_id TEXT DEFAULT 'default'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_succeeded INT := 0;
  v_failed INT := 0;
  v_item RECORD;
  v_result JSONB;
BEGIN
  -- Lock and fetch queued items
  FOR v_item IN
    SELECT id, event_id, attempts, max_attempts
    FROM public.apply_queue
    WHERE status IN ('queued', 'failed')
      AND next_attempt_at <= NOW()
      AND (locked_by IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
    ORDER BY next_attempt_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;
    
    -- Mark as processing
    UPDATE public.apply_queue
    SET status = 'processing', 
        locked_by = p_worker_id, 
        locked_at = NOW(),
        attempts = attempts + 1
    WHERE id = v_item.id;

    BEGIN
      -- Try to apply the event
      SELECT public.apply_payment_event(v_item.event_id) INTO v_result;
      
      -- Mark as done
      UPDATE public.apply_queue
      SET status = 'done', 
          completed_at = NOW(), 
          locked_by = NULL, 
          locked_at = NULL
      WHERE id = v_item.id;
      
      v_succeeded := v_succeeded + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle failure
      IF v_item.attempts >= v_item.max_attempts THEN
        UPDATE public.apply_queue
        SET status = 'dead_letter',
            last_error = SQLERRM,
            locked_by = NULL,
            locked_at = NULL
        WHERE id = v_item.id;
      ELSE
        UPDATE public.apply_queue
        SET status = 'failed',
            last_error = SQLERRM,
            next_attempt_at = NOW() + (POWER(2, v_item.attempts) * INTERVAL '1 minute'),
            locked_by = NULL,
            locked_at = NULL
        WHERE id = v_item.id;
      END IF;
      
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'succeeded', v_succeeded,
    'failed', v_failed,
    'worker_id', p_worker_id
  );
END;
$$;

-- =====================================================
-- RPC: Compute daily ops metrics
-- =====================================================
CREATE OR REPLACE FUNCTION public.compute_ops_metrics(
  p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider TEXT;
  v_metrics RECORD;
BEGIN
  -- Compute metrics for each provider
  FOR v_provider IN SELECT DISTINCT provider FROM public.payment_events WHERE received_at::DATE = p_date
  LOOP
    INSERT INTO public.ops_metrics_daily (
      metric_date,
      provider,
      events_received,
      events_applied_ok,
      events_apply_error,
      duplicates_ignored,
      reconciliation_mismatch_count,
      payout_failed_count,
      payout_success_count,
      disputes_opened_count,
      disputes_resolved_count,
      total_volume_processed,
      platform_revenue,
      partner_payouts_total
    )
    SELECT
      p_date,
      v_provider,
      COUNT(*) FILTER (WHERE received_at::DATE = p_date),
      COUNT(*) FILTER (WHERE status = 'applied' AND received_at::DATE = p_date),
      COUNT(*) FILTER (WHERE status = 'error' AND received_at::DATE = p_date),
      0, -- duplicates tracked separately via idempotency
      (SELECT COUNT(*) FROM public.financial_reconciliation WHERE provider = v_provider AND checked_at::DATE = p_date AND status = 'mismatch'),
      (SELECT COUNT(*) FROM public.partner_payouts WHERE created_at::DATE = p_date AND status = 'failed'),
      (SELECT COUNT(*) FROM public.partner_payouts WHERE created_at::DATE = p_date AND status = 'completed'),
      (SELECT COUNT(*) FROM public.disputes WHERE opened_at::DATE = p_date),
      (SELECT COUNT(*) FROM public.disputes WHERE resolved_at::DATE = p_date),
      COALESCE(SUM(amount_gross) FILTER (WHERE event_type = 'PAYMENT_CONFIRMED'), 0),
      (SELECT COALESCE(SUM(amount), 0) FROM public.transaction_effects te 
       JOIN public.payment_events pe ON pe.id = te.source_event_id
       WHERE te.target = 'platform' AND te.direction = 'credit' AND pe.received_at::DATE = p_date),
      (SELECT COALESCE(SUM(net_amount), 0) FROM public.partner_payouts WHERE created_at::DATE = p_date AND status = 'completed')
    FROM public.payment_events
    WHERE provider = v_provider AND received_at::DATE = p_date
    ON CONFLICT (metric_date, provider) DO UPDATE SET
      events_received = EXCLUDED.events_received,
      events_applied_ok = EXCLUDED.events_applied_ok,
      events_apply_error = EXCLUDED.events_apply_error,
      total_volume_processed = EXCLUDED.total_volume_processed,
      platform_revenue = EXCLUDED.platform_revenue,
      partner_payouts_total = EXCLUDED.partner_payouts_total,
      created_at = NOW();
  END LOOP;

  RETURN jsonb_build_object('success', true, 'date', p_date);
END;
$$;

-- =====================================================
-- RPC: Housekeeping (runs all maintenance tasks)
-- =====================================================
CREATE OR REPLACE FUNCTION public.housekeeping_all(
  p_archive_before_days INT DEFAULT 90,
  p_log_retention_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archive_result JSONB;
  v_rotate_result JSONB;
  v_metrics_result JSONB;
BEGIN
  -- Check if archive is enabled
  IF EXISTS (SELECT 1 FROM public.system_feature_flags WHERE flag_key = 'archive_ledger_enabled' AND enabled = true) THEN
    SELECT public.archive_ledger(NOW() - (p_archive_before_days || ' days')::INTERVAL) INTO v_archive_result;
  ELSE
    v_archive_result := jsonb_build_object('skipped', true, 'reason', 'archive_ledger_enabled flag is false');
  END IF;

  -- Rotate logs
  SELECT public.rotate_logs() INTO v_rotate_result;

  -- Compute yesterday's metrics
  SELECT public.compute_ops_metrics(CURRENT_DATE - 1) INTO v_metrics_result;

  RETURN jsonb_build_object(
    'success', true,
    'archive', v_archive_result,
    'logs', v_rotate_result,
    'metrics', v_metrics_result,
    'executed_at', NOW()
  );
END;
$$;

-- =====================================================
-- RPC: Get feature flag value
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_feature_flag(p_flag_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(enabled, false) 
  FROM public.system_feature_flags 
  WHERE flag_key = p_flag_key;
$$;

-- =====================================================
-- RPC: Set feature flag value
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_feature_flag(p_flag_key TEXT, p_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.system_feature_flags
  SET enabled = p_enabled, updated_at = NOW()
  WHERE flag_key = p_flag_key;

  IF NOT FOUND THEN
    INSERT INTO public.system_feature_flags (flag_key, enabled)
    VALUES (p_flag_key, p_enabled);
  END IF;

  RETURN jsonb_build_object('success', true, 'flag_key', p_flag_key, 'enabled', p_enabled);
END;
$$;