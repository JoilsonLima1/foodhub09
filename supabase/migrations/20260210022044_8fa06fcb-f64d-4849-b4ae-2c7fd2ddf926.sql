
-- PASSO 1: Schema

ALTER TABLE public.partner_billing_config
  ADD COLUMN IF NOT EXISTS monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tx_fee_percent NUMERIC(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tx_fee_fixed_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_day INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_invoice_period TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.partner_fee_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_invoice_id UUID REFERENCES public.tenant_invoices(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  invoice_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tx_fee_percent NUMERIC(5,4) NOT NULL DEFAULT 0,
  tx_fee_fixed_cents INTEGER NOT NULL DEFAULT 0,
  fee_calculated NUMERIC(12,2) NOT NULL DEFAULT 0,
  ar_invoice_id UUID REFERENCES public.partner_ar_invoices(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'accrued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_fee_ledger_partner_period ON public.partner_fee_ledger(partner_id, period);
CREATE INDEX IF NOT EXISTS idx_partner_fee_ledger_status ON public.partner_fee_ledger(status);

ALTER TABLE public.partner_fee_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage partner_fee_ledger"
  ON public.partner_fee_ledger FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Partners view own fee_ledger"
  ON public.partner_fee_ledger FOR SELECT
  USING (
    partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.partner_ar_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ar_invoice_id UUID NOT NULL REFERENCES public.partner_ar_invoices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_ar_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage ar_invoice_items"
  ON public.partner_ar_invoice_items FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Partners view own ar_invoice_items"
  ON public.partner_ar_invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_ar_invoices ai
      WHERE ai.id = partner_ar_invoice_items.ar_invoice_id
        AND ai.partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid())
    )
  );

-- PASSO 2: Accrual RPC

CREATE OR REPLACE FUNCTION public.accrue_partner_tx_fees_for_period(
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
  v_start DATE;
  v_end DATE;
  v_count INTEGER := 0;
  v_total_fees NUMERIC := 0;
  r RECORD;
BEGIN
  SELECT * INTO v_config FROM partner_billing_config WHERE partner_id = p_partner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_billing_config', 'partner_id', p_partner_id);
  END IF;

  v_start := (p_period || '-01')::DATE;
  v_end := (v_start + INTERVAL '1 month')::DATE;

  DELETE FROM partner_fee_ledger
  WHERE partner_id = p_partner_id AND period = p_period AND status = 'accrued';

  FOR r IN
    SELECT ti.id AS invoice_id, ti.tenant_id, ti.amount
    FROM tenant_invoices ti
    JOIN partner_tenants pt ON pt.tenant_id = ti.tenant_id AND pt.partner_id = p_partner_id
    WHERE ti.status = 'paid'
      AND ti.paid_at >= v_start
      AND ti.paid_at < v_end
  LOOP
    DECLARE
      v_fee NUMERIC;
    BEGIN
      v_fee := ROUND((r.amount * v_config.tx_fee_percent) + (v_config.tx_fee_fixed_cents / 100.0), 2);

      INSERT INTO partner_fee_ledger (
        partner_id, tenant_id, tenant_invoice_id, period,
        invoice_amount, tx_fee_percent, tx_fee_fixed_cents,
        fee_calculated, status
      ) VALUES (
        p_partner_id, r.tenant_id, r.invoice_id, p_period,
        r.amount, v_config.tx_fee_percent, v_config.tx_fee_fixed_cents,
        v_fee, 'accrued'
      );

      v_total_fees := v_total_fees + v_fee;
      v_count := v_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'partner_id', p_partner_id,
    'period', p_period,
    'invoices_processed', v_count,
    'total_tx_fees', v_total_fees,
    'monthly_fee_cents', v_config.monthly_fee_cents
  );
END;
$$;

-- PASSO 3: Invoice generation RPC

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

  IF EXISTS (
    SELECT 1 FROM partner_ar_invoices
    WHERE partner_id = p_partner_id
      AND reference_period_start = (p_period || '-01')::DATE
      AND status NOT IN ('canceled')
  ) THEN
    RETURN jsonb_build_object('error', 'invoice_already_exists', 'period', p_period);
  END IF;

  v_accrual := accrue_partner_tx_fees_for_period(p_partner_id, p_period);
  IF v_accrual->>'error' IS NOT NULL THEN
    RETURN v_accrual;
  END IF;

  v_total_tx_fees := COALESCE((v_accrual->>'total_tx_fees')::NUMERIC, 0);
  v_monthly_fee := v_config.monthly_fee_cents / 100.0;
  v_total := v_monthly_fee + v_total_tx_fees;

  v_period_start := (p_period || '-01')::DATE;
  v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
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
      jsonb_build_object('type', 'tx_fee', 'description', 'Taxas sobre transações (' || (v_accrual->>'invoices_processed') || ' faturas)', 'amount', v_total_tx_fees)
    )
  )
  RETURNING id INTO v_inv_id;

  INSERT INTO partner_ar_invoice_items (ar_invoice_id, item_type, description, quantity, unit_amount_cents, total_cents)
  VALUES
    (v_inv_id, 'monthly_fee', 'Mensalidade plataforma', 1, v_config.monthly_fee_cents, v_config.monthly_fee_cents),
    (v_inv_id, 'tx_fee', 'Taxas transações período ' || p_period, COALESCE((v_accrual->>'invoices_processed')::INTEGER, 0), 0, (v_total_tx_fees * 100)::INTEGER);

  UPDATE partner_fee_ledger
  SET ar_invoice_id = v_inv_id, status = 'invoiced'
  WHERE partner_id = p_partner_id AND period = p_period AND status = 'accrued';

  UPDATE partner_billing_config SET last_invoice_period = p_period WHERE partner_id = p_partner_id;

  RETURN jsonb_build_object(
    'ok', true,
    'invoice_id', v_inv_id,
    'invoice_number', v_inv_number,
    'total', v_total,
    'monthly_fee', v_monthly_fee,
    'tx_fees', v_total_tx_fees,
    'due_date', v_due_date
  );
