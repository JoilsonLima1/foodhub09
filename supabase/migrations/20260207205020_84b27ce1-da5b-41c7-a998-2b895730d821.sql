-- =====================================================
-- Partner Onboarding System (100% ADITIVO)
-- Fase A: Status tracking + Fase D: Guides
-- =====================================================

-- Partner Onboarding Status Table
CREATE TABLE IF NOT EXISTS public.partner_onboarding_status (
  partner_id UUID PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  step_branding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  step_payments_completed BOOLEAN NOT NULL DEFAULT FALSE,
  step_notifications_completed BOOLEAN NOT NULL DEFAULT FALSE,
  step_plans_completed BOOLEAN NOT NULL DEFAULT FALSE,
  step_domains_completed BOOLEAN NOT NULL DEFAULT FALSE,
  step_compliance_completed BOOLEAN NOT NULL DEFAULT FALSE,
  step_ready_to_sell BOOLEAN GENERATED ALWAYS AS (
    step_branding_completed AND 
    step_payments_completed AND 
    step_plans_completed AND 
    step_compliance_completed
  ) STORED,
  dry_run_passed BOOLEAN DEFAULT FALSE,
  dry_run_passed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_partner_onboarding_ready ON public.partner_onboarding_status(step_ready_to_sell) WHERE step_ready_to_sell = TRUE;

-- Partner Guides Table (Self-service documentation)
CREATE TABLE IF NOT EXISTS public.partner_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  display_order INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed mandatory guides
INSERT INTO public.partner_guides (key, title, content_md, category, display_order, is_active) VALUES
('how_to_sell', 'Como vender o sistema', E'## Como vender o sistema\n\n### 1. Conheça seus diferenciais\n- Sua marca, seus preços\n- Suporte personalizado\n- Sem intermediários\n\n### 2. Abordagem recomendada\n1. Identifique a dor do cliente\n2. Apresente a solução\n3. Ofereça trial grátis\n4. Acompanhe de perto\n\n### 3. Materiais de apoio\n- Use sua landing page personalizada\n- Compartilhe cases de sucesso\n- Destaque o suporte local', 'sales', 1, TRUE),
('how_to_register_clients', 'Como cadastrar clientes', E'## Como cadastrar clientes\n\n### Passo a passo\n1. Acesse **Organizações > Nova Organização**\n2. Preencha os dados básicos\n3. Selecione o plano inicial\n4. Defina período de trial (se aplicável)\n5. Confirme criação\n\n### Dicas\n- Sempre valide email e telefone\n- Configure notificações desde o início\n- Acompanhe primeiros acessos', 'operations', 2, TRUE),
('how_billing_works', 'Como funciona a cobrança', E'## Como funciona a cobrança\n\n### Ciclo de faturamento\n1. Faturas são geradas automaticamente\n2. Cliente recebe notificação\n3. Pagamento via PIX, Boleto ou Cartão\n4. Status atualizado em tempo real\n\n### Sua comissão\n- Calculada sobre cada pagamento\n- Disponível após período de segurança\n- Transferida conforme agenda configurada', 'billing', 3, TRUE),
('handle_delinquency', 'O que fazer se o cliente não pagar', E'## Gestão de inadimplência\n\n### Fluxo automático\n1. **Vencido (1-7 dias)**: Avisos automáticos\n2. **Suspenso (8-30 dias)**: Acesso parcial\n3. **Bloqueado (31+ dias)**: Acesso negado\n\n### Ações manuais\n- Renegociar dívida\n- Oferecer desconto pontual\n- Cancelar com cuidado\n\n### Dica\nContato humano resolve mais que automação!', 'billing', 4, TRUE),
('how_to_receive_payouts', 'Como receber seus repasses', E'## Repasses e saques\n\n### Pré-requisitos\n1. Conta Asaas ativa e verificada\n2. Período de segurança cumprido (14 dias)\n3. Saldo disponível mínimo atingido\n\n### Como funciona\n- Repasses processados conforme agenda\n- Transferência automática via PIX\n- Comprovante enviado por email\n\n### Acompanhamento\nAcesse **Liquidação** para ver histórico completo', 'payouts', 5, TRUE)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.partner_onboarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_guides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_onboarding_status
CREATE POLICY "Partners can view own onboarding status"
  ON public.partner_onboarding_status
  FOR SELECT
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Partner admins can update own onboarding status"
  ON public.partner_onboarding_status
  FOR UPDATE
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Super admins can manage all onboarding status"
  ON public.partner_onboarding_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS Policies for partner_guides (public read for active guides)
CREATE POLICY "Anyone can read active guides"
  ON public.partner_guides
  FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Super admins can manage guides"
  ON public.partner_guides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Auto-create onboarding status when partner is created
CREATE OR REPLACE FUNCTION public.auto_create_partner_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.partner_onboarding_status (partner_id)
  VALUES (NEW.id)
  ON CONFLICT (partner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_partner_onboarding ON public.partners;
CREATE TRIGGER trg_auto_create_partner_onboarding
  AFTER INSERT ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_partner_onboarding();

-- Update timestamp trigger
CREATE TRIGGER update_partner_onboarding_status_updated_at
  BEFORE UPDATE ON public.partner_onboarding_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_guides_updated_at
  BEFORE UPDATE ON public.partner_guides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RPC: get_partner_onboarding_progress
-- Returns detailed onboarding status with computed fields
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_partner_onboarding_progress(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status RECORD;
  v_branding RECORD;
  v_domains RECORD;
  v_plans_count INT;
  v_payment_config RECORD;
  v_result JSONB;
BEGIN
  -- Get onboarding status
  SELECT * INTO v_status
  FROM public.partner_onboarding_status
  WHERE partner_id = p_partner_id;
  
  -- Auto-create if missing
  IF v_status IS NULL THEN
    INSERT INTO public.partner_onboarding_status (partner_id)
    VALUES (p_partner_id)
    ON CONFLICT DO NOTHING
    RETURNING * INTO v_status;
    
    SELECT * INTO v_status
    FROM public.partner_onboarding_status
    WHERE partner_id = p_partner_id;
  END IF;
  
  -- Check branding completeness
  SELECT 
    logo_url IS NOT NULL AND platform_name IS NOT NULL AS is_complete,
    logo_url,
    platform_name,
    primary_color
  INTO v_branding
  FROM public.partner_branding
  WHERE partner_id = p_partner_id;
  
  -- Check domains
  SELECT 
    marketing_domain,
    app_domain,
    marketing_domain_verified,
    app_domain_verified
  INTO v_domains
  FROM public.partner_domains
  WHERE partner_id = p_partner_id;
  
  -- Check plans count
  SELECT COUNT(*) INTO v_plans_count
  FROM public.partner_plans
  WHERE partner_id = p_partner_id AND is_active = TRUE;
  
  -- Check payment configuration
  SELECT 
    asaas_account_id IS NOT NULL AS has_asaas,
    asaas_account_status,
    split_enabled
  INTO v_payment_config
  FROM public.partner_asaas_accounts
  WHERE partner_id = p_partner_id;

  -- Build result
  v_result := jsonb_build_object(
    'partner_id', p_partner_id,
    'steps', jsonb_build_object(
      'branding', jsonb_build_object(
        'completed', COALESCE(v_status.step_branding_completed, FALSE),
        'has_logo', v_branding.logo_url IS NOT NULL,
        'has_name', v_branding.platform_name IS NOT NULL,
        'has_colors', v_branding.primary_color IS NOT NULL
      ),
      'payments', jsonb_build_object(
        'completed', COALESCE(v_status.step_payments_completed, FALSE),
        'has_asaas', COALESCE(v_payment_config.has_asaas, FALSE),
        'asaas_status', v_payment_config.asaas_account_status,
        'split_enabled', COALESCE(v_payment_config.split_enabled, FALSE)
      ),
      'notifications', jsonb_build_object(
        'completed', COALESCE(v_status.step_notifications_completed, FALSE),
        'using_defaults', NOT COALESCE(v_status.step_notifications_completed, FALSE)
      ),
      'plans', jsonb_build_object(
        'completed', COALESCE(v_status.step_plans_completed, FALSE),
        'active_plans_count', COALESCE(v_plans_count, 0)
      ),
      'domains', jsonb_build_object(
        'completed', COALESCE(v_status.step_domains_completed, FALSE),
        'marketing_domain', v_domains.marketing_domain,
        'app_domain', v_domains.app_domain,
        'marketing_verified', COALESCE(v_domains.marketing_domain_verified, FALSE),
        'app_verified', COALESCE(v_domains.app_domain_verified, FALSE)
      ),
      'compliance', jsonb_build_object(
        'completed', COALESCE(v_status.step_compliance_completed, FALSE)
      )
    ),
    'ready_to_sell', COALESCE(v_status.step_ready_to_sell, FALSE),
    'dry_run_passed', COALESCE(v_status.dry_run_passed, FALSE),
    'completed_at', v_status.completed_at,
    'completion_percentage', (
      (CASE WHEN COALESCE(v_status.step_branding_completed, FALSE) THEN 1 ELSE 0 END +
       CASE WHEN COALESCE(v_status.step_payments_completed, FALSE) THEN 1 ELSE 0 END +
       CASE WHEN COALESCE(v_status.step_notifications_completed, FALSE) THEN 1 ELSE 0 END +
       CASE WHEN COALESCE(v_status.step_plans_completed, FALSE) THEN 1 ELSE 0 END +
       CASE WHEN COALESCE(v_status.step_domains_completed, FALSE) THEN 1 ELSE 0 END +
       CASE WHEN COALESCE(v_status.step_compliance_completed, FALSE) THEN 1 ELSE 0 END
      ) * 100 / 6
    )
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- RPC: update_partner_onboarding_step
-- Updates a specific onboarding step
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_partner_onboarding_step(
  p_partner_id UUID,
  p_step TEXT,
  p_value BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Validate step name
  IF p_step NOT IN ('branding', 'payments', 'notifications', 'plans', 'domains', 'compliance') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid step name');
  END IF;
  
  -- Ensure record exists
  INSERT INTO public.partner_onboarding_status (partner_id)
  VALUES (p_partner_id)
  ON CONFLICT (partner_id) DO NOTHING;
  
  -- Update the specific step
  EXECUTE format(
    'UPDATE public.partner_onboarding_status SET step_%s_completed = $1, updated_at = now() WHERE partner_id = $2',
    p_step
  ) USING p_value, p_partner_id;
  
  -- Check if now ready to sell and update completed_at
  UPDATE public.partner_onboarding_status
  SET completed_at = CASE 
    WHEN step_ready_to_sell AND dry_run_passed AND completed_at IS NULL THEN now()
    ELSE completed_at
  END
  WHERE partner_id = p_partner_id;
  
  RETURN get_partner_onboarding_progress(p_partner_id);
END;
$$;

-- =====================================================
-- RPC: assert_partner_ready_for
-- Validates if partner can perform specific actions
-- =====================================================
CREATE OR REPLACE FUNCTION public.assert_partner_ready_for(
  p_partner_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status RECORD;
  v_allowed BOOLEAN := FALSE;
  v_reason TEXT := '';
  v_requirements TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_status
  FROM public.partner_onboarding_status
  WHERE partner_id = p_partner_id;
  
  IF v_status IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'Onboarding não iniciado',
      'missing_steps', ARRAY['all']
    );
  END IF;
  
  CASE p_action
    WHEN 'create_tenant' THEN
      v_allowed := v_status.step_payments_completed;
      IF NOT v_allowed THEN
        v_requirements := array_append(v_requirements, 'payments');
        v_reason := 'Configure pagamentos antes de criar organizações';
      END IF;
      
    WHEN 'create_paid_tenant' THEN
      v_allowed := v_status.step_payments_completed AND v_status.step_plans_completed;
      IF NOT v_status.step_payments_completed THEN
        v_requirements := array_append(v_requirements, 'payments');
      END IF;
      IF NOT v_status.step_plans_completed THEN
        v_requirements := array_append(v_requirements, 'plans');
      END IF;
      IF NOT v_allowed THEN
        v_reason := 'Configure pagamentos e planos antes de vender';
      END IF;
      
    WHEN 'activate_plan' THEN
      v_allowed := v_status.step_payments_completed;
      IF NOT v_allowed THEN
        v_requirements := array_append(v_requirements, 'payments');
        v_reason := 'Configure pagamentos antes de ativar planos';
      END IF;
      
    WHEN 'enable_sales' THEN
      v_allowed := v_status.step_ready_to_sell;
      IF NOT v_allowed THEN
        IF NOT v_status.step_branding_completed THEN
          v_requirements := array_append(v_requirements, 'branding');
        END IF;
        IF NOT v_status.step_payments_completed THEN
          v_requirements := array_append(v_requirements, 'payments');
        END IF;
        IF NOT v_status.step_plans_completed THEN
          v_requirements := array_append(v_requirements, 'plans');
        END IF;
        IF NOT v_status.step_compliance_completed THEN
          v_requirements := array_append(v_requirements, 'compliance');
        END IF;
        v_reason := 'Complete todos os passos obrigatórios para habilitar vendas';
      END IF;
      
    WHEN 'publish_site' THEN
      v_allowed := v_status.step_branding_completed AND v_status.step_domains_completed;
      IF NOT v_status.step_branding_completed THEN
        v_requirements := array_append(v_requirements, 'branding');
      END IF;
      IF NOT v_status.step_domains_completed THEN
        v_requirements := array_append(v_requirements, 'domains');
      END IF;
      IF NOT v_allowed THEN
        v_reason := 'Configure branding e domínios para publicar';
      END IF;
      
    ELSE
      v_reason := 'Ação desconhecida';
  END CASE;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', CASE WHEN v_allowed THEN 'OK' ELSE v_reason END,
    'missing_steps', v_requirements
  );
END;
$$;

-- =====================================================
-- RPC: run_partner_onboarding_dry_run
-- Simulates full operation without real charges
-- =====================================================
CREATE OR REPLACE FUNCTION public.run_partner_onboarding_dry_run(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_results JSONB := '[]'::JSONB;
  v_all_passed BOOLEAN := TRUE;
  v_test JSONB;
  v_plans_count INT;
  v_branding RECORD;
  v_payment_config RECORD;
  v_templates_count INT;
BEGIN
  -- Test 1: Branding Configuration
  SELECT logo_url IS NOT NULL AND platform_name IS NOT NULL AS ok, 
         logo_url, platform_name, primary_color
  INTO v_branding
  FROM public.partner_branding
  WHERE partner_id = p_partner_id;
  
  v_test := jsonb_build_object(
    'test', 'branding_config',
    'name', 'Configuração de Marca',
    'passed', COALESCE(v_branding.ok, FALSE),
    'details', CASE 
      WHEN v_branding.ok THEN 'Logo e nome configurados'
      ELSE 'Faltam logo ou nome da plataforma'
    END
  );
  v_test_results := v_test_results || v_test;
  v_all_passed := v_all_passed AND COALESCE(v_branding.ok, FALSE);
  
  -- Test 2: Payment Configuration
  SELECT 
    asaas_account_id IS NOT NULL AS has_account,
    asaas_account_status,
    split_enabled
  INTO v_payment_config
  FROM public.partner_asaas_accounts
  WHERE partner_id = p_partner_id;
  
  v_test := jsonb_build_object(
    'test', 'payment_config',
    'name', 'Configuração de Pagamentos',
    'passed', COALESCE(v_payment_config.has_account, FALSE),
    'details', CASE 
      WHEN v_payment_config.has_account THEN 
        format('Conta Asaas: %s | Split: %s', 
          COALESCE(v_payment_config.asaas_account_status, 'pendente'),
          CASE WHEN v_payment_config.split_enabled THEN 'ativo' ELSE 'inativo' END
        )
      ELSE 'Conta de pagamentos não configurada'
    END
  );
  v_test_results := v_test_results || v_test;
  v_all_passed := v_all_passed AND COALESCE(v_payment_config.has_account, FALSE);
  
  -- Test 3: Plans Available
  SELECT COUNT(*) INTO v_plans_count
  FROM public.partner_plans
  WHERE partner_id = p_partner_id AND is_active = TRUE;
  
  v_test := jsonb_build_object(
    'test', 'plans_available',
    'name', 'Planos Disponíveis',
    'passed', v_plans_count > 0,
    'details', format('%s plano(s) ativo(s)', v_plans_count)
  );
  v_test_results := v_test_results || v_test;
  v_all_passed := v_all_passed AND (v_plans_count > 0);
  
  -- Test 4: Notification Templates
  SELECT COUNT(*) INTO v_templates_count
  FROM public.notification_templates
  WHERE partner_id = p_partner_id AND is_active = TRUE;
  
  v_test := jsonb_build_object(
    'test', 'notification_templates',
    'name', 'Templates de Notificação',
    'passed', TRUE,
    'details', CASE 
      WHEN v_templates_count > 0 THEN format('%s template(s) customizado(s)', v_templates_count)
      ELSE 'Usando templates padrão da plataforma'
    END
  );
  v_test_results := v_test_results || v_test;
  
  -- Test 5: Simulated Invoice Creation
  v_test := jsonb_build_object(
    'test', 'invoice_simulation',
    'name', 'Simulação de Fatura',
    'passed', COALESCE(v_payment_config.has_account, FALSE) AND v_plans_count > 0,
    'details', CASE 
      WHEN COALESCE(v_payment_config.has_account, FALSE) AND v_plans_count > 0 THEN 
        'Pronto para gerar faturas'
      ELSE 'Não é possível simular - configure pagamentos e planos'
    END
  );
  v_test_results := v_test_results || v_test;
  
  -- Test 6: Earnings Calculation
  v_test := jsonb_build_object(
    'test', 'earnings_calculation',
    'name', 'Cálculo de Comissões',
    'passed', COALESCE(v_payment_config.has_account, FALSE),
    'details', CASE 
      WHEN COALESCE(v_payment_config.has_account, FALSE) THEN 
        'Sistema de comissões operacional'
      ELSE 'Configure pagamentos para ativar comissões'
    END
  );
  v_test_results := v_test_results || v_test;
  
  -- Update dry_run status
  IF v_all_passed THEN
    UPDATE public.partner_onboarding_status
    SET 
      dry_run_passed = TRUE,
      dry_run_passed_at = now(),
      completed_at = CASE WHEN step_ready_to_sell THEN now() ELSE completed_at END
    WHERE partner_id = p_partner_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'all_passed', v_all_passed,
    'tests', v_test_results,
    'summary', jsonb_build_object(
      'total_tests', jsonb_array_length(v_test_results),
      'passed', (SELECT COUNT(*) FROM jsonb_array_elements(v_test_results) t WHERE (t->>'passed')::boolean),
      'failed', (SELECT COUNT(*) FROM jsonb_array_elements(v_test_results) t WHERE NOT (t->>'passed')::boolean)
    ),
    'certified', v_all_passed,
    'timestamp', now()
  );
END;
$$;

-- =====================================================
-- RPC: get_partner_guides
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_partner_guides(p_category TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'key', key,
        'title', title,
        'content_md', content_md,
        'category', category
      ) ORDER BY display_order
    ), '[]'::JSONB)
    FROM public.partner_guides
    WHERE is_active = TRUE
      AND (p_category IS NULL OR category = p_category)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_partner_onboarding_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_partner_onboarding_step(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_partner_ready_for(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_partner_onboarding_dry_run(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_guides(TEXT) TO authenticated, anon;

-- Create onboarding status for existing partners
INSERT INTO public.partner_onboarding_status (partner_id)
SELECT id FROM public.partners
WHERE id NOT IN (SELECT partner_id FROM public.partner_onboarding_status)
ON CONFLICT DO NOTHING;