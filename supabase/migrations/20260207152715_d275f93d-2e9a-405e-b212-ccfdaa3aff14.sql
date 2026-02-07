
-- =====================================================
-- FASE 1: INFRAESTRUTURA COMERCIAL WHITE-LABEL
-- =====================================================

-- 1. Tabela partner_plan_modules: Módulos incluídos nos planos dos parceiros
CREATE TABLE IF NOT EXISTS public.partner_plan_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_plan_id UUID NOT NULL REFERENCES public.partner_plans(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  included_quantity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partner_plan_id, module_key)
);

ALTER TABLE public.partner_plan_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own plan modules"
  ON public.partner_plan_modules FOR SELECT
  USING (
    partner_plan_id IN (
      SELECT pp.id FROM public.partner_plans pp
      WHERE pp.partner_id IN (
        SELECT pu.partner_id FROM public.partner_users pu
        WHERE pu.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Partners admin can manage own plan modules"
  ON public.partner_plan_modules FOR ALL
  USING (
    partner_plan_id IN (
      SELECT pp.id FROM public.partner_plans pp
      WHERE pp.partner_id IN (
        SELECT pu.partner_id FROM public.partner_users pu
        WHERE pu.user_id = auth.uid() AND pu.role = 'admin'
      )
    )
  );

CREATE POLICY "Super admins manage all partner_plan_modules"
  ON public.partner_plan_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

-- 2. Tabela partner_invoices: Faturas para tenants de parceiros
CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_plan_id UUID REFERENCES public.partner_plans(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  description TEXT,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT,
  gateway_payment_id TEXT,
  gateway_invoice_url TEXT,
  billing_type TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_invoices_tenant ON public.partner_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_status ON public.partner_invoices(status);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_due_date ON public.partner_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_gateway_id ON public.partner_invoices(gateway_payment_id);

ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own invoices"
  ON public.partner_invoices FOR SELECT
  USING (
    partner_id IN (
      SELECT pu.partner_id FROM public.partner_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Partners admin can manage own invoices"
  ON public.partner_invoices FOR ALL
  USING (
    partner_id IN (
      SELECT pu.partner_id FROM public.partner_users pu
      WHERE pu.user_id = auth.uid() AND pu.role = 'admin'
    )
  );

CREATE POLICY "Super admins manage all partner_invoices"
  ON public.partner_invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

-- 3. Tabela partner_delinquency_config
CREATE TABLE IF NOT EXISTS public.partner_delinquency_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  warning_days INTEGER DEFAULT 1,
  partial_block_days INTEGER DEFAULT 7,
  full_block_days INTEGER DEFAULT 15,
  send_email_warning BOOLEAN DEFAULT true,
  send_sms_warning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_delinquency_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own delinquency config"
  ON public.partner_delinquency_config FOR SELECT
  USING (
    partner_id IN (
      SELECT pu.partner_id FROM public.partner_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Partners admin can manage own delinquency config"
  ON public.partner_delinquency_config FOR ALL
  USING (
    partner_id IN (
      SELECT pu.partner_id FROM public.partner_users pu
      WHERE pu.user_id = auth.uid() AND pu.role = 'admin'
    )
  );

-- 4. Função: Sincronizar módulos do tenant baseado no plano do parceiro
CREATE OR REPLACE FUNCTION public.sync_partner_tenant_modules(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_plan_id UUID;
  v_module RECORD;
  v_addon_module_id UUID;
BEGIN
  SELECT ts.partner_plan_id INTO v_partner_plan_id
  FROM public.tenant_subscriptions ts
  WHERE ts.tenant_id = p_tenant_id
  AND ts.status IN ('active', 'trial');

  IF v_partner_plan_id IS NULL THEN
    UPDATE public.tenant_addon_subscriptions
    SET status = 'cancelled', cancelled_at = now(), updated_at = now()
    WHERE tenant_id = p_tenant_id 
      AND source = 'partner_plan'
      AND status IN ('active', 'trial');
    RETURN;
  END IF;

  FOR v_module IN 
    SELECT ppm.module_key, ppm.included_quantity
    FROM public.partner_plan_modules ppm
    WHERE ppm.partner_plan_id = v_partner_plan_id
    AND ppm.is_active = true
  LOOP
    SELECT id INTO v_addon_module_id
    FROM public.addon_modules
    WHERE slug = v_module.module_key
    LIMIT 1;

    IF v_addon_module_id IS NOT NULL THEN
      INSERT INTO public.tenant_addon_subscriptions (
        tenant_id,
        addon_module_id,
        status,
        source,
        is_free,
        price_paid,
        quota,
        started_at
      )
      VALUES (
        p_tenant_id,
        v_addon_module_id,
        'active',
        'partner_plan',
        true,
        0,
        v_module.included_quantity,
        now()
      )
      ON CONFLICT (tenant_id, addon_module_id) 
      DO UPDATE SET
        status = 'active',
        source = CASE 
          WHEN tenant_addon_subscriptions.source = 'purchase' THEN 'purchase' 
          ELSE 'partner_plan' 
        END,
        quota = GREATEST(tenant_addon_subscriptions.quota, EXCLUDED.quota),
        is_free = CASE 
          WHEN tenant_addon_subscriptions.source = 'purchase' THEN tenant_addon_subscriptions.is_free
          ELSE true
        END,
        updated_at = now()
      WHERE tenant_addon_subscriptions.source != 'purchase';
    END IF;
  END LOOP;

  UPDATE public.tenant_addon_subscriptions tas
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE tas.tenant_id = p_tenant_id
    AND tas.source = 'partner_plan'
    AND tas.status IN ('active', 'trial')
    AND tas.addon_module_id NOT IN (
      SELECT am.id 
      FROM public.addon_modules am
      JOIN public.partner_plan_modules ppm ON ppm.module_key = am.slug
      WHERE ppm.partner_plan_id = v_partner_plan_id
      AND ppm.is_active = true
    );
END;
$$;

-- 5. Função: Ativar subscription de tenant de parceiro
CREATE OR REPLACE FUNCTION public.activate_partner_tenant_subscription(
  p_tenant_subscription_id UUID,
  p_payment_provider TEXT DEFAULT NULL,
  p_gateway_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subscription tenant_subscriptions;
  v_tenant_id UUID;
  v_now TIMESTAMPTZ := now();
  v_period_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_subscription
  FROM public.tenant_subscriptions
  WHERE id = p_tenant_subscription_id;

  IF v_subscription IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  v_tenant_id := v_subscription.tenant_id;
  v_period_end := v_now + interval '30 days';

  UPDATE public.tenant_subscriptions
  SET 
    status = 'active',
    current_period_start = v_now,
    current_period_end = v_period_end,
    trial_ends_at = NULL,
    payment_provider = COALESCE(p_payment_provider, payment_provider),
    external_subscription_id = COALESCE(p_gateway_payment_id, external_subscription_id),
    updated_at = v_now
  WHERE id = p_tenant_subscription_id;

  UPDATE public.tenants
  SET 
    subscription_status = 'active',
    subscription_current_period_start = v_now,
    subscription_current_period_end = v_period_end,
    last_payment_at = v_now,
    last_payment_provider = COALESCE(p_payment_provider, 'manual')
  WHERE id = v_tenant_id;

  PERFORM public.sync_partner_tenant_modules(v_tenant_id);

  RETURN jsonb_build_object(
    'success', true, 
    'tenant_id', v_tenant_id,
    'period_end', v_period_end
  );
END;
$$;

-- 6. Trigger: Auto-sync módulos quando subscription muda de status
CREATE OR REPLACE FUNCTION public.trigger_sync_partner_modules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.status != 'active' AND NEW.status = 'active') OR
       (NEW.status = 'active' AND OLD.partner_plan_id IS DISTINCT FROM NEW.partner_plan_id) THEN
      PERFORM public.sync_partner_tenant_modules(NEW.tenant_id);
    END IF;
    
    IF (OLD.status IN ('active', 'trial') AND NEW.status IN ('canceled', 'expired')) THEN
      UPDATE public.tenant_addon_subscriptions
      SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE tenant_id = NEW.tenant_id 
        AND source = 'partner_plan'
        AND status IN ('active', 'trial');
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN
    PERFORM public.sync_partner_tenant_modules(NEW.tenant_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_partner_modules ON public.tenant_subscriptions;
CREATE TRIGGER trg_sync_partner_modules
  AFTER INSERT OR UPDATE ON public.tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_partner_modules();

-- 7. Função: Processar pagamento de fatura do parceiro
CREATE OR REPLACE FUNCTION public.process_partner_invoice_payment(
  p_invoice_id UUID,
  p_payment_provider TEXT,
  p_gateway_payment_id TEXT DEFAULT NULL,
  p_billing_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice partner_invoices;
  v_result JSONB;
BEGIN
  SELECT * INTO v_invoice
  FROM public.partner_invoices
  WHERE id = p_invoice_id;

  IF v_invoice IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  IF v_invoice.status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice already paid');
  END IF;

  UPDATE public.partner_invoices
  SET 
    status = 'paid',
    paid_at = now(),
    payment_provider = p_payment_provider,
    gateway_payment_id = COALESCE(p_gateway_payment_id, gateway_payment_id),
    billing_type = COALESCE(p_billing_type, billing_type),
    updated_at = now()
  WHERE id = p_invoice_id;

  IF v_invoice.tenant_subscription_id IS NOT NULL THEN
    v_result := public.activate_partner_tenant_subscription(
      v_invoice.tenant_subscription_id,
      p_payment_provider,
      p_gateway_payment_id
    );
    RETURN v_result;
  END IF;

  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id);
END;
$$;

-- 8. Adicionar colunas de inadimplência em tenant_subscriptions
ALTER TABLE public.tenant_subscriptions 
ADD COLUMN IF NOT EXISTS delinquency_level TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delinquent_since TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_payment_attempt_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_attempts INTEGER DEFAULT 0;

-- 9. View: Faturas pendentes/vencidas
CREATE OR REPLACE VIEW public.partner_overdue_invoices AS
SELECT 
  pi.*,
  pp.name as partner_name,
  t.name as tenant_name,
  ppl.name as plan_name,
  CURRENT_DATE - pi.due_date as days_overdue
FROM public.partner_invoices pi
JOIN public.partners pp ON pp.id = pi.partner_id
JOIN public.tenants t ON t.id = pi.tenant_id
LEFT JOIN public.partner_plans ppl ON ppl.id = pi.partner_plan_id
WHERE pi.status IN ('pending', 'overdue')
AND pi.due_date < CURRENT_DATE;
