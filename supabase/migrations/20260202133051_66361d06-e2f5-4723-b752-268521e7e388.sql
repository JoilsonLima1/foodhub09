-- =============================================
-- SISTEMA DE MONETIZAÇÃO POR TRANSAÇÃO
-- =============================================

-- 1) Tabela de configuração global de taxas da plataforma
CREATE TABLE public.platform_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'automatic')),
  default_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  default_fixed NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Taxas por método de pagamento (JSON)
  per_method_config JSONB NOT NULL DEFAULT '{
    "pix": {"percent": 0, "fixed": 0},
    "credit_card": {"percent": 0, "fixed": 0},
    "debit_card": {"percent": 0, "fixed": 0},
    "boleto": {"percent": 0, "fixed": 0}
  }'::jsonb,
  -- Taxas por plano (JSON)
  per_plan_config JSONB NOT NULL DEFAULT '{
    "free": {"percent": 0, "fixed": 0},
    "starter": {"percent": 0, "fixed": 0},
    "professional": {"percent": 0, "fixed": 0},
    "enterprise": {"percent": 0, "fixed": 0}
  }'::jsonb,
  -- Configuração de split
  split_destination TEXT,
  split_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração inicial (desabilitado)
INSERT INTO public.platform_fee_config (enabled, mode) VALUES (false, 'manual');

-- 2) Tabela de overrides por tenant (taxas personalizadas)
CREATE TABLE public.tenant_fee_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  override_percent NUMERIC(5,2),
  override_fixed NUMERIC(10,2),
  per_method_override JSONB,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 3) Tabela de ledger (registro de todas as taxas aplicadas)
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('gateway_fee', 'platform_fee', 'merchant_net', 'refund', 'chargeback')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_method TEXT,
  gateway_provider TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Tabela de termos de pagamento
CREATE TABLE public.payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Termos de Pagamento',
  content TEXT NOT NULL,
  clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir termos padrão
INSERT INTO public.payment_terms (version, title, content, clauses, is_active, published_at)
VALUES (
  '1.0',
  'Termos de Pagamento e Taxas Operacionais',
  'Ao utilizar os serviços de pagamento integrados à plataforma, o lojista concorda com os termos descritos abaixo.',
  '[
    {"id": "clause_1", "title": "Natureza da Plataforma", "content": "A plataforma NÃO é uma instituição financeira. Atuamos apenas como intermediadores tecnológicos entre o lojista e os gateways de pagamento parceiros."},
    {"id": "clause_2", "title": "Responsabilidade por Estornos", "content": "A plataforma NÃO se responsabiliza por estornos (refunds) solicitados pelos clientes finais. A gestão de estornos é de responsabilidade exclusiva do lojista junto ao gateway de pagamento."},
    {"id": "clause_3", "title": "Responsabilidade por Chargebacks", "content": "A plataforma NÃO se responsabiliza por chargebacks (contestações de cartão). O lojista assume total responsabilidade por disputas originadas de suas transações."},
    {"id": "clause_4", "title": "Responsabilidade por Vendas", "content": "A plataforma NÃO se responsabiliza pelas vendas realizadas pelo lojista, incluindo qualidade de produtos, entregas, atendimento ao cliente ou quaisquer obrigações comerciais."},
    {"id": "clause_5", "title": "Taxa Operacional", "content": "A plataforma pode cobrar uma taxa operacional por transação processada, conforme o plano contratado e método de pagamento utilizado. As taxas vigentes são exibidas no painel do lojista."}
  ]'::jsonb,
  true,
  now()
);

-- 5) Tabela de aceite dos termos por tenant
CREATE TABLE public.payment_terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  terms_id UUID NOT NULL REFERENCES public.payment_terms(id),
  terms_version TEXT NOT NULL,
  accepted_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(tenant_id, terms_version)
);

-- 6) Tabela de auditoria de alterações de taxas
CREATE TABLE public.fee_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_ledger_tenant ON public.ledger_entries(tenant_id);
CREATE INDEX idx_ledger_transaction ON public.ledger_entries(transaction_id);
CREATE INDEX idx_ledger_created ON public.ledger_entries(created_at);
CREATE INDEX idx_tenant_fee_overrides_tenant ON public.tenant_fee_overrides(tenant_id);
CREATE INDEX idx_fee_audit_entity ON public.fee_audit_logs(entity_type, entity_id);
CREATE INDEX idx_payment_terms_acceptance_tenant ON public.payment_terms_acceptance(tenant_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- platform_fee_config: Apenas super_admin pode ver/editar
ALTER TABLE public.platform_fee_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage platform_fee_config"
ON public.platform_fee_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- tenant_fee_overrides: Super admin pode tudo, tenant admin pode ver próprio
ALTER TABLE public.tenant_fee_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all tenant_fee_overrides"
ON public.tenant_fee_overrides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view own fee overrides"
ON public.tenant_fee_overrides
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') AND
  tenant_id = public.get_user_tenant_id(auth.uid())
);

-- ledger_entries: Super admin pode tudo, tenant admin pode ver próprio
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all ledger_entries"
ON public.ledger_entries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view own ledger entries"
ON public.ledger_entries
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) AND
  tenant_id = public.get_user_tenant_id(auth.uid())
);

