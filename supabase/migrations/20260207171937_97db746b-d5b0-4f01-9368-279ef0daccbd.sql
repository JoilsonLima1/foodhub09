-- ============================================================
-- PHASE 5 FINAL: SSOT Financial Event Ledger (CORRECTED)
-- ============================================================

-- 1. Create payment_events table (SSOT for all financial events)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'asaas',
  provider_event_id TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  amount_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_net NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_method TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB DEFAULT '{}',
  correlation_id TEXT,
  status TEXT DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT uq_payment_events_provider_event UNIQUE(provider, provider_event_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_payment ON public.payment_events(provider, provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_tenant ON public.payment_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_partner ON public.payment_events(partner_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON public.payment_events(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON public.payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_occurred_at ON public.payment_events(occurred_at DESC);

-- 2. Create transaction_effects table (idempotency for applied effects)
CREATE TABLE IF NOT EXISTS public.transaction_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id UUID NOT NULL REFERENCES public.payment_events(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  target_record_id UUID,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT uq_transaction_effects_event_target UNIQUE(source_event_id, target)
);

CREATE INDEX IF NOT EXISTS idx_transaction_effects_source ON public.transaction_effects(source_event_id);
CREATE INDEX IF NOT EXISTS idx_transaction_effects_target ON public.transaction_effects(target);
CREATE INDEX IF NOT EXISTS idx_transaction_effects_target_record ON public.transaction_effects(target_record_id);

-- 3. Enable RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_effects ENABLE ROW LEVEL SECURITY;

-- Super admin can see all (using user_roles table)
CREATE POLICY "Super admins can manage payment_events"
  ON public.payment_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage transaction_effects"
  ON public.transaction_effects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Partners can see their own events
CREATE POLICY "Partners can view their payment_events"
  ON public.payment_events
  FOR SELECT
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users
      WHERE user_id = auth.uid()
    )
  );

-- 4. Create event type mapping function
CREATE OR REPLACE FUNCTION public.map_asaas_event_type(p_event TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_event
    WHEN 'PAYMENT_CREATED' THEN 'PAYMENT_CREATED'
    WHEN 'PAYMENT_CONFIRMED' THEN 'PAYMENT_CONFIRMED'
    WHEN 'PAYMENT_RECEIVED' THEN 'PAYMENT_CONFIRMED'
    WHEN 'PAYMENT_OVERDUE' THEN 'PAYMENT_OVERDUE'
    WHEN 'PAYMENT_DELETED' THEN 'PAYMENT_CANCELED'
    WHEN 'PAYMENT_REFUNDED' THEN 'PAYMENT_REFUNDED'
    WHEN 'PAYMENT_CHARGEBACK_REQUESTED' THEN 'PAYMENT_CHARGEBACK'
    WHEN 'PAYMENT_CHARGEBACK_DISPUTE' THEN 'PAYMENT_CHARGEBACK'
    WHEN 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL' THEN 'PAYMENT_CHARGEBACK'
    WHEN 'PAYMENT_RESTORED' THEN 'PAYMENT_RESTORED'
    ELSE p_event
  END;
END;
$$;

-- 5. Add helper columns to partner_tenants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'partner_tenants' 
                 AND column_name = 'risk_flag') THEN
    ALTER TABLE public.partner_tenants ADD COLUMN risk_flag TEXT;
    ALTER TABLE public.partner_tenants ADD COLUMN risk_flagged_at TIMESTAMPTZ;
  END IF;
END $$;

-- 6. Add helper columns to tenant_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'tenant_subscriptions' 
                 AND column_name = 'delinquency_stage') THEN
    ALTER TABLE public.tenant_subscriptions ADD COLUMN delinquency_stage INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'tenant_subscriptions' 
                 AND column_name = 'last_payment_at') THEN
    ALTER TABLE public.tenant_subscriptions ADD COLUMN last_payment_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'tenant_subscriptions' 
                 AND column_name = 'notes') THEN
    ALTER TABLE public.tenant_subscriptions ADD COLUMN notes TEXT;
  END IF;
END $$;

-- 7. Enable realtime for payment_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_events;