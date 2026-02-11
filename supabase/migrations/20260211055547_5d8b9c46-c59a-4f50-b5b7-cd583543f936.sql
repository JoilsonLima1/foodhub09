
-- ============================================================
-- Tabela de documentos legais (contratos versionados)
-- ============================================================
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_scroll BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(type, version)
);

CREATE INDEX idx_legal_documents_type_active ON public.legal_documents(type, is_active);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active documents
CREATE POLICY "Authenticated users can read active legal documents"
  ON public.legal_documents
  FOR SELECT
  USING (is_active = true);

-- Service role manages all
CREATE POLICY "Service role manages legal documents"
  ON public.legal_documents
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Super admins can manage
CREATE POLICY "Super admins manage legal documents"
  ON public.legal_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Tabela de aceites legais por tenant
-- ============================================================
CREATE TABLE public.tenant_legal_acceptance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  document_id UUID NOT NULL REFERENCES public.legal_documents(id),
  document_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_ip TEXT NULL,
  accepted_user_id UUID NULL,
  accepted_user_agent TEXT NULL,
  metadata JSONB NULL
);

CREATE INDEX idx_tenant_legal_tenant ON public.tenant_legal_acceptance(tenant_id);
CREATE INDEX idx_tenant_legal_doc ON public.tenant_legal_acceptance(document_id);
CREATE INDEX idx_tenant_legal_type ON public.tenant_legal_acceptance(tenant_id, document_type);

ALTER TABLE public.tenant_legal_acceptance ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own acceptances
CREATE POLICY "Tenants can view own acceptances"
  ON public.tenant_legal_acceptance
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Authenticated users can insert their own acceptance
CREATE POLICY "Users can accept documents"
  ON public.tenant_legal_acceptance
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND accepted_user_id = auth.uid()
  );

-- Service role manages all
CREATE POLICY "Service role manages acceptances"
  ON public.tenant_legal_acceptance
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Super admins can read all
CREATE POLICY "Super admins can read all acceptances"
  ON public.tenant_legal_acceptance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

-- ============================================================
-- Seed: Contrato Marketplace v1.0
-- ============================================================
INSERT INTO public.legal_documents (type, version, title, content) VALUES
('marketplace_payment_terms', '1.0', 'Contrato de Intermediação Tecnológica e Pagamentos', E'CONTRATO DE INTERMEDIAÇÃO TECNOLÓGICA E PAGAMENTOS\n\n1. Natureza da Plataforma\n\nA Plataforma atua exclusivamente como fornecedora de tecnologia de intermediação digital, não realizando guarda, custódia ou liquidação financeira própria.\n\nOs pagamentos são processados por provedor externo (PSP), que realiza a liquidação automática e divisão de valores (split).\n\n2. Split Automático\n\nOs valores pagos pelo consumidor poderão ser automaticamente divididos no momento da liquidação pelo provedor de pagamento, destinando:\n\n• Parcela ao lojista\n• Parcela à plataforma a título de comissão por intermediação tecnológica\n\nA Plataforma não realiza retenção manual de valores.\n\n3. Receita da Plataforma\n\nA remuneração da Plataforma consiste exclusivamente na comissão contratada, não sendo responsável por tributos incidentes sobre a receita do lojista.\n\n4. Responsabilidade Fiscal\n\nO Lojista é o único responsável por obrigações fiscais, tributárias e contábeis relativas às vendas realizadas.\n\n5. Chargebacks e Contestações\n\nEm caso de estorno ou cancelamento, os valores serão tratados conforme regras do PSP.\n\n6. Não Intermediação Financeira\n\nA Plataforma não se caracteriza como instituição financeira, intermediador bancário ou custodiante de recursos.\n\n7. Aceite Digital\n\nO aceite eletrônico possui validade jurídica nos termos do Código Civil e Marco Civil da Internet.'),

('privacy_policy', '1.0', 'Política de Privacidade', E'POLÍTICA DE PRIVACIDADE\n\n1. Coleta de Dados\n\nA Plataforma coleta dados necessários para a prestação dos serviços contratados, incluindo informações cadastrais, transacionais e de uso.\n\n2. Finalidade\n\nOs dados são utilizados exclusivamente para operação da plataforma, processamento de pagamentos e melhoria dos serviços.\n\n3. Compartilhamento\n\nDados poderão ser compartilhados com provedores de pagamento (PSPs) para processamento de transações.\n\n4. Direitos do Titular\n\nO titular pode solicitar acesso, correção ou exclusão de seus dados conforme a LGPD.\n\n5. Segurança\n\nA Plataforma emprega medidas técnicas e organizacionais para proteção dos dados pessoais.'),

('split_agreement', '1.0', 'Contrato de Split Automático', E'CONTRATO DE SPLIT AUTOMÁTICO DE PAGAMENTOS\n\n1. Definição\n\nO Split Automático é o mecanismo pelo qual os valores recebidos via PIX são automaticamente divididos entre o lojista e a plataforma no momento da liquidação.\n\n2. Comissão\n\nA comissão da plataforma será calculada conforme percentual ou valor fixo definido no plano contratado.\n\n3. Liquidação\n\nA liquidação é realizada diretamente pelo PSP (Provedor de Serviços de Pagamento), sem intermediação financeira da plataforma.\n\n4. Transparência\n\nO lojista terá acesso a relatório detalhado de todas as transações, comissões e valores líquidos recebidos.\n\n5. Alteração de Taxas\n\nAlterações nas taxas de comissão serão comunicadas com antecedência mínima de 30 dias e requerem novo aceite.');
