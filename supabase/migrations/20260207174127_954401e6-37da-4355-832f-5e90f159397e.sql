-- ============================================================
-- PHASE 7: SECURITY & COMPLIANCE RPCs
-- 100% ADDITIVE - NO MODIFICATIONS TO EXISTING RPCs
-- ============================================================

-- ============================================================
-- 1. WRITE OPERATIONAL LOG (HELPER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.write_operational_log(
  p_scope TEXT,
  p_level TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_correlation_id TEXT DEFAULT NULL,
  p_partner_id UUID DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_provider_payment_id TEXT DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.operational_logs (
    scope, level, message, metadata, correlation_id,
    partner_id, tenant_id, provider_payment_id, event_id, duration_ms
  ) VALUES (
    p_scope, p_level, p_message, p_metadata, p_correlation_id,
    p_partner_id, p_tenant_id, p_provider_payment_id, p_event_id, p_duration_ms
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================================
-- 2. WRITE FINANCIAL AUDIT LOG (HELPER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.write_financial_audit(
  p_actor_type TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.financial_audit_log (
    actor_type, actor_id, action, entity_type, entity_id,
    correlation_id, before_state, after_state, ip_address, user_agent
  ) VALUES (
    p_actor_type, COALESCE(p_actor_id, auth.uid()), p_action, p_entity_type, p_entity_id,
    p_correlation_id, p_before_state, p_after_state, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- ============================================================
-- 3. CHECK RATE LIMIT
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record rate_limits;
  v_window_start TIMESTAMPTZ;
  v_allowed BOOLEAN := true;
  v_current_count INTEGER := 0;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Get or create rate limit record
  SELECT * INTO v_record FROM public.rate_limits WHERE key = p_key FOR UPDATE;
  
  IF v_record IS NULL THEN
    -- First request for this key
    INSERT INTO public.rate_limits (key, window_start, request_count, updated_at)
    VALUES (p_key, now(), 1, now())
    ON CONFLICT (key) DO UPDATE SET
      request_count = CASE 
        WHEN rate_limits.window_start < v_window_start THEN 1
        ELSE rate_limits.request_count + 1
      END,
      window_start = CASE 
        WHEN rate_limits.window_start < v_window_start THEN now()
        ELSE rate_limits.window_start
      END,
      updated_at = now()
    RETURNING request_count INTO v_current_count;
    
    v_allowed := v_current_count <= p_max_requests;
  ELSE
    -- Check if window expired
    IF v_record.window_start < v_window_start THEN
      -- Reset window
      UPDATE public.rate_limits
      SET window_start = now(), request_count = 1, updated_at = now()
      WHERE key = p_key;
      v_current_count := 1;
      v_allowed := true;
    ELSE
      -- Increment counter
      v_current_count := v_record.request_count + 1;
      v_allowed := v_current_count <= p_max_requests;
      
      UPDATE public.rate_limits
      SET request_count = v_current_count, updated_at = now()
      WHERE key = p_key;
    END IF;
  END IF;
  
  -- Log if rate limited
  IF NOT v_allowed THEN
    PERFORM public.write_operational_log(
      'security', 'warn', 'Rate limit exceeded',
      jsonb_build_object('key', p_key, 'count', v_current_count, 'limit', p_max_requests),
      NULL, NULL, NULL, NULL, NULL, NULL
    );
    
    -- Create alert for repeated violations
    IF v_current_count > p_max_requests * 2 THEN
      INSERT INTO public.operational_alerts (
        type, severity, title, details, idempotency_key
      ) VALUES (
        'rate_limit_exceeded', 
        CASE WHEN v_current_count > p_max_requests * 5 THEN 'high' ELSE 'medium' END,
        'Rate limit heavily exceeded: ' || p_key,
        jsonb_build_object('key', p_key, 'count', v_current_count, 'limit', p_max_requests),
        'rate_limit_' || p_key || '_' || date_trunc('hour', now())::TEXT
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_current_count,
    'max_requests', p_max_requests,
    'window_seconds', p_window_seconds,
    'remaining', GREATEST(0, p_max_requests - v_current_count)
  );
END;
$$;

-- ============================================================
-- 4. VALIDATE FINANCIAL INTEGRITY
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_financial_integrity(
  p_partner_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues JSONB := '[]'::JSONB;
  v_settlement RECORD;
  v_calculated_gross NUMERIC;
  v_calculated_net NUMERIC;
  v_effects_sum NUMERIC;
  v_items_sum NUMERIC;
  v_payout_sum NUMERIC;
  v_status TEXT := 'healthy';
BEGIN
  -- Check each settlement in period
  FOR v_settlement IN
    SELECT s.* 
    FROM public.settlements s
    WHERE s.partner_id = p_partner_id
      AND s.period_start >= p_period_start
      AND s.period_end <= p_period_end
  LOOP
    -- 1. Verify settlement_items match settlement total
    SELECT COALESCE(SUM(si.amount), 0) INTO v_items_sum
    FROM public.settlement_items si
    WHERE si.settlement_id = v_settlement.id;
    
    IF ABS(v_items_sum - v_settlement.gross_amount) > 0.01 THEN
      v_issues := v_issues || jsonb_build_object(
        'type', 'settlement_items_mismatch',
        'settlement_id', v_settlement.id,
        'expected', v_settlement.gross_amount,
        'actual', v_items_sum,
        'difference', v_settlement.gross_amount - v_items_sum
      );
      v_status := 'warning';
    END IF;
    
    -- 2. Verify payout doesn't exceed settlement
    SELECT COALESCE(SUM(pp.amount), 0) INTO v_payout_sum
    FROM public.partner_payouts pp
    WHERE pp.settlement_id = v_settlement.id
      AND pp.status NOT IN ('failed', 'cancelled');
    
    IF v_payout_sum > v_settlement.net_amount + 0.01 THEN
      v_issues := v_issues || jsonb_build_object(
        'type', 'payout_exceeds_settlement',
        'settlement_id', v_settlement.id,
        'settlement_net', v_settlement.net_amount,
        'payout_total', v_payout_sum,
        'excess', v_payout_sum - v_settlement.net_amount
      );
      v_status := 'critical';
    END IF;
    
    -- 3. Verify paid settlement is not pending again
    IF v_settlement.status = 'pending' THEN
      SELECT COUNT(*) INTO v_payout_sum
      FROM public.partner_payouts pp
      WHERE pp.settlement_id = v_settlement.id
        AND pp.status = 'completed';
      
      IF v_payout_sum > 0 THEN
        v_issues := v_issues || jsonb_build_object(
          'type', 'paid_settlement_reverted_to_pending',
          'settlement_id', v_settlement.id,
          'completed_payouts', v_payout_sum
        );
        v_status := 'critical';
      END IF;
    END IF;
    
    -- 4. Verify net = gross - fees
    IF ABS((v_settlement.gross_amount - v_settlement.platform_fee - v_settlement.net_amount)) > 0.01 THEN
      v_issues := v_issues || jsonb_build_object(
        'type', 'fee_calculation_mismatch',
        'settlement_id', v_settlement.id,
        'gross', v_settlement.gross_amount,
        'platform_fee', v_settlement.platform_fee,
        'net', v_settlement.net_amount,
        'expected_net', v_settlement.gross_amount - v_settlement.platform_fee
      );
      v_status := 'warning';
    END IF;
  END LOOP;
  
  -- 5. Check for effects outside their claimed period
  SELECT COUNT(*) INTO v_effects_sum
  FROM public.transaction_effects te
  JOIN public.settlement_items si ON si.effect_id = te.id
  JOIN public.settlements s ON s.id = si.settlement_id
  WHERE s.partner_id = p_partner_id
    AND s.period_start >= p_period_start
    AND s.period_end <= p_period_end
    AND (te.created_at < s.period_start OR te.created_at > s.period_end + INTERVAL '1 day');
  
  IF v_effects_sum > 0 THEN
    v_issues := v_issues || jsonb_build_object(
      'type', 'effects_outside_period',
      'count', v_effects_sum
    );
    v_status := 'warning';
  END IF;
  
  -- Log the validation
  PERFORM public.write_operational_log(
    'reconciliation', 
    CASE WHEN v_status = 'healthy' THEN 'info' ELSE 'warn' END,
    'Financial integrity validation completed',
    jsonb_build_object(
      'partner_id', p_partner_id,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'status', v_status,
      'issues_count', jsonb_array_length(v_issues)
    ),
    NULL, p_partner_id, NULL, NULL, NULL, NULL
  );
  
  -- Create alert if critical
  IF v_status = 'critical' THEN
    INSERT INTO public.operational_alerts (
      type, severity, partner_id, title, details, idempotency_key
    ) VALUES (
      'integrity_failed', 'critical', p_partner_id,
      'Financial integrity check failed for partner',
      jsonb_build_object('issues', v_issues, 'period_start', p_period_start, 'period_end', p_period_end),
      'integrity_' || p_partner_id || '_' || p_period_start || '_' || p_period_end
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      details = EXCLUDED.details,
      updated_at = now();
  END IF;
  
  RETURN jsonb_build_object(
    'status', v_status,
    'partner_id', p_partner_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'issues', v_issues,
    'validated_at', now()
  );
END;
$$;

-- ============================================================
-- 5. DETECT FRAUD SIGNALS
-- ============================================================
CREATE OR REPLACE FUNCTION public.detect_fraud_signals(
  p_partner_id UUID,
  p_lookback_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flags JSONB := '[]'::JSONB;
  v_lookback_start TIMESTAMPTZ;
  v_chargeback_count INTEGER;
  v_refund_count INTEGER;
  v_total_events INTEGER;
  v_chargeback_rate NUMERIC;
  v_refund_rate NUMERIC;
  v_avg_payout NUMERIC;
  v_max_payout NUMERIC;
  v_mismatch_count INTEGER;
  v_severity TEXT;
  v_flag_id UUID;
BEGIN
  v_lookback_start := now() - (p_lookback_days || ' days')::INTERVAL;
  
  -- 1. Count chargebacks
  SELECT COUNT(*) INTO v_chargeback_count
  FROM public.payment_events pe
  WHERE pe.partner_id = p_partner_id
    AND pe.event_type IN ('PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE')
    AND pe.created_at >= v_lookback_start;
  
  -- 2. Count refunds
  SELECT COUNT(*) INTO v_refund_count
  FROM public.payment_events pe
  WHERE pe.partner_id = p_partner_id
    AND pe.event_type = 'PAYMENT_REFUNDED'
    AND pe.created_at >= v_lookback_start;
  
  -- 3. Count total payment events
  SELECT COUNT(*) INTO v_total_events
  FROM public.payment_events pe
  WHERE pe.partner_id = p_partner_id
    AND pe.event_type IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
    AND pe.created_at >= v_lookback_start;
  
  -- Calculate rates
  v_chargeback_rate := CASE WHEN v_total_events > 0 THEN (v_chargeback_count::NUMERIC / v_total_events * 100) ELSE 0 END;
  v_refund_rate := CASE WHEN v_total_events > 0 THEN (v_refund_count::NUMERIC / v_total_events * 100) ELSE 0 END;
  
  -- 4. Check chargeback spike (> 2% is concerning, > 5% is critical)
  IF v_chargeback_rate > 2 THEN
    v_severity := CASE WHEN v_chargeback_rate > 5 THEN 'critical' WHEN v_chargeback_rate > 3 THEN 'high' ELSE 'medium' END;
    
    INSERT INTO public.fraud_flags (
      partner_id, type, severity, details
    ) VALUES (
      p_partner_id, 'chargeback_spike', v_severity,
      jsonb_build_object(
        'chargeback_count', v_chargeback_count,
        'total_events', v_total_events,
        'rate_percent', ROUND(v_chargeback_rate, 2),
        'lookback_days', p_lookback_days
      )
    )
    RETURNING id INTO v_flag_id;
    
    v_flags := v_flags || jsonb_build_object('flag_id', v_flag_id, 'type', 'chargeback_spike', 'severity', v_severity);
  END IF;
  
  -- 5. Check refund spike (> 10% is concerning)
  IF v_refund_rate > 10 THEN
    v_severity := CASE WHEN v_refund_rate > 25 THEN 'high' WHEN v_refund_rate > 15 THEN 'medium' ELSE 'low' END;
    
    INSERT INTO public.fraud_flags (
      partner_id, type, severity, details
    ) VALUES (
      p_partner_id, 'refund_spike', v_severity,
      jsonb_build_object(
        'refund_count', v_refund_count,
        'total_events', v_total_events,
        'rate_percent', ROUND(v_refund_rate, 2),
        'lookback_days', p_lookback_days
      )
    )
    RETURNING id INTO v_flag_id;
    
    v_flags := v_flags || jsonb_build_object('flag_id', v_flag_id, 'type', 'refund_spike', 'severity', v_severity);
  END IF;
  
  -- 6. Check payout anomalies (max > 5x average)
  SELECT AVG(pp.amount), MAX(pp.amount) INTO v_avg_payout, v_max_payout
  FROM public.partner_payouts pp
  JOIN public.settlements s ON s.id = pp.settlement_id
  WHERE s.partner_id = p_partner_id
    AND pp.created_at >= v_lookback_start;
  
  IF v_avg_payout > 0 AND v_max_payout > v_avg_payout * 5 THEN
    INSERT INTO public.fraud_flags (
      partner_id, type, severity, details
    ) VALUES (
      p_partner_id, 'payout_anomaly', 'medium',
      jsonb_build_object(
        'avg_payout', ROUND(v_avg_payout, 2),
        'max_payout', ROUND(v_max_payout, 2),
        'ratio', ROUND(v_max_payout / v_avg_payout, 2),
        'lookback_days', p_lookback_days
      )
    )
    RETURNING id INTO v_flag_id;
    
    v_flags := v_flags || jsonb_build_object('flag_id', v_flag_id, 'type', 'payout_anomaly', 'severity', 'medium');
  END IF;
  
  -- 7. Check reconciliation mismatches
  SELECT COUNT(*) INTO v_mismatch_count
  FROM public.financial_reconciliation fr
  WHERE fr.partner_id = p_partner_id
    AND fr.status = 'mismatch'
    AND fr.created_at >= v_lookback_start;
  
  IF v_mismatch_count >= 3 THEN
    v_severity := CASE WHEN v_mismatch_count >= 10 THEN 'high' WHEN v_mismatch_count >= 5 THEN 'medium' ELSE 'low' END;
    
    INSERT INTO public.fraud_flags (
      partner_id, type, severity, details
    ) VALUES (
      p_partner_id, 'pattern_suspicious', v_severity,
      jsonb_build_object(
        'mismatch_count', v_mismatch_count,
        'lookback_days', p_lookback_days,
        'reason', 'Repeated reconciliation mismatches'
      )
    )
    RETURNING id INTO v_flag_id;
    
    v_flags := v_flags || jsonb_build_object('flag_id', v_flag_id, 'type', 'pattern_suspicious', 'severity', v_severity);
  END IF;
  
  -- Log detection run
  PERFORM public.write_operational_log(
    'security', 'info', 'Fraud detection completed',
    jsonb_build_object(
      'partner_id', p_partner_id,
      'lookback_days', p_lookback_days,
      'flags_created', jsonb_array_length(v_flags)
    ),
    NULL, p_partner_id, NULL, NULL, NULL, NULL
  );
  
  -- Create high-severity alert if needed
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_flags) f WHERE f->>'severity' IN ('high', 'critical')) THEN
    INSERT INTO public.operational_alerts (
      type, severity, partner_id, title, details, idempotency_key
    ) VALUES (
      'fraud_high', 'high', p_partner_id,
      'High severity fraud signals detected',
      jsonb_build_object('flags', v_flags, 'lookback_days', p_lookback_days),
      'fraud_high_' || p_partner_id || '_' || date_trunc('day', now())::TEXT
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      details = EXCLUDED.details,
      updated_at = now();
  END IF;
  
  RETURN jsonb_build_object(
    'partner_id', p_partner_id,
    'lookback_days', p_lookback_days,
    'total_events', v_total_events,
    'chargeback_count', v_chargeback_count,
    'chargeback_rate', ROUND(v_chargeback_rate, 2),
    'refund_count', v_refund_count,
    'refund_rate', ROUND(v_refund_rate, 2),
    'flags_created', v_flags,
    'analyzed_at', now()
  );
END;
$$;

-- ============================================================
-- 6. GENERATE OPERATIONAL ALERTS (BATCH SCAN)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_operational_alerts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerts_created INTEGER := 0;
  v_partner RECORD;
  v_webhook_failures INTEGER;
  v_failed_payouts INTEGER;
  v_pending_reconciliations INTEGER;
BEGIN
  -- 1. Check for webhook failures (events with errors in last hour)
  SELECT COUNT(*) INTO v_webhook_failures
  FROM public.payment_events pe
  WHERE pe.status = 'error'
    AND pe.created_at >= now() - INTERVAL '1 hour';
  
  IF v_webhook_failures >= 5 THEN
    INSERT INTO public.operational_alerts (
      type, severity, title, details, idempotency_key
    ) VALUES (
      'webhook_failures', 
      CASE WHEN v_webhook_failures >= 20 THEN 'critical' WHEN v_webhook_failures >= 10 THEN 'high' ELSE 'medium' END,
      'Elevated webhook failure rate detected',
      jsonb_build_object('failure_count', v_webhook_failures, 'window', '1 hour'),
      'webhook_failures_' || date_trunc('hour', now())::TEXT
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
    v_alerts_created := v_alerts_created + 1;
  END IF;
  
  -- 2. Check for failed payouts
  SELECT COUNT(*) INTO v_failed_payouts
  FROM public.partner_payouts pp
  WHERE pp.status = 'failed'
    AND pp.created_at >= now() - INTERVAL '24 hours';
  
  IF v_failed_payouts >= 1 THEN
    INSERT INTO public.operational_alerts (
      type, severity, title, details, idempotency_key
    ) VALUES (
      'payout_failed', 
      CASE WHEN v_failed_payouts >= 5 THEN 'high' ELSE 'medium' END,
      'Partner payout(s) failed',
      jsonb_build_object('failed_count', v_failed_payouts, 'window', '24 hours'),
      'payout_failed_' || date_trunc('day', now())::TEXT
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
    v_alerts_created := v_alerts_created + 1;
  END IF;
  
  -- 3. Check for reconciliation mismatches
  SELECT COUNT(*) INTO v_pending_reconciliations
  FROM public.financial_reconciliation fr
  WHERE fr.status = 'mismatch'
    AND fr.created_at >= now() - INTERVAL '7 days';
  
  IF v_pending_reconciliations >= 3 THEN
    INSERT INTO public.operational_alerts (
      type, severity, title, details, idempotency_key
    ) VALUES (
      'reconciliation_mismatch', 
      CASE WHEN v_pending_reconciliations >= 10 THEN 'high' ELSE 'medium' END,
      'Unresolved reconciliation mismatches detected',
      jsonb_build_object('mismatch_count', v_pending_reconciliations, 'window', '7 days'),
      'reconciliation_mismatch_' || date_trunc('day', now())::TEXT
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
    v_alerts_created := v_alerts_created + 1;
  END IF;
  
  -- 4. Run fraud detection for all active partners
  FOR v_partner IN
    SELECT DISTINCT p.id 
    FROM public.partners p
    WHERE p.status = 'active'
  LOOP
    PERFORM public.detect_fraud_signals(v_partner.id, 30);
  END LOOP;
  
  -- Log the scan
  PERFORM public.write_operational_log(
    'system', 'info', 'Operational alerts scan completed',
    jsonb_build_object(
      'alerts_created', v_alerts_created,
      'webhook_failures', v_webhook_failures,
      'failed_payouts', v_failed_payouts,
      'pending_reconciliations', v_pending_reconciliations
    ),
    NULL, NULL, NULL, NULL, NULL, NULL
  );
  
  RETURN jsonb_build_object(
    'alerts_created', v_alerts_created,
    'webhook_failures_checked', v_webhook_failures,
    'failed_payouts_checked', v_failed_payouts,
    'reconciliation_mismatches_checked', v_pending_reconciliations,
    'scanned_at', now()
  );
END;
$$;