END;
$$;

-- PASSO 4: Partner access state

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
BEGIN
  SELECT * INTO v_config FROM partner_billing_config WHERE partner_id = p_partner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('access', 'full', 'dunning_level', 0, 'blocked', false, 'read_only', false);
  END IF;

  SELECT COUNT(*), COALESCE(SUM(amount), 0), COALESCE(MAX(EXTRACT(DAY FROM now() - due_date)::INTEGER), 0)
  INTO v_overdue_count, v_overdue_amount, v_max_days
  FROM partner_ar_invoices
  WHERE partner_id = p_partner_id AND status = 'overdue';

  IF v_overdue_count = 0 THEN
    IF v_config.current_dunning_level > 0 THEN
      UPDATE partner_billing_config SET current_dunning_level = 0, dunning_started_at = NULL WHERE partner_id = p_partner_id;
    END IF;
    RETURN jsonb_build_object('access', 'full', 'dunning_level', 0, 'blocked', false, 'read_only', false, 'overdue_count', 0);
  END IF;

  v_level := 0;
  IF v_config.dunning_policy IS NOT NULL THEN
    IF v_max_days >= COALESCE((v_config.dunning_policy->'L4'->>'days_overdue')::INTEGER, 999) THEN
      v_level := 4; v_action := v_config.dunning_policy->'L4'->>'action';
    ELSIF v_max_days >= COALESCE((v_config.dunning_policy->'L3'->>'days_overdue')::INTEGER, 999) THEN
      v_level := 3; v_action := v_config.dunning_policy->'L3'->>'action';
    ELSIF v_max_days >= COALESCE((v_config.dunning_policy->'L2'->>'days_overdue')::INTEGER, 999) THEN
      v_level := 2; v_action := v_config.dunning_policy->'L2'->>'action';
    ELSIF v_max_days >= COALESCE((v_config.dunning_policy->'L1'->>'days_overdue')::INTEGER, 999) THEN
      v_level := 1; v_action := v_config.dunning_policy->'L1'->>'action';
    END IF;
  END IF;

  IF v_action IN ('block', 'terminate') THEN
    v_blocked := true;
    v_message := 'Acesso bloqueado por inadimplência (Nível ' || v_level || '). Entre em contato com o suporte.';
  ELSIF v_action = 'restrict' THEN
    v_read_only := true;
    v_message := 'Acesso restrito (somente leitura) por inadimplência (Nível ' || v_level || '). Regularize suas faturas.';
  ELSIF v_action = 'warn' THEN
    v_message := 'Você possui faturas em atraso. Regularize para evitar restrições.';
  END IF;

  IF v_level != v_config.current_dunning_level THEN
    UPDATE partner_billing_config
    SET current_dunning_level = v_level,
        dunning_started_at = CASE WHEN v_level > 0 AND dunning_started_at IS NULL THEN now() ELSE dunning_started_at END
    WHERE partner_id = p_partner_id;

    INSERT INTO partner_dunning_log (partner_id, dunning_level, action, description)
    VALUES (p_partner_id, v_level, COALESCE(v_action, 'none'), 'Auto-escalação: ' || v_max_days || ' dias em atraso, R$ ' || v_overdue_amount);
  END IF;

  RETURN jsonb_build_object(
    'access', CASE WHEN v_blocked THEN 'blocked' WHEN v_read_only THEN 'read_only' ELSE 'full' END,
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
