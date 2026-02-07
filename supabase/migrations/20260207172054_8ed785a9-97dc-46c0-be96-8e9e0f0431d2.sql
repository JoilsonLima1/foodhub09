-- ============================================================
-- PHASE 5 FINAL: Apply Payment Event RPC + Helpers
-- ============================================================

-- 1. Helper function to resolve payment context
CREATE OR REPLACE FUNCTION public.resolve_payment_context(p_provider_payment_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_partner_id UUID;
BEGIN
  -- Try partner_invoices first
  SELECT pi.tenant_id, pi.partner_id
  INTO v_tenant_id, v_partner_id
  FROM partner_invoices pi
  WHERE pi.gateway_payment_id = p_provider_payment_id
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'source', 'partner_invoice',
      'tenant_id', v_tenant_id,
      'partner_id', v_partner_id
    );
  END IF;

  -- Try module_purchases
  SELECT mp.tenant_id
  INTO v_tenant_id
  FROM module_purchases mp
  WHERE mp.gateway_payment_id = p_provider_payment_id
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    SELECT pt.partner_id INTO v_partner_id
    FROM partner_tenants pt
    WHERE pt.tenant_id = v_tenant_id
    LIMIT 1;

    RETURN jsonb_build_object(
      'source', 'module_purchase',
      'tenant_id', v_tenant_id,
      'partner_id', v_partner_id
    );
  END IF;

  -- Try tenant by asaas_payment_id
  SELECT t.id INTO v_tenant_id
  FROM tenants t
  WHERE t.asaas_payment_id = p_provider_payment_id
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    SELECT pt.partner_id INTO v_partner_id
    FROM partner_tenants pt
    WHERE pt.tenant_id = v_tenant_id
    LIMIT 1;

    RETURN jsonb_build_object(
      'source', 'tenant',
      'tenant_id', v_tenant_id,
      'partner_id', v_partner_id
    );
  END IF;

  RETURN jsonb_build_object('source', 'unknown', 'tenant_id', NULL, 'partner_id', NULL);
END;
$$;

-- 2. Main apply_payment_event RPC
CREATE OR REPLACE FUNCTION public.apply_payment_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_effect_direction TEXT;
  v_effect_reason TEXT;
  v_should_apply_financial BOOLEAN := FALSE;
  v_should_apply_status BOOLEAN := FALSE;
  v_fee_result JSONB;
  v_partner_earning_id UUID;
  v_platform_revenue_id UUID;
  v_existing_effect UUID;
  v_result JSONB := '{}';
  v_original_earning RECORD;
