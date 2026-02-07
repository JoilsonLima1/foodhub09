-- =====================================================
-- FASE 6: SETTLEMENT ENGINE (ADITIVA - NÃO ALTERA SSOT)
-- =====================================================

-- 1️⃣ SETTLEMENTS - Períodos de liquidação
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_partner_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  settlement_mode TEXT NOT NULL DEFAULT 'manual' CHECK (settlement_mode IN ('split', 'invoice', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate settlements for same period
  CONSTRAINT unique_partner_settlement_period UNIQUE (partner_id, period_start, period_end)
);

-- 2️⃣ PARTNER PAYOUTS - Repasses executados
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  settlement_id UUID REFERENCES public.settlements(id),
  amount NUMERIC(12,2) NOT NULL,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('pix', 'ted', 'asaas_transfer', 'manual', 'split_auto')),
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  executed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3️⃣ FINANCIAL RECONCILIATION - Detecção de divergências
CREATE TABLE IF NOT EXISTS public.financial_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  internal_event_id UUID REFERENCES public.payment_events(id),
  expected_amount NUMERIC(12,2),
  provider_amount NUMERIC(12,2),
  difference NUMERIC(12,2) GENERATED ALWAYS AS (COALESCE(provider_amount, 0) - COALESCE(expected_amount, 0)) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'mismatch', 'missing_internal', 'missing_provider')),
  checked_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_provider_reconciliation UNIQUE (provider, provider_payment_id)
);

-- 4️⃣ SETTLEMENT ITEMS - Link entre settlement e transaction_effects
CREATE TABLE IF NOT EXISTS public.settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  transaction_effect_id UUID NOT NULL REFERENCES public.transaction_effects(id),
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_effect_in_settlement UNIQUE (transaction_effect_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_settlements_partner_status ON public.settlements(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON public.settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_settlement ON public.partner_payouts(settlement_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON public.partner_payouts(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON public.financial_reconciliation(status, checked_at);
CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement ON public.settlement_items(settlement_id);

-- RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

-- Partner users can view their own settlements
CREATE POLICY "Partner users view own settlements"
  ON public.settlements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = settlements.partner_id
        AND pu.user_id = auth.uid()
        AND pu.is_active = true
    )
  );

-- Partner users can view their own payouts
CREATE POLICY "Partner users view own payouts"
  ON public.partner_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partner_payouts.partner_id
        AND pu.user_id = auth.uid()
        AND pu.is_active = true
    )
  );

-- Super admins can view all reconciliation
CREATE POLICY "Super admins view reconciliation"
  ON public.financial_reconciliation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  );

-- Settlement items follow settlement access
CREATE POLICY "Settlement items follow settlement access"
  ON public.settlement_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.settlements s
      JOIN public.partner_users pu ON pu.partner_id = s.partner_id
      WHERE s.id = settlement_items.settlement_id
        AND pu.user_id = auth.uid()
        AND pu.is_active = true
    )
  );

-- =====================================================
-- RPCs - FUNÇÕES DE LIQUIDAÇÃO
-- =====================================================

