-- =============================================================
-- Phase 5: Partner Transaction Monetization - Final Version
-- =============================================================

-- 1. Create partner_earnings table to track partner revenue from tenant transactions
CREATE TABLE IF NOT EXISTS public.partner_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Transaction amounts
  gross_amount DECIMAL(12,2) NOT NULL,
  gateway_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  partner_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  merchant_net DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Payment details
  payment_method TEXT,
  currency TEXT DEFAULT 'BRL',
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'refunded', 'disputed')),
  settled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create platform_partner_revenue table (platform's cut from partner transactions)
CREATE TABLE IF NOT EXISTS public.platform_partner_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_earning_id UUID REFERENCES public.partner_earnings(id) ON DELETE SET NULL,
  
  amount DECIMAL(12,2) NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('platform_share', 'gateway_passthrough', 'markup')),
  description TEXT,
  
  period_start DATE,
  period_end DATE,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid')),
  invoice_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add partner split configuration to partner_fee_config (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'partner_fee_config' AND column_name = 'platform_share_percent') THEN
    ALTER TABLE public.partner_fee_config ADD COLUMN platform_share_percent DECIMAL(5,2) DEFAULT 20.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'partner_fee_config' AND column_name = 'platform_share_enabled') THEN
    ALTER TABLE public.partner_fee_config ADD COLUMN platform_share_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 4. Create function to calculate partner transaction fees with validation