BEGIN
  -- Lock and fetch the event
  SELECT * INTO v_event
  FROM payment_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Check if already applied
  IF v_event.applied_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_applied', 'applied_at', v_event.applied_at);
  END IF;

  -- Determine effect based on event type
  CASE v_event.event_type
    WHEN 'PAYMENT_CONFIRMED' THEN
      v_effect_direction := 'credit';
      v_effect_reason := 'sale';
      v_should_apply_financial := TRUE;
      v_should_apply_status := TRUE;
      
    WHEN 'PAYMENT_REFUNDED' THEN
      v_effect_direction := 'debit';
      v_effect_reason := 'refund';
      v_should_apply_financial := TRUE;
      v_should_apply_status := TRUE;
      
    WHEN 'PAYMENT_CHARGEBACK' THEN
      v_effect_direction := 'debit';
      v_effect_reason := 'chargeback';
      v_should_apply_financial := TRUE;
      v_should_apply_status := TRUE;
      
    WHEN 'PAYMENT_OVERDUE' THEN
      v_effect_direction := NULL;
      v_effect_reason := 'overdue';
      v_should_apply_financial := FALSE;
      v_should_apply_status := TRUE;
      
    WHEN 'PAYMENT_CANCELED' THEN
      v_effect_direction := NULL;
      v_effect_reason := 'canceled';
      v_should_apply_financial := FALSE;
      v_should_apply_status := TRUE;
      
    ELSE
      v_should_apply_financial := FALSE;
      v_should_apply_status := FALSE;
  END CASE;

  -- Apply financial effects if needed
  IF v_should_apply_financial AND v_event.partner_id IS NOT NULL AND v_event.amount_gross > 0 THEN
    -- Check if effect already exists for partner_earnings
    SELECT id INTO v_existing_effect
    FROM transaction_effects
    WHERE source_event_id = p_event_id AND target = 'partner_earnings';
    
    IF v_existing_effect IS NULL THEN
      IF v_effect_direction = 'credit' THEN
        -- Calculate fees and record earnings
        SELECT result INTO v_fee_result
        FROM calculate_partner_transaction_fee(
          v_event.partner_id,
          v_event.tenant_id,
          v_event.amount_gross,
          COALESCE(v_event.payment_method, 'pix')
        ) AS result;

        -- Insert partner earnings
        INSERT INTO partner_earnings (
          partner_id,
          tenant_id,
          transaction_id,
          gross_amount,
          gateway_fee,
          partner_markup,
          platform_share,
          partner_net,
          merchant_net,
          payment_method,
          external_payment_id,
          status
        ) VALUES (
          v_event.partner_id,
          v_event.tenant_id,
          gen_random_uuid(),
          v_event.amount_gross,
          COALESCE((v_fee_result->>'gateway_fee')::NUMERIC, 0),
          COALESCE((v_fee_result->>'partner_markup')::NUMERIC, 0),
          COALESCE((v_fee_result->>'platform_share')::NUMERIC, 0),
          COALESCE((v_fee_result->>'partner_net')::NUMERIC, 0),
          COALESCE((v_fee_result->>'merchant_net')::NUMERIC, 0),
          v_event.payment_method,
          v_event.provider_payment_id,
          'pending'
        )
        RETURNING id INTO v_partner_earning_id;

        -- Record effect
        INSERT INTO transaction_effects (source_event_id, target, target_record_id, direction, amount, reason, metadata)
        VALUES (p_event_id, 'partner_earnings', v_partner_earning_id, 'credit', v_event.amount_gross, v_effect_reason,
          jsonb_build_object('fee_breakdown', v_fee_result));

        -- Insert platform revenue share
        INSERT INTO platform_partner_revenue (
          partner_id,
          tenant_id,
          earning_id,
          amount,
          source_type,
          status
        ) VALUES (
          v_event.partner_id,
          v_event.tenant_id,
          v_partner_earning_id,
          COALESCE((v_fee_result->>'platform_share')::NUMERIC, 0),
          'partner_transaction_fee',
          'pending'
        )
        RETURNING id INTO v_platform_revenue_id;

        -- Record platform effect
        INSERT INTO transaction_effects (source_event_id, target, target_record_id, direction, amount, reason, metadata)
        VALUES (p_event_id, 'platform_partner_revenue', v_platform_revenue_id, 'credit', 
          COALESCE((v_fee_result->>'platform_share')::NUMERIC, 0), v_effect_reason, '{}')
        ON CONFLICT (source_event_id, target) DO NOTHING;

        v_result := v_result || jsonb_build_object(
          'partner_earning_id', v_partner_earning_id,
          'platform_revenue_id', v_platform_revenue_id,
          'fee_breakdown', v_fee_result
        );

      ELSIF v_effect_direction = 'debit' THEN
        -- Reversal: find original earning and reverse it
        SELECT * INTO v_original_earning
        FROM partner_earnings
        WHERE external_payment_id = v_event.provider_payment_id
          AND reversed_at IS NULL
          AND gross_amount > 0
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;

        IF v_original_earning.id IS NOT NULL THEN
          -- Mark original as reversed
          UPDATE partner_earnings
          SET reversed_at = now(),
              status = v_effect_reason,
              reversal_reason = v_effect_reason || ' via event ' || p_event_id::TEXT
          WHERE id = v_original_earning.id;

          -- Create reversal entry
          INSERT INTO partner_earnings (
            partner_id,
            tenant_id,
            transaction_id,
            gross_amount,
            gateway_fee,
            partner_markup,
            platform_share,
            partner_net,
            merchant_net,
            payment_method,
            external_payment_id,
            status,
            original_earning_id,
            reversal_reason
          ) VALUES (
            v_original_earning.partner_id,
            v_original_earning.tenant_id,
            gen_random_uuid(),
            -v_original_earning.gross_amount,
            -v_original_earning.gateway_fee,
            -v_original_earning.partner_markup,
            -v_original_earning.platform_share,
            -v_original_earning.partner_net,
            -v_original_earning.merchant_net,
            v_original_earning.payment_method,
            v_event.provider_payment_id,
            v_effect_reason,
            v_original_earning.id,
            v_effect_reason
          )
          RETURNING id INTO v_partner_earning_id;

          -- Record effect
          INSERT INTO transaction_effects (source_event_id, target, target_record_id, direction, amount, reason, metadata)
          VALUES (p_event_id, 'partner_earnings', v_partner_earning_id, 'debit', v_original_earning.gross_amount, v_effect_reason,
            jsonb_build_object('original_earning_id', v_original_earning.id));

          -- Reverse platform revenue
          UPDATE platform_partner_revenue
          SET reversed_at = now(),
              status = v_effect_reason
          WHERE earning_id = v_original_earning.id;

          v_result := v_result || jsonb_build_object(
            'reversed_earning_id', v_original_earning.id,
            'reversal_entry_id', v_partner_earning_id,
            'reversal_type', v_effect_reason
          );
        ELSE
          v_result := v_result || jsonb_build_object('reversal', 'no_original_found');
        END IF;
      END IF;
    ELSE
      v_result := v_result || jsonb_build_object('financial_effect', 'already_applied');
    END IF;
  END IF;

  -- Apply status effects if needed
  IF v_should_apply_status AND v_event.tenant_id IS NOT NULL THEN
    CASE v_event.event_type
      WHEN 'PAYMENT_CONFIRMED' THEN
        -- Activate subscription
        UPDATE tenant_subscriptions
        SET status = 'active',
            last_payment_at = v_event.occurred_at,
            updated_at = now()
        WHERE tenant_id = v_event.tenant_id
          AND status IN ('pending', 'past_due', 'trialing');
        
        -- Sync modules if partner tenant
        IF v_event.partner_id IS NOT NULL THEN
          PERFORM sync_partner_tenant_modules(v_event.tenant_id);
        END IF;

        v_result := v_result || jsonb_build_object('subscription_status', 'active');
        
      WHEN 'PAYMENT_OVERDUE' THEN
        UPDATE tenant_subscriptions
        SET status = 'past_due',
            delinquency_stage = COALESCE(delinquency_stage, 0) + 1,
            updated_at = now()
        WHERE tenant_id = v_event.tenant_id;

        v_result := v_result || jsonb_build_object('subscription_status', 'past_due');
        
      WHEN 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK' THEN
        UPDATE tenant_subscriptions
        SET status = 'past_due',
            notes = COALESCE(notes, '') || ' | ' || v_effect_reason || ' at ' || now()::TEXT,
            updated_at = now()
        WHERE tenant_id = v_event.tenant_id;

        IF v_event.event_type = 'PAYMENT_CHARGEBACK' THEN
          UPDATE partner_tenants
          SET risk_flag = 'chargeback',
              risk_flagged_at = now()
          WHERE tenant_id = v_event.tenant_id;
          
          v_result := v_result || jsonb_build_object('risk_flag', 'chargeback');
        END IF;

        v_result := v_result || jsonb_build_object('subscription_status', 'past_due');
        
      WHEN 'PAYMENT_CANCELED' THEN
        UPDATE tenant_subscriptions
        SET notes = COALESCE(notes, '') || ' | Payment canceled at ' || now()::TEXT,
            updated_at = now()
        WHERE tenant_id = v_event.tenant_id;
        
      ELSE
        NULL;
    END CASE;
  END IF;

  -- Mark event as applied
  UPDATE payment_events
  SET applied_at = now(),
      status = 'applied',
      updated_at = now()
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'event_type', v_event.event_type,
    'applied_financial', v_should_apply_financial,
    'applied_status', v_should_apply_status,
    'details', v_result
  );