-- RPC: Gerar settlement para um parceiro em um período
CREATE OR REPLACE FUNCTION public.generate_partner_settlement(
  p_partner_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_id UUID;
  v_settlement_id UUID;
  v_totals RECORD;
  v_effect RECORD;
  v_items_count INT := 0;
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

  -- Calculate totals from transaction_effects (READ-ONLY from ledger)
  SELECT 
    COALESCE(SUM(CASE WHEN te.entry_type = 'credit' THEN te.partner_amount ELSE -te.partner_amount END), 0) as partner_net,
    COALESCE(SUM(CASE WHEN te.entry_type = 'credit' THEN te.platform_amount ELSE -te.platform_amount END), 0) as platform_fee,
    COALESCE(SUM(CASE WHEN te.entry_type = 'credit' THEN te.gross_amount ELSE -te.gross_amount END), 0) as gross,
    COUNT(*) as tx_count
  INTO v_totals
  FROM public.transaction_effects te
  JOIN public.payment_events pe ON pe.id = te.source_event_id
  WHERE te.target = 'partner_earnings'
    AND te.partner_id = p_partner_id
    AND pe.event_timestamp::DATE BETWEEN p_period_start AND p_period_end
    AND te.id NOT IN (SELECT transaction_effect_id FROM public.settlement_items);

  -- Don't create empty settlements
  IF v_totals.tx_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_transactions',
      'message', 'No unsettled transactions in period'
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
    status
  ) VALUES (
    p_partner_id,
    p_period_start,
    p_period_end,
    v_totals.gross,
    v_totals.partner_net,
    v_totals.platform_fee,
    v_totals.tx_count,
    'manual',
    'pending'
  )
  RETURNING id INTO v_settlement_id;

  -- Link transaction_effects to settlement (without modifying them)
  FOR v_effect IN
    SELECT te.id, 
           CASE WHEN te.entry_type = 'credit' THEN te.partner_amount ELSE -te.partner_amount END as amount
    FROM public.transaction_effects te
    JOIN public.payment_events pe ON pe.id = te.source_event_id
    WHERE te.target = 'partner_earnings'
      AND te.partner_id = p_partner_id
      AND pe.event_timestamp::DATE BETWEEN p_period_start AND p_period_end
      AND te.id NOT IN (SELECT transaction_effect_id FROM public.settlement_items)
  LOOP
    INSERT INTO public.settlement_items (settlement_id, transaction_effect_id, amount)
    VALUES (v_settlement_id, v_effect.id, v_effect.amount);
    v_items_count := v_items_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', v_settlement_id,
    'period', jsonb_build_object('start', p_period_start, 'end', p_period_end),
    'totals', jsonb_build_object(
      'gross', v_totals.gross,
      'partner_net', v_totals.partner_net,
      'platform_fee', v_totals.platform_fee,
      'transaction_count', v_items_count
    )
  );
END;
$$;

-- RPC: Executar payout para um settlement
CREATE OR REPLACE FUNCTION public.execute_partner_payout(
  p_settlement_id UUID,
  p_payout_method TEXT DEFAULT 'manual',
  p_provider_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settlement RECORD;
  v_existing_payout UUID;
  v_payout_id UUID;
BEGIN
  -- Get settlement
  SELECT * INTO v_settlement
  FROM public.settlements
  WHERE id = p_settlement_id;

  IF v_settlement IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'settlement_not_found');
  END IF;

  -- Cannot pay cancelled/failed settlements
  IF v_settlement.status IN ('cancelled', 'failed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_settlement_status', 'status', v_settlement.status);
  END IF;

  -- Check for existing completed payout (idempotency)
  SELECT id INTO v_existing_payout
  FROM public.partner_payouts
  WHERE settlement_id = p_settlement_id
    AND status IN ('completed', 'processing');

  IF v_existing_payout IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'payout_exists',
      'existing_payout_id', v_existing_payout
    );
  END IF;

  -- Create payout record
  INSERT INTO public.partner_payouts (
    partner_id,
    settlement_id,
    amount,
    payout_method,
    provider_reference,
    status,
    executed_at
  ) VALUES (
    v_settlement.partner_id,
    p_settlement_id,
    v_settlement.total_partner_net,
    p_payout_method,
    p_provider_reference,
    'completed',
    now()
  )
  RETURNING id INTO v_payout_id;

  -- Update settlement status
  UPDATE public.settlements
  SET status = 'paid', paid_at = now(), updated_at = now()
  WHERE id = p_settlement_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount', v_settlement.total_partner_net,
    'method', p_payout_method
  );
END;
$$;

