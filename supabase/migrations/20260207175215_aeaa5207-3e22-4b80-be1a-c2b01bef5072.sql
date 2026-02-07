-- =====================================================
-- PHASE 8: RPCs (100% ADDITIVE)
-- =====================================================

-- 1. RECONCILE PROVIDER PAYMENTS V2 (enhanced version)
CREATE OR REPLACE FUNCTION public.reconcile_provider_payments_v2(
  p_partner_id UUID DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_period_start TIMESTAMPTZ DEFAULT NULL,
  p_period_end TIMESTAMPTZ DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  reconciliation_id UUID,
  provider TEXT,
  provider_payment_id TEXT,
  status TEXT,
  provider_amount NUMERIC,
  internal_amount NUMERIC,
  difference NUMERIC,
  issue_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_internal_sum NUMERIC;
  v_dedupe_key TEXT;
BEGIN
  -- Loop through payment events matching criteria
  FOR v_rec IN
    SELECT 
      pe.id AS event_id,
      pe.provider,
      pe.provider_payment_id,
      pe.event_type,
      (pe.payload->>'amount')::NUMERIC AS provider_amount,
      pe.tenant_id,
      pe.partner_id,
      pe.created_at
    FROM public.payment_events pe
    WHERE 
      (p_partner_id IS NULL OR pe.partner_id = p_partner_id)
      AND (p_tenant_id IS NULL OR pe.tenant_id = p_tenant_id)
      AND (p_period_start IS NULL OR pe.created_at >= p_period_start)
      AND (p_period_end IS NULL OR pe.created_at <= p_period_end)
      AND (p_status IS NULL OR pe.event_type ILIKE '%' || p_status || '%')
  LOOP
    -- Calculate internal sum from transaction_effects
    SELECT COALESCE(SUM(te.amount), 0)
    INTO v_internal_sum
    FROM public.transaction_effects te
    WHERE te.source_event_id = v_rec.event_id;

    -- Check for mismatch
    IF v_rec.provider_amount IS NOT NULL AND ABS(v_rec.provider_amount - v_internal_sum) > 0.01 THEN
      v_dedupe_key := 'recon_' || v_rec.provider || '_' || v_rec.provider_payment_id || '_mismatch';
      
      -- Upsert into financial_reconciliation
      INSERT INTO public.financial_reconciliation (
        provider, provider_payment_id, reconciliation_status,
        provider_amount, internal_amount, difference, metadata
      ) VALUES (
        v_rec.provider, v_rec.provider_payment_id, 'mismatch',
        v_rec.provider_amount, v_internal_sum, 
        v_rec.provider_amount - v_internal_sum,
        jsonb_build_object('event_id', v_rec.event_id, 'tenant_id', v_rec.tenant_id)
      )
      ON CONFLICT (provider, provider_payment_id) 
      DO UPDATE SET 
        reconciliation_status = 'mismatch',
        provider_amount = EXCLUDED.provider_amount,
        internal_amount = EXCLUDED.internal_amount,
        difference = EXCLUDED.difference,
        reconciled_at = now()
      RETURNING id INTO reconciliation_id;

      -- Create operational alert (with dedupe)
      INSERT INTO public.operational_alerts (
        alert_type, severity, title, description, 
        tenant_id, partner_id, metadata, dedupe_key
      ) VALUES (
        'reconciliation_mismatch', 'warning',
        'Divergência de Reconciliação',
        format('Pagamento %s: Provider R$%s vs Interno R$%s', 
          v_rec.provider_payment_id, v_rec.provider_amount, v_internal_sum),
        v_rec.tenant_id, v_rec.partner_id,
        jsonb_build_object('reconciliation_id', reconciliation_id),
        v_dedupe_key
      )
      ON CONFLICT (dedupe_key) DO NOTHING;

      -- Create recommendation
      INSERT INTO public.ops_recommendations (
        type, provider, provider_payment_id, tenant_id, partner_id,
        suggested_action, payload, dedupe_key
      ) VALUES (
        'mismatch_amount', v_rec.provider, v_rec.provider_payment_id,
        v_rec.tenant_id, v_rec.partner_id,
        'manual_review',
        jsonb_build_object(
          'event_id', v_rec.event_id,
          'provider_amount', v_rec.provider_amount,
          'internal_amount', v_internal_sum,
          'difference', v_rec.provider_amount - v_internal_sum
        ),
        'rec_mismatch_' || v_rec.provider || '_' || v_rec.provider_payment_id
      )
      ON CONFLICT (dedupe_key) DO NOTHING;

      RETURN QUERY SELECT 
        reconciliation_id,
        v_rec.provider,
        v_rec.provider_payment_id,
        'mismatch'::TEXT,
        v_rec.provider_amount,
        v_internal_sum,
        v_rec.provider_amount - v_internal_sum,
        'mismatch_amount'::TEXT;
    
    ELSIF v_internal_sum = 0 AND v_rec.provider_amount > 0 THEN
      -- Missing internal records
      v_dedupe_key := 'recon_' || v_rec.provider || '_' || v_rec.provider_payment_id || '_missing';
      
      INSERT INTO public.financial_reconciliation (
        provider, provider_payment_id, reconciliation_status,
        provider_amount, internal_amount, difference, metadata
      ) VALUES (
        v_rec.provider, v_rec.provider_payment_id, 'missing_internal',
        v_rec.provider_amount, 0, v_rec.provider_amount,
        jsonb_build_object('event_id', v_rec.event_id)
      )
      ON CONFLICT (provider, provider_payment_id) 
      DO UPDATE SET reconciliation_status = 'missing_internal', reconciled_at = now()
      RETURNING id INTO reconciliation_id;

      INSERT INTO public.ops_recommendations (
        type, provider, provider_payment_id, tenant_id, partner_id,
        suggested_action, payload, dedupe_key
      ) VALUES (
        'missing_event', v_rec.provider, v_rec.provider_payment_id,
        v_rec.tenant_id, v_rec.partner_id,
        'reprocess',
        jsonb_build_object('event_id', v_rec.event_id),
        'rec_missing_' || v_rec.provider || '_' || v_rec.provider_payment_id
      )
      ON CONFLICT (dedupe_key) DO NOTHING;

      RETURN QUERY SELECT 
        reconciliation_id,
        v_rec.provider,
        v_rec.provider_payment_id,
        'missing_internal'::TEXT,
        v_rec.provider_amount,
        0::NUMERIC,
        v_rec.provider_amount,
        'missing_event'::TEXT;
    ELSE
      -- Matched - update or insert as matched
      INSERT INTO public.financial_reconciliation (
        provider, provider_payment_id, reconciliation_status,
        provider_amount, internal_amount, difference
      ) VALUES (
        v_rec.provider, v_rec.provider_payment_id, 'matched',
        v_rec.provider_amount, v_internal_sum, 0
      )
      ON CONFLICT (provider, provider_payment_id) 
      DO UPDATE SET reconciliation_status = 'matched', reconciled_at = now();
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- 2. GENERATE OPS RECOMMENDATIONS
CREATE OR REPLACE FUNCTION public.generate_ops_recommendations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rec RECORD;
BEGIN
  -- Find unreconciled payments
  FOR v_rec IN
    SELECT fr.* FROM public.financial_reconciliation fr
    WHERE fr.reconciliation_status IN ('mismatch', 'missing_internal', 'missing_provider')
      AND NOT EXISTS (
        SELECT 1 FROM public.ops_recommendations orec
        WHERE orec.provider = fr.provider 
          AND orec.provider_payment_id = fr.provider_payment_id
          AND orec.status = 'open'
      )
  LOOP
    INSERT INTO public.ops_recommendations (
      type, provider, provider_payment_id,
      suggested_action, payload, dedupe_key
    ) VALUES (
      CASE fr.reconciliation_status
        WHEN 'mismatch' THEN 'mismatch_amount'
        WHEN 'missing_internal' THEN 'missing_event'
        ELSE 'manual_review'
      END,
      v_rec.provider, v_rec.provider_payment_id,
      CASE fr.reconciliation_status
        WHEN 'missing_internal' THEN 'reprocess'
        ELSE 'manual_review'
      END,
      jsonb_build_object(
        'provider_amount', v_rec.provider_amount,
        'internal_amount', v_rec.internal_amount,
        'difference', v_rec.difference
      ),
      'gen_rec_' || v_rec.provider || '_' || v_rec.provider_payment_id
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- 3. APPLY OPS RECOMMENDATION (safe actions only)
CREATE OR REPLACE FUNCTION public.apply_ops_recommendation(
  p_recommendation_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_result JSONB;
  v_event_id UUID;
BEGIN
  -- Get recommendation
  SELECT * INTO v_rec FROM public.ops_recommendations
  WHERE id = p_recommendation_id AND status = 'open';
  
  IF v_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recommendation not found or already applied');
  END IF;
  
  -- Process based on suggested action
  CASE v_rec.suggested_action
    WHEN 'reprocess' THEN
      -- Get event ID from payload and call reprocess
      v_event_id := (v_rec.payload->>'event_id')::UUID;
      IF v_event_id IS NOT NULL THEN
        -- Call the existing reprocess function if it exists
        BEGIN
          PERFORM public.reprocess_payment_event(v_event_id);
          v_result := jsonb_build_object('success', true, 'action', 'reprocessed', 'event_id', v_event_id);
        EXCEPTION WHEN OTHERS THEN
          UPDATE public.ops_recommendations 
          SET status = 'failed', error_message = SQLERRM, updated_at = now()
          WHERE id = p_recommendation_id;
          RETURN jsonb_build_object('success', false, 'error', SQLERRM);
        END;
      ELSE
        v_result := jsonb_build_object('success', false, 'error', 'No event_id in payload');
      END IF;

    WHEN 'insert_synthetic_event' THEN
      -- Create a synthetic event - marked as synthetic
      INSERT INTO public.payment_events (
        provider, provider_event_id, provider_payment_id,
        event_type, payload, tenant_id, partner_id
      ) VALUES (
        v_rec.provider, 
        'synthetic_' || gen_random_uuid()::TEXT,
        v_rec.provider_payment_id,
        COALESCE(v_rec.payload->>'event_type', 'SYNTHETIC_CORRECTION'),
        v_rec.payload || jsonb_build_object('synthetic', true, 'created_by', p_actor_id),
        v_rec.tenant_id,
        v_rec.partner_id
      )
      RETURNING id INTO v_event_id;
      
      v_result := jsonb_build_object('success', true, 'action', 'synthetic_event_created', 'event_id', v_event_id);

    WHEN 'dismiss' THEN
      v_result := jsonb_build_object('success', true, 'action', 'dismissed');

    ELSE
      -- Manual review - just mark as applied
      v_result := jsonb_build_object('success', true, 'action', 'marked_reviewed');
  END CASE;
  
  -- Update recommendation status
  UPDATE public.ops_recommendations 
  SET status = 'applied', 
      applied_at = now(), 
      applied_by = p_actor_id,
      updated_at = now()
  WHERE id = p_recommendation_id;
  
  RETURN v_result;
END;
$$;

-- 4. ROTATE LOGS (archive and cleanup)
CREATE OR REPLACE FUNCTION public.rotate_logs(
  p_retention_days INTEGER DEFAULT 30,
  p_archive_days INTEGER DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_op_logs_archived INTEGER := 0;
  v_op_logs_deleted INTEGER := 0;
  v_audit_logs_archived INTEGER := 0;
  v_audit_logs_deleted INTEGER := 0;
  v_retention_date TIMESTAMPTZ;
  v_archive_date TIMESTAMPTZ;
BEGIN
  v_retention_date := now() - (p_retention_days || ' days')::INTERVAL;
  v_archive_date := now() - (p_archive_days || ' days')::INTERVAL;
  
  -- Archive operational logs older than retention period
  WITH moved AS (
    INSERT INTO public.operational_logs_archive (id, correlation_id, scope, level, message, metadata, created_at)
    SELECT id, correlation_id, scope, level, message, metadata, created_at
    FROM public.operational_logs
    WHERE created_at < v_retention_date
      AND NOT EXISTS (SELECT 1 FROM public.operational_logs_archive ola WHERE ola.id = operational_logs.id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_op_logs_archived FROM moved;
  
  -- Delete from hot table
  WITH deleted AS (
    DELETE FROM public.operational_logs
    WHERE created_at < v_retention_date
      AND EXISTS (SELECT 1 FROM public.operational_logs_archive ola WHERE ola.id = operational_logs.id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_op_logs_deleted FROM deleted;
  
  -- Delete very old archived logs
  DELETE FROM public.operational_logs_archive
  WHERE created_at < v_archive_date;
  
  -- Archive financial audit logs
  WITH moved AS (
    INSERT INTO public.financial_audit_log_archive (id, entity_type, entity_id, action, actor_type, actor_id, before_state, after_state, metadata, created_at)
    SELECT id, entity_type, entity_id, action, actor_type, actor_id, before_state, after_state, metadata, created_at
    FROM public.financial_audit_log
    WHERE created_at < v_retention_date
      AND NOT EXISTS (SELECT 1 FROM public.financial_audit_log_archive fala WHERE fala.id = financial_audit_log.id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_audit_logs_archived FROM moved;
  
  -- Delete from hot table
  WITH deleted AS (
    DELETE FROM public.financial_audit_log
    WHERE created_at < v_retention_date
      AND EXISTS (SELECT 1 FROM public.financial_audit_log_archive fala WHERE fala.id = financial_audit_log.id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_audit_logs_deleted FROM deleted;
  
  -- Delete very old archived audit logs
  DELETE FROM public.financial_audit_log_archive
  WHERE created_at < v_archive_date;
  
  RETURN jsonb_build_object(
    'operational_logs_archived', v_op_logs_archived,
    'operational_logs_deleted', v_op_logs_deleted,
    'audit_logs_archived', v_audit_logs_archived,
    'audit_logs_deleted', v_audit_logs_deleted,
    'retention_date', v_retention_date,
    'archive_date', v_archive_date
  );
END;
$$;

-- 5. UPSERT DISPUTE FROM EVENT (auto-create disputes from chargebacks/refunds)
CREATE OR REPLACE FUNCTION public.upsert_dispute_from_event(
  p_event_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_dispute_id UUID;
  v_dispute_type TEXT;
  v_dedupe_key TEXT;
  v_amount NUMERIC;
BEGIN
  -- Get the event
  SELECT * INTO v_event FROM public.payment_events
  WHERE id = p_event_id;
  
  IF v_event IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Determine dispute type based on event type
  IF v_event.event_type ILIKE '%CHARGEBACK%' THEN
    v_dispute_type := 'chargeback';
  ELSIF v_event.event_type ILIKE '%REFUND%' THEN
    v_dispute_type := 'refund';
  ELSE
    RETURN NULL; -- Not a dispute event
  END IF;
  
  v_dedupe_key := v_event.provider || '_' || v_event.provider_payment_id || '_' || v_dispute_type;
  v_amount := (v_event.payload->>'amount')::NUMERIC;
  
  -- Upsert dispute
  INSERT INTO public.disputes (
    provider, provider_payment_id, tenant_id, partner_id,
    dispute_type, amount, source_event_id, 
    metadata, dedupe_key
  ) VALUES (
    v_event.provider, v_event.provider_payment_id,
    v_event.tenant_id, v_event.partner_id,
    v_dispute_type, v_amount, p_event_id,
    v_event.payload, v_dedupe_key
  )
  ON CONFLICT (dedupe_key) DO UPDATE SET
    updated_at = now(),
    metadata = disputes.metadata || jsonb_build_object('last_event_id', p_event_id)
  RETURNING id INTO v_dispute_id;
  
  -- Add timeline entry
  INSERT INTO public.dispute_timeline (
    dispute_id, action, actor_type, new_status, data
  ) VALUES (
    v_dispute_id, 'created', 'system', 'opened',
    jsonb_build_object('event_id', p_event_id, 'event_type', v_event.event_type)
  );
  
  RETURN v_dispute_id;
END;
$$;

-- 6. EXECUTE PARTNER PAYOUT V2 (with integrity check)
CREATE OR REPLACE FUNCTION public.execute_partner_payout_v2(
  p_settlement_id UUID,
  p_payment_method TEXT DEFAULT 'pix',
  p_external_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement RECORD;
  v_integrity RECORD;
  v_payout_id UUID;
BEGIN
  -- Get settlement
  SELECT * INTO v_settlement FROM public.settlements
  WHERE id = p_settlement_id;
  
  IF v_settlement IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settlement not found');
  END IF;
  
  IF v_settlement.status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settlement already paid');
  END IF;
  
  -- Run integrity check
  SELECT * INTO v_integrity FROM public.validate_financial_integrity(
    v_settlement.partner_id, NULL, NULL
  );
  
  -- If integrity check exists and fails, block payout
  IF v_integrity IS NOT NULL AND v_integrity.is_valid = false THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Integrity check failed',
      'details', v_integrity
    );
  END IF;
  
  -- Create payout record
  INSERT INTO public.partner_payouts (
    settlement_id, partner_id, amount, currency,
    payment_method, external_reference, status
  ) VALUES (
    p_settlement_id, v_settlement.partner_id, v_settlement.net_earnings,
    v_settlement.currency, p_payment_method, p_external_reference, 'processing'
  )
  RETURNING id INTO v_payout_id;
  
  -- Update settlement status
  UPDATE public.settlements
  SET status = 'processing', updated_at = now()
  WHERE id = p_settlement_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'settlement_id', p_settlement_id,
    'amount', v_settlement.net_earnings
  );
END;
$$;

-- 7. UPDATE DISPUTE STATUS (admin action)
CREATE OR REPLACE FUNCTION public.update_dispute_status(
  p_dispute_id UUID,
  p_new_status TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
BEGIN
  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id;
  
  IF v_dispute IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dispute not found');
  END IF;
  
  -- Update dispute
  UPDATE public.disputes
  SET status = p_new_status,
      notes = COALESCE(p_notes, notes),
      resolved_at = CASE WHEN p_new_status IN ('won', 'lost', 'closed') THEN now() ELSE resolved_at END,
      updated_at = now()
  WHERE id = p_dispute_id;
  
  -- Add timeline entry
  INSERT INTO public.dispute_timeline (
    dispute_id, action, actor_type, actor_id,
    previous_status, new_status, data
  ) VALUES (
    p_dispute_id, 'status_change', 
    CASE WHEN p_actor_id IS NULL THEN 'system' ELSE 'admin' END,
    p_actor_id,
    v_dispute.status, p_new_status,
    jsonb_build_object('notes', p_notes)
  );
  
  RETURN jsonb_build_object('success', true, 'previous_status', v_dispute.status, 'new_status', p_new_status);
END;
$$;