CREATE OR REPLACE FUNCTION public.calculate_partner_transaction_fee(
  p_partner_id UUID,
  p_tenant_id UUID,
  p_gross_amount DECIMAL,
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_config partner_fee_config%ROWTYPE;
  v_policy partner_policies%ROWTYPE;
  v_percent_fee DECIMAL := 0;
  v_fixed_fee DECIMAL := 0;
  v_method_fee DECIMAL := 0;
  v_total_partner_fee DECIMAL := 0;
  v_platform_share DECIMAL := 0;
  v_partner_net DECIMAL := 0;
  v_merchant_net DECIMAL := 0;
  v_gateway_fee DECIMAL := 0;
BEGIN
  -- Get partner fee config
  SELECT * INTO v_partner_config
  FROM partner_fee_config
  WHERE partner_id = p_partner_id
  LIMIT 1;

  -- Get global policy for max limits
  SELECT * INTO v_policy
  FROM partner_policies
  WHERE partner_id IS NULL
  LIMIT 1;

  -- If partner config not found or disabled, return no fees
  IF v_partner_config IS NULL OR NOT COALESCE(v_partner_config.is_enabled, false) THEN
    RETURN jsonb_build_object(
      'gross_amount', p_gross_amount,
      'gateway_fee', 0,
      'platform_fee', 0,
      'partner_fee', 0,
      'merchant_net', p_gross_amount,
      'breakdown', jsonb_build_object()
    );
  END IF;

  -- Calculate base platform fee (capped by policy limits)
  v_percent_fee := LEAST(
    COALESCE(v_partner_config.platform_fee_percent, 0),
    COALESCE(v_policy.max_platform_fee_percent, 10)
  );
  v_fixed_fee := LEAST(
    COALESCE(v_partner_config.platform_fee_fixed, 0),
    COALESCE(v_policy.max_platform_fee_fixed, 5)
  );

  -- Calculate method-specific fees (capped by policy limits)
  CASE p_payment_method
    WHEN 'pix' THEN
      v_method_fee := LEAST(
        COALESCE(v_partner_config.pix_fee_percent, 0),
        COALESCE(v_policy.max_pix_fee_percent, 5)
      );
    WHEN 'credit_card' THEN
      v_method_fee := LEAST(
        COALESCE(v_partner_config.credit_fee_percent, 0),
        COALESCE(v_policy.max_credit_fee_percent, 10)
      );
    WHEN 'debit_card' THEN
      v_method_fee := LEAST(
        COALESCE(v_partner_config.debit_fee_percent, 0),
        COALESCE(v_policy.max_debit_fee_percent, 5)
      );
    WHEN 'boleto' THEN
      v_fixed_fee := v_fixed_fee + LEAST(
        COALESCE(v_partner_config.boleto_fee_fixed, 0),
        COALESCE(v_policy.max_boleto_fee_fixed, 10)
      );
    ELSE
      v_method_fee := 0;
  END CASE;

  -- Calculate total partner fee
  v_total_partner_fee := (p_gross_amount * (v_percent_fee + v_method_fee) / 100) + v_fixed_fee;

  -- Calculate platform's share of partner fee
  IF COALESCE(v_partner_config.platform_share_enabled, true) THEN
    v_platform_share := v_total_partner_fee * COALESCE(v_partner_config.platform_share_percent, 20) / 100;
  END IF;

  v_partner_net := v_total_partner_fee - v_platform_share;
  v_merchant_net := p_gross_amount - v_total_partner_fee - v_gateway_fee;

  RETURN jsonb_build_object(
    'gross_amount', p_gross_amount,
    'gateway_fee', v_gateway_fee,
    'platform_fee', v_platform_share,
    'partner_fee', v_partner_net,
    'total_fee', v_total_partner_fee,
    'merchant_net', v_merchant_net,
    'breakdown', jsonb_build_object(
      'base_percent', v_percent_fee,
      'method_percent', v_method_fee,
      'fixed_fee', v_fixed_fee,
      'platform_share_percent', COALESCE(v_partner_config.platform_share_percent, 20)
    )
  );
END;
$$;

-- 5. Create function to record partner earnings from a transaction
CREATE OR REPLACE FUNCTION public.record_partner_transaction(
  p_partner_id UUID,
  p_tenant_id UUID,
  p_transaction_id UUID,
  p_order_id UUID,
  p_gross_amount DECIMAL,
  p_payment_method TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_result JSONB;
  v_earning_id UUID;
BEGIN
  -- Calculate fees
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
    status
  ) VALUES (
    p_partner_id,
    p_tenant_id,
    p_transaction_id,
    p_order_id,
    (v_fee_result->>'gross_amount')::DECIMAL,
    (v_fee_result->>'gateway_fee')::DECIMAL,
    (v_fee_result->>'platform_fee')::DECIMAL,
    (v_fee_result->>'partner_fee')::DECIMAL,
    (v_fee_result->>'merchant_net')::DECIMAL,
    p_payment_method,
    'pending'
  )
  RETURNING id INTO v_earning_id;

  -- Record platform's share if any
  IF (v_fee_result->>'platform_fee')::DECIMAL > 0 THEN
    INSERT INTO platform_partner_revenue (
      partner_id,
      partner_earning_id,
      amount,
      fee_type,
      description
    ) VALUES (
      p_partner_id,
      v_earning_id,
      (v_fee_result->>'platform_fee')::DECIMAL,
      'platform_share',
      'Participação da plataforma na transação'
    );
  END IF;

  RETURN v_earning_id;
END;
$$;

-- 6. Enable RLS on new tables
ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_partner_revenue ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for partner_earnings (using partner_users table)
CREATE POLICY "Partners can view their own earnings"
ON public.partner_earnings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM partner_users pu
    WHERE pu.user_id = auth.uid() 
    AND pu.partner_id = partner_earnings.partner_id
    AND pu.is_active = true
  )
  OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- 8. RLS Policies for platform_partner_revenue (Super Admin only)
CREATE POLICY "Super admins can view all platform revenue"
ON public.platform_partner_revenue FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admins can manage platform revenue"
ON public.platform_partner_revenue FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner_id ON public.partner_earnings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_tenant_id ON public.partner_earnings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_created_at ON public.partner_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_status ON public.partner_earnings(status);
CREATE INDEX IF NOT EXISTS idx_platform_partner_revenue_partner_id ON public.platform_partner_revenue(partner_id);

-- 10. Add updated_at trigger for partner_earnings
CREATE TRIGGER update_partner_earnings_updated_at
BEFORE UPDATE ON public.partner_earnings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();