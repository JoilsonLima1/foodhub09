-- =====================================================
-- Phase 5 Finalization: Idempotency, Reversals, Settlement
-- First drop the old function signature to avoid conflicts
-- =====================================================

-- Drop old function signature (6 params version)
DROP FUNCTION IF EXISTS public.record_partner_transaction(UUID, UUID, UUID, UUID, NUMERIC, TEXT);

-- Now recreate with new signature (8 params with defaults)
CREATE OR REPLACE FUNCTION public.record_partner_transaction(
  p_partner_id UUID,
  p_tenant_id UUID,
  p_transaction_id UUID,
  p_order_id UUID,
  p_gross_amount NUMERIC,
  p_payment_method TEXT,
  p_external_payment_id TEXT DEFAULT NULL,
  p_settlement_mode TEXT DEFAULT 'invoice'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fee_result JSONB;
  v_earning_id UUID;
  v_existing_earning_id UUID;
  v_revenue_id UUID;
BEGIN
  -- IDEMPOTENCY CHECK: If external_payment_id provided, check for existing record
  IF p_external_payment_id IS NOT NULL THEN
    SELECT id INTO v_existing_earning_id
    FROM partner_earnings
    WHERE partner_id = p_partner_id
      AND tenant_id = p_tenant_id
      AND external_payment_id = p_external_payment_id
      AND reversed_at IS NULL
    LIMIT 1;
    
    IF v_existing_earning_id IS NOT NULL THEN
      -- Already processed, return existing ID
      RETURN jsonb_build_object(
        'earning_id', v_existing_earning_id,
        'status', 'duplicate',
        'message', 'Transaction already recorded'
      );
    END IF;
  END IF;

  -- Calculate fees using existing function
  v_fee_result := calculate_partner_transaction_fee(
    p_partner_id,
    p_tenant_id,
    p_gross_amount,
    p_payment_method
  );

  -- Insert partner earning record
  INSERT INTO partner_earnings (
    partner_id,
    tenant_id,
    transaction_id,
    order_id,
    gross_amount,
    gateway_fee,
    platform_fee,
    partner_fee,
    merchant_net,
    payment_method,
    external_payment_id,
    settlement_mode,
    status
  ) VALUES (
    p_partner_id,
    p_tenant_id,
    p_transaction_id,
    p_order_id,
    p_gross_amount,
    COALESCE((v_fee_result->>'gateway_fee')::NUMERIC, 0),
    COALESCE((v_fee_result->>'platform_fee')::NUMERIC, 0),
    COALESCE((v_fee_result->>'partner_fee')::NUMERIC, 0),
    COALESCE((v_fee_result->>'merchant_net')::NUMERIC, 0),
    p_payment_method,
    p_external_payment_id,
    p_settlement_mode,
    'pending'
  )
  RETURNING id INTO v_earning_id;

  -- Record platform's share in platform_partner_revenue
  IF COALESCE((v_fee_result->>'platform_fee')::NUMERIC, 0) > 0 THEN
    INSERT INTO platform_partner_revenue (
      partner_id,
      partner_earning_id,
      amount,
      fee_type,
      description,
      external_payment_id,
      status
    ) VALUES (
      p_partner_id,
      v_earning_id,
      (v_fee_result->>'platform_fee')::NUMERIC,
      'platform_share',
      'Repasse de taxa de transação',
      p_external_payment_id,
      'pending'
    )
    RETURNING id INTO v_revenue_id;
  END IF;

  RETURN jsonb_build_object(
    'earning_id', v_earning_id,
    'revenue_id', v_revenue_id,
    'status', 'created',
    'fees', v_fee_result
  );
END;
$$;

-- Create function to reverse a transaction (refund/chargeback)
CREATE OR REPLACE FUNCTION public.reverse_partner_transaction(
  p_external_payment_id TEXT,
  p_reversal_reason TEXT,
  p_reversal_type TEXT DEFAULT 'refund' -- refund, chargeback, canceled
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_earning partner_earnings%ROWTYPE;
  v_reversal_earning_id UUID;
  v_reversal_revenue_id UUID;
  v_affected_count INT := 0;
BEGIN
  -- Find original earnings by external_payment_id
  FOR v_earning IN
    SELECT * FROM partner_earnings
    WHERE external_payment_id = p_external_payment_id
      AND reversed_at IS NULL
  LOOP
    v_affected_count := v_affected_count + 1;
    
    -- Mark original as reversed
    UPDATE partner_earnings
    SET 
      reversed_at = NOW(),
      reversal_reason = p_reversal_type || ': ' || p_reversal_reason,
      status = 'refunded',
      updated_at = NOW()
    WHERE id = v_earning.id;
    
    -- Create negative adjustment entry
    INSERT INTO partner_earnings (
      partner_id,
      tenant_id,
      transaction_id,
      order_id,
      gross_amount,
      gateway_fee,
      platform_fee,
      partner_fee,
      merchant_net,
      payment_method,
      external_payment_id,
      settlement_mode,
      status,
      original_earning_id,
      reversal_reason
    ) VALUES (
      v_earning.partner_id,
      v_earning.tenant_id,
      gen_random_uuid(),
      v_earning.order_id,
      -v_earning.gross_amount,
      -v_earning.gateway_fee,
      -v_earning.platform_fee,
      -v_earning.partner_fee,
      -v_earning.merchant_net,
      v_earning.payment_method,
      p_external_payment_id || '_reversal',
      v_earning.settlement_mode,
      'refunded',
      v_earning.id,
      p_reversal_type || ': ' || p_reversal_reason
    )
    RETURNING id INTO v_reversal_earning_id;
    
    -- Mark platform revenue as reversed
    UPDATE platform_partner_revenue
    SET 
      reversed_at = NOW(),
      reversal_reason = p_reversal_type || ': ' || p_reversal_reason,
      status = 'reversed'
    WHERE partner_earning_id = v_earning.id;
    
    -- Create negative platform revenue entry
    INSERT INTO platform_partner_revenue (
      partner_id,
      partner_earning_id,
      amount,
      fee_type,
      description,
      external_payment_id,
      original_revenue_id,
      reversal_reason,
      status
    )
    SELECT
      partner_id,
      v_reversal_earning_id,
      -amount,
      fee_type,
      'Estorno: ' || COALESCE(description, ''),
      p_external_payment_id || '_reversal',
      id,
      p_reversal_type || ': ' || p_reversal_reason,
      'reversed'
    FROM platform_partner_revenue
    WHERE partner_earning_id = v_earning.id
    RETURNING id INTO v_reversal_revenue_id;
  END LOOP;

  IF v_affected_count = 0 THEN
    RETURN jsonb_build_object(
      'status', 'not_found',
      'message', 'No earnings found for this payment ID'
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'reversed',
    'affected_count', v_affected_count,
    'reversal_type', p_reversal_type,
    'reason', p_reversal_reason
  );
END;
$$;

-- Create helper function to get partner for a tenant
CREATE OR REPLACE FUNCTION public.get_partner_for_tenant(p_tenant_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT partner_id 
  FROM partner_tenants 
  WHERE tenant_id = p_tenant_id 
    AND status = 'active'
  LIMIT 1;
$$;

-- Add settlement tracking columns to partner_fee_config if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partner_fee_config' AND column_name = 'default_settlement_mode') THEN
    ALTER TABLE public.partner_fee_config ADD COLUMN default_settlement_mode TEXT DEFAULT 'invoice';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partner_fee_config' AND column_name = 'split_enabled') THEN
    ALTER TABLE public.partner_fee_config ADD COLUMN split_enabled BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partner_fee_config' AND column_name = 'gateway_split_recipient_id') THEN
    ALTER TABLE public.partner_fee_config ADD COLUMN gateway_split_recipient_id TEXT;
  END IF;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.record_partner_transaction TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reverse_partner_transaction TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_partner_for_tenant TO authenticated, service_role;