-- payment_terms: Público para leitura (ativos), super_admin para edição
ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment terms"
ON public.payment_terms
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Super admins can manage payment_terms"
ON public.payment_terms
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- payment_terms_acceptance: Tenant pode ver/criar próprio, super_admin pode tudo
ALTER TABLE public.payment_terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all acceptances"
ON public.payment_terms_acceptance
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view own acceptances"
ON public.payment_terms_acceptance
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Tenant admins can accept terms"
ON public.payment_terms_acceptance
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') AND
  tenant_id = public.get_user_tenant_id(auth.uid())
);

-- fee_audit_logs: Apenas super_admin
ALTER TABLE public.fee_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view fee_audit_logs"
ON public.fee_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert fee_audit_logs"
ON public.fee_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_platform_fee_config_updated_at
BEFORE UPDATE ON public.platform_fee_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_fee_overrides_updated_at
BEFORE UPDATE ON public.tenant_fee_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_terms_updated_at
BEFORE UPDATE ON public.payment_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para calcular taxa da plataforma
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config platform_fee_config%ROWTYPE;
  v_override tenant_fee_overrides%ROWTYPE;
  v_tenant_plan TEXT;
  v_percent NUMERIC := 0;
  v_fixed NUMERIC := 0;
  v_method_config JSONB;
  v_plan_config JSONB;
  v_fee NUMERIC := 0;
BEGIN
  -- Buscar configuração global
  SELECT * INTO v_config FROM public.platform_fee_config LIMIT 1;
  
  -- Se taxas desabilitadas, retornar zero
  IF v_config IS NULL OR v_config.enabled = false THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'platform_fee', 0,
      'percent_applied', 0,
      'fixed_applied', 0
    );
  END IF;
  
  -- Buscar plano do tenant
  SELECT sp.slug INTO v_tenant_plan
  FROM public.tenants t
  JOIN public.subscription_plans sp ON sp.id = t.subscription_plan_id
  WHERE t.id = p_tenant_id;
  
  -- Verificar override do tenant
  SELECT * INTO v_override FROM public.tenant_fee_overrides WHERE tenant_id = p_tenant_id;
  
  IF v_override IS NOT NULL THEN
    -- Usar override do tenant
    v_percent := COALESCE(v_override.override_percent, v_config.default_percent);
    v_fixed := COALESCE(v_override.override_fixed, v_config.default_fixed);
    
    -- Verificar override por método
    IF v_override.per_method_override IS NOT NULL AND v_override.per_method_override ? p_payment_method THEN
      v_percent := COALESCE((v_override.per_method_override -> p_payment_method ->> 'percent')::NUMERIC, v_percent);
      v_fixed := COALESCE((v_override.per_method_override -> p_payment_method ->> 'fixed')::NUMERIC, v_fixed);
    END IF;
  ELSE
    -- Usar configuração global
    v_percent := v_config.default_percent;
    v_fixed := v_config.default_fixed;
    
    -- Aplicar configuração por método se existir
    IF v_config.per_method_config ? p_payment_method THEN
      v_method_config := v_config.per_method_config -> p_payment_method;
      v_percent := COALESCE((v_method_config ->> 'percent')::NUMERIC, v_percent);
      v_fixed := COALESCE((v_method_config ->> 'fixed')::NUMERIC, v_fixed);
    END IF;
    
    -- Aplicar configuração por plano se existir (sobrescreve método)
    IF v_tenant_plan IS NOT NULL AND v_config.per_plan_config ? v_tenant_plan THEN
      v_plan_config := v_config.per_plan_config -> v_tenant_plan;
      v_percent := COALESCE((v_plan_config ->> 'percent')::NUMERIC, v_percent);
      v_fixed := COALESCE((v_plan_config ->> 'fixed')::NUMERIC, v_fixed);
    END IF;
  END IF;
  
  -- Calcular taxa
  v_fee := (p_amount * v_percent / 100) + v_fixed;
  
  RETURN jsonb_build_object(
    'enabled', true,
    'platform_fee', ROUND(v_fee, 2),
    'percent_applied', v_percent,
    'fixed_applied', v_fixed,
    'tenant_plan', v_tenant_plan,
    'has_override', v_override IS NOT NULL
  );
END;
$$;

-- Função para registrar entrada no ledger
CREATE OR REPLACE FUNCTION public.record_ledger_entry(
  p_tenant_id UUID,
  p_transaction_id TEXT,
  p_order_id UUID,
  p_entry_type TEXT,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT NULL,
  p_gateway_provider TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  INSERT INTO public.ledger_entries (
    tenant_id, transaction_id, order_id, entry_type, 
    amount, payment_method, gateway_provider, metadata
  ) VALUES (
    p_tenant_id, p_transaction_id, p_order_id, p_entry_type,
    p_amount, p_payment_method, p_gateway_provider, p_metadata
  )
  RETURNING id INTO v_entry_id;
  
  RETURN v_entry_id;
END;
$$;

-- Função para verificar se tenant aceitou termos vigentes
CREATE OR REPLACE FUNCTION public.has_accepted_current_terms(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.payment_terms_acceptance pta
    JOIN public.payment_terms pt ON pt.id = pta.terms_id
    WHERE pta.tenant_id = p_tenant_id
      AND pt.is_active = true
  )
$$;