EXCEPTION WHEN OTHERS THEN
  UPDATE payment_events
  SET status = 'error',
      error_message = SQLERRM,
      updated_at = now()
  WHERE id = p_event_id;
  
  RETURN jsonb_build_object(
    'success', false,
    'event_id', p_event_id,
    'error', SQLERRM
  );
END;
$$;

-- 3. Insert payment event RPC (webhook entrypoint)
CREATE OR REPLACE FUNCTION public.insert_payment_event(
  p_provider TEXT,
  p_provider_event_id TEXT,
  p_provider_payment_id TEXT,
  p_event_type TEXT,
  p_tenant_id UUID,
  p_partner_id UUID,
  p_amount_gross NUMERIC,
  p_payment_method TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_mapped_event_type TEXT;
  v_is_new BOOLEAN := FALSE;
  v_apply_result JSONB;
BEGIN
  v_mapped_event_type := map_asaas_event_type(p_event_type);

  INSERT INTO payment_events (
    provider,
    provider_event_id,
    provider_payment_id,
    event_type,
    tenant_id,
    partner_id,
    amount_gross,
    payment_method,
    occurred_at,
    payload,
    correlation_id,
    status
  ) VALUES (
    p_provider,
    p_provider_event_id,
    p_provider_payment_id,
    v_mapped_event_type,
    p_tenant_id,
    p_partner_id,
    COALESCE(p_amount_gross, 0),
    p_payment_method,
    COALESCE(p_occurred_at, now()),
    COALESCE(p_payload, '{}'),
    p_provider_payment_id || ':' || v_mapped_event_type,
    'pending'
  )
  ON CONFLICT (provider, provider_event_id) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NOT NULL THEN
    v_is_new := TRUE;
    v_apply_result := apply_payment_event(v_event_id);
  ELSE
    SELECT id INTO v_event_id
    FROM payment_events
    WHERE provider = p_provider AND provider_event_id = p_provider_event_id;
    
    v_apply_result := jsonb_build_object('status', 'duplicate', 'event_id', v_event_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_new', v_is_new,
    'event_id', v_event_id,
    'apply_result', v_apply_result
  );
END;
$$;

-- 4. Reprocess payment event RPC (admin only)
CREATE OR REPLACE FUNCTION public.reprocess_payment_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_event FROM payment_events WHERE id = p_event_id;
  
  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Reset applied_at to allow reprocessing
  UPDATE payment_events
  SET applied_at = NULL,
      status = 'pending',
      error_message = NULL,
      updated_at = now()
  WHERE id = p_event_id;

  -- Delete existing effects
  DELETE FROM transaction_effects WHERE source_event_id = p_event_id;

  -- Apply the event again
  v_result := apply_payment_event(p_event_id);

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'reprocessed', true,
    'apply_result', v_result
  );
END;
$$;