-- RPC: Get partner financial summary (READ-ONLY)
CREATE OR REPLACE FUNCTION public.get_partner_financial_summary(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available NUMERIC(12,2);
  v_pending_settlement NUMERIC(12,2);
  v_in_chargeback_window NUMERIC(12,2);
  v_total_paid NUMERIC(12,2);
BEGIN
  -- Available = unsettled credits from events older than 14 days (chargeback window)
  SELECT COALESCE(SUM(
    CASE WHEN te.entry_type = 'credit' THEN te.partner_amount ELSE -te.partner_amount END
  ), 0)
  INTO v_available
  FROM public.transaction_effects te
  JOIN public.payment_events pe ON pe.id = te.source_event_id
  WHERE te.target = 'partner_earnings'
    AND te.partner_id = p_partner_id
    AND pe.event_timestamp < now() - interval '14 days'
    AND te.id NOT IN (SELECT transaction_effect_id FROM public.settlement_items);

  -- In chargeback window = unsettled credits from last 14 days
  SELECT COALESCE(SUM(
    CASE WHEN te.entry_type = 'credit' THEN te.partner_amount ELSE -te.partner_amount END
  ), 0)
  INTO v_in_chargeback_window
  FROM public.transaction_effects te
  JOIN public.payment_events pe ON pe.id = te.source_event_id
  WHERE te.target = 'partner_earnings'
    AND te.partner_id = p_partner_id
    AND pe.event_timestamp >= now() - interval '14 days'
    AND te.id NOT IN (SELECT transaction_effect_id FROM public.settlement_items);

  -- Pending settlement = in pending/processing settlements
  SELECT COALESCE(SUM(total_partner_net), 0)
  INTO v_pending_settlement
  FROM public.settlements
  WHERE partner_id = p_partner_id
    AND status IN ('pending', 'processing');

  -- Total paid = completed payouts
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.partner_payouts
  WHERE partner_id = p_partner_id
    AND status = 'completed';

  RETURN jsonb_build_object(
    'available_balance', v_available,
    'in_chargeback_window', v_in_chargeback_window,
    'pending_settlement', v_pending_settlement,
    'total_paid', v_total_paid,
    'calculated_at', now()
  );
END;
$$;

-- RPC: Reconcile provider payments (for admin use)
CREATE OR REPLACE FUNCTION public.reconcile_provider_payments(
  p_provider TEXT DEFAULT 'asaas',
  p_from_date DATE DEFAULT (CURRENT_DATE - interval '30 days')::DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_checked INT := 0;
  v_ok INT := 0;
  v_mismatch INT := 0;
  v_missing INT := 0;
  v_event RECORD;
BEGIN
  -- Process all payment events from provider in period
  FOR v_event IN
    SELECT 
      pe.id,
      pe.provider_event_id,
      pe.raw_payload->>'value' as provider_amount,
      te.gross_amount as internal_amount
    FROM public.payment_events pe
    LEFT JOIN public.transaction_effects te ON te.source_event_id = pe.id AND te.target = 'partner_earnings'
    WHERE pe.provider = p_provider
      AND pe.event_timestamp::DATE >= p_from_date
      AND pe.event_type IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED')
  LOOP
    INSERT INTO public.financial_reconciliation (
      provider,
      provider_payment_id,
      internal_event_id,
      expected_amount,
      provider_amount,
      status,
      checked_at
    ) VALUES (
      p_provider,
      v_event.provider_event_id,
      v_event.id,
      v_event.internal_amount,
      (v_event.provider_amount)::NUMERIC,
      CASE 
        WHEN v_event.internal_amount IS NULL THEN 'missing_internal'
        WHEN v_event.internal_amount = (v_event.provider_amount)::NUMERIC THEN 'ok'
        ELSE 'mismatch'
      END,
      now()
    )
    ON CONFLICT (provider, provider_payment_id) DO UPDATE
    SET 
      expected_amount = EXCLUDED.expected_amount,
      provider_amount = EXCLUDED.provider_amount,
      status = EXCLUDED.status,
      checked_at = now();

    v_checked := v_checked + 1;
    
    IF v_event.internal_amount IS NULL THEN
      v_missing := v_missing + 1;
    ELSIF v_event.internal_amount = (v_event.provider_amount)::NUMERIC THEN
      v_ok := v_ok + 1;
    ELSE
      v_mismatch := v_mismatch + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'provider', p_provider,
    'from_date', p_from_date,
    'checked', v_checked,
    'ok', v_ok,
    'mismatch', v_mismatch,
    'missing_internal', v_missing
  );
END;
$$;