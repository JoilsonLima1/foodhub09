-- =================================================================
-- NOVA ARQUITETURA: Rastreamento de compra de módulos via payment_id
-- =================================================================

-- Tabela principal: module_purchases
-- Armazena cada tentativa de compra com o payment_id do gateway como chave de busca
CREATE TABLE public.module_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  addon_module_id UUID NOT NULL REFERENCES public.addon_modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Status do fluxo de compra
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  
  -- Gateway e identificadores de pagamento
  gateway TEXT NOT NULL CHECK (gateway IN ('asaas', 'stripe')),
  gateway_payment_id TEXT, -- pay_xxx (Asaas) ou pi_xxx (Stripe)
  gateway_customer_id TEXT,
  gateway_invoice_url TEXT,
  
  -- Detalhes do pagamento (preenchidos após confirmação)
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  billing_type TEXT, -- PIX, CREDIT_CARD, BOLETO, etc.
  invoice_number TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Índice único para evitar compras duplicadas pendentes
  CONSTRAINT unique_pending_purchase UNIQUE (tenant_id, addon_module_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Índice para busca rápida por payment_id (principal chave de lookup no webhook)
CREATE INDEX idx_module_purchases_gateway_payment_id ON public.module_purchases(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;

-- Índice para busca por tenant
CREATE INDEX idx_module_purchases_tenant_id ON public.module_purchases(tenant_id);

-- Índice para busca por status
CREATE INDEX idx_module_purchases_status ON public.module_purchases(status);

-- Trigger para updated_at
CREATE TRIGGER update_module_purchases_updated_at
  BEFORE UPDATE ON public.module_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.module_purchases ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários podem ver suas próprias compras (via tenant)
CREATE POLICY "Users can view own tenant purchases"
  ON public.module_purchases FOR SELECT
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- Políticas: apenas edge functions com service_role podem inserir/atualizar
CREATE POLICY "Service role can manage purchases"
  ON public.module_purchases FOR ALL
  USING (auth.role() = 'service_role');

-- =================================================================
-- Tabela para eventos de webhook sem match (para reprocessamento)
-- =================================================================
CREATE TABLE public.webhook_unmatched_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação do evento
  gateway TEXT NOT NULL,
  event_type TEXT NOT NULL,
  gateway_payment_id TEXT,
  gateway_customer_id TEXT,
  
  -- Payload completo para reprocessamento
  payload JSONB NOT NULL,
  
  -- Status de reprocessamento
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'ignored')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  
  -- Índice para busca por payment_id
  CONSTRAINT idx_unmatched_payment UNIQUE (gateway, gateway_payment_id)
);

-- Índice para busca de eventos pendentes
CREATE INDEX idx_webhook_unmatched_pending ON public.webhook_unmatched_events(status) WHERE status = 'pending';

-- RLS (apenas service_role)
ALTER TABLE public.webhook_unmatched_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage unmatched events"
  ON public.webhook_unmatched_events FOR ALL
  USING (auth.role() = 'service_role');

-- Super admins podem visualizar para debugging
CREATE POLICY "Super admins can view unmatched events"
  ON public.webhook_unmatched_events FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));