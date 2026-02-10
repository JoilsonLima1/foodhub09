-- ============================================================
-- SETTLEMENT V2: Ledger-based settlement with auto-invoice generation
-- ============================================================

-- Drop and recreate generate_partner_settlement to use partner_earnings + ledger_entries
CREATE OR REPLACE FUNCTION public.generate_partner_settlement(
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
  v_existing_id UUID;
  v_settlement_id UUID;
  v_totals RECORD;
  v_earning RECORD;
  v_items_count INT := 0;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_ar_invoice_id UUID;
  v_ar_invoice_number TEXT;
BEGIN
  -- Check for existing settlement (idempotency)
  SELECT id INTO v_existing_id
  FROM public.settlements
  WHERE partner_id = p_partner_id
    AND period_start = p_period_start
    AND period_end = p_period_end
    AND status != 'cancelled';

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'settlement_exists',
      'existing_id', v_existing_id
    );
  END IF;

  -- Calculate totals from partner_earnings (primary source)
  SELECT 
    COALESCE(SUM(pe.gross_amount), 0) as total_gross,
    COALESCE(SUM(pe.partner_fee), 0) as total_partner_net,
    COALESCE(SUM(pe.platform_fee), 0) as total_platform_fee,
    COALESCE(SUM(pe.gateway_fee), 0) as total_gateway_fee,
    COALESCE(SUM(pe.merchant_net), 0) as total_merchant_net,
    COUNT(*) as tx_count
  INTO v_totals
  FROM public.partner_earnings pe
  WHERE pe.partner_id = p_partner_id
    AND pe.status = 'pending'
    AND pe.created_at::DATE BETWEEN p_period_start AND p_period_end
    AND pe.settled_at IS NULL;

  -- Don't create empty settlements
  IF v_totals.tx_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_transactions',
      'message', 'No unsettled partner_earnings in period'
    );
  END IF;

  -- Create settlement
  INSERT INTO public.settlements (
    partner_id,
    period_start,
    period_end,
    total_gross,
    total_partner_net,
    total_platform_fee,
    transaction_count,
    settlement_mode,
    status,
    generated_at,
    metadata
  ) VALUES (
    p_partner_id,
    p_period_start,
    p_period_end,
    v_totals.total_gross,
    v_totals.total_partner_net,
    v_totals.total_platform_fee,
    v_totals.tx_count,
    'auto',
    'pending',
    now(),
    jsonb_build_object(
      'gateway_fee', v_totals.total_gateway_fee,
      'merchant_net', v_totals.total_merchant_net,
      'generated_by', 'generate_partner_settlement_v2'
    )
  )
  RETURNING id INTO v_settlement_id;

  -- Mark partner_earnings as settled and link to settlement
  FOR v_earning IN
    SELECT pe.id, pe.partner_fee, pe.gross_amount, pe.tenant_id
    FROM public.partner_earnings pe
    WHERE pe.partner_id = p_partner_id
      AND pe.status = 'pending'
      AND pe.created_at::DATE BETWEEN p_period_start AND p_period_end
      AND pe.settled_at IS NULL
  LOOP
    -- Update earning status
    UPDATE public.partner_earnings 
    SET status = 'settled', settled_at = now(), updated_at = now()
    WHERE id = v_earning.id;

    v_items_count := v_items_count + 1;
  END LOOP;

  -- Auto-generate partner_ar_invoice (platform charges partner)
  IF v_totals.total_platform_fee > 0 THEN
    v_ar_invoice_number := 'PAR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_settlement_id::text, 1, 8);
    
    INSERT INTO public.partner_ar_invoices (
      partner_id,
      invoice_number,
      amount,
      description,
      reference_period_start,
      reference_period_end,
      due_date,
      status,
      line_items
    ) VALUES (
      p_partner_id,
      v_ar_invoice_number,
      v_totals.total_platform_fee,
      'Revenue Share - Período ' || to_char(p_period_start, 'DD/MM/YYYY') || ' a ' || to_char(p_period_end, 'DD/MM/YYYY'),
      p_period_start,
      p_period_end,
      (p_period_end + INTERVAL '15 days')::DATE,
      'pending',
      jsonb_build_array(
        jsonb_build_object(
          'description', 'Platform Revenue Share',
          'amount', v_totals.total_platform_fee,
          'quantity', v_totals.tx_count,
          'settlement_id', v_settlement_id
        )
      )
    )
    RETURNING id INTO v_ar_invoice_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', v_settlement_id,
    'period', jsonb_build_object('start', p_period_start, 'end', p_period_end),
    'totals', jsonb_build_object(
      'gross', v_totals.total_gross,
      'partner_net', v_totals.total_partner_net,
      'platform_fee', v_totals.total_platform_fee,
      'gateway_fee', v_totals.total_gateway_fee,
      'merchant_net', v_totals.total_merchant_net,
      'transaction_count', v_items_count
    ),
    'ar_invoice_id', v_ar_invoice_id,
    'ar_invoice_number', v_ar_invoice_number
  );
END;
$$;