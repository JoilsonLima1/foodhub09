-- Create enum for addon module categories
CREATE TYPE public.addon_module_category AS ENUM (
  'integrations',
  'operations', 
  'marketing',
  'hardware',
  'logistics'
);

-- Create enum for addon subscription status
CREATE TYPE public.addon_subscription_status AS ENUM (
  'active',
  'trial',
  'suspended',
  'cancelled'
);

-- Create addon_modules table (catalog of available modules)
CREATE TABLE public.addon_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category addon_module_category NOT NULL DEFAULT 'integrations',
  icon TEXT NOT NULL DEFAULT 'Package',
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  setup_fee NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenant_addon_subscriptions table (which tenants have which modules)
CREATE TABLE public.tenant_addon_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  addon_module_id UUID NOT NULL REFERENCES public.addon_modules(id) ON DELETE CASCADE,
  status addon_subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, addon_module_id)
);

-- Enable RLS
ALTER TABLE public.addon_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_addon_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addon_modules
CREATE POLICY "Anyone can view active addon modules"
ON public.addon_modules
FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage addon modules"
ON public.addon_modules
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for tenant_addon_subscriptions
CREATE POLICY "Tenants can view their own subscriptions"
ON public.tenant_addon_subscriptions
FOR SELECT
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins can manage all subscriptions"
ON public.tenant_addon_subscriptions
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Function to check if tenant has addon module
CREATE OR REPLACE FUNCTION public.tenant_has_addon(_tenant_id UUID, _addon_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_addon_subscriptions tas
    JOIN public.addon_modules am ON am.id = tas.addon_module_id
    WHERE tas.tenant_id = _tenant_id
      AND am.slug = _addon_slug
      AND tas.status IN ('active', 'trial')
      AND (tas.expires_at IS NULL OR tas.expires_at > now())
  )
$$;

-- Updated at trigger
CREATE TRIGGER update_addon_modules_updated_at
  BEFORE UPDATE ON public.addon_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_addon_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_addon_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default addon modules catalog
INSERT INTO public.addon_modules (slug, name, description, category, icon, monthly_price, features, display_order) VALUES
-- Integrations
('integration_99food', '99Food', 'Integração completa com a plataforma 99Food para receber pedidos automaticamente.', 'integrations', 'Truck', 149.90, '["Recebimento automático de pedidos", "Sincronização de cardápio", "Atualização de status em tempo real", "Gestão de entregadores"]', 1),
('integration_keeta', 'Keeta', 'Integração com a plataforma Keeta para delivery de alta performance.', 'integrations', 'Zap', 149.90, '["Pedidos em tempo real", "Rastreamento de entregas", "Cardápio sincronizado", "Relatórios integrados"]', 2),
('integration_sms', 'SMS Marketing', 'Envie SMS para seus clientes com promoções e atualizações de pedidos.', 'marketing', 'MessageSquare', 99.90, '["Campanhas de SMS em massa", "Notificações de pedido", "Templates personalizados", "Relatórios de entrega"]', 3),
('integration_bina', 'Bina Telefônica', 'Identifique clientes automaticamente ao receberem ligações no estabelecimento.', 'integrations', 'Phone', 79.90, '["Identificador de chamadas", "Histórico de pedidos do cliente", "Cadastro automático", "Sugestões baseadas em histórico"]', 4),

-- Operations
('loyalty_program', 'Programa de Fidelidade', 'Fidelize seus clientes com sistema de pontos e recompensas.', 'marketing', 'Award', 129.90, '["Sistema de pontos", "Níveis de fidelidade", "Recompensas personalizadas", "Relatórios de engajamento"]', 5),
('discount_coupons', 'Cupons de Desconto Avançado', 'Crie campanhas promocionais com cupons personalizados e regras avançadas.', 'marketing', 'Ticket', 49.90, '["Cupons ilimitados", "Regras avançadas", "Segmentação de clientes", "Relatórios de uso"]', 6),
('password_panel', 'Painel de Senha', 'Monitor no balcão para chamar senhas e agilizar entregas.', 'hardware', 'MonitorPlay', 89.90, '["Painel customizável", "Chamada por voz", "Fila inteligente", "Múltiplos monitores"]', 7),
('mobile_command', 'Comanda Mobile', 'Garçons fazem pedidos direto do celular, enviando para cozinha instantaneamente.', 'operations', 'Smartphone', 99.90, '["App para garçons", "Envio direto para cozinha", "Divisão de contas", "Modo offline"]', 8),

-- Hardware
('tef_integration', 'TEF PINPAD', 'TEF PINPAD integrado ao PDV. Obrigatório no estado do Rio Grande do Sul.', 'hardware', 'CreditCard', 149.90, '["Integração PINPAD", "Múltiplas bandeiras", "Comprovante digital", "Conciliação automática"]', 9),
('kitchen_monitor', 'Monitor de Preparos', 'Reduza gastos com papel e melhore processos com monitores de produção na cozinha.', 'hardware', 'MonitorCheck', 79.90, '["Eliminação de papel", "Priorização inteligente", "Tempo de preparo", "Múltiplas estações"]', 10),

-- Logistics
('smart_delivery', 'Smart Delivery', 'Ferramenta logística para separação e entrega de pedidos até 30% mais rápido.', 'logistics', 'PackageCheck', 199.90, '["Roteirização inteligente", "Separação otimizada", "Rastreamento em tempo real", "Métricas de performance"]', 11),
('intelligent_dispatcher', 'Disparador Inteligente', 'Crie campanhas de marketing e entre em contato com clientes no WhatsApp.', 'marketing', 'Send', 149.90, '["Campanhas automáticas", "Segmentação avançada", "Templates aprovados", "Métricas de conversão"]', 12);