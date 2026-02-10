
-- =============================================
-- PILAR 1: TEMPLATES PADRÃO DO SUPER ADMIN
-- =============================================

CREATE TABLE IF NOT EXISTS public.platform_plan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  max_users INT DEFAULT 5,
  max_products INT DEFAULT 100,
  max_orders_per_month INT DEFAULT 500,
  included_modules TEXT[] DEFAULT '{}',
  included_features TEXT[] DEFAULT '{}',
  is_free BOOLEAN DEFAULT false,
  trial_days INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage plan templates"
  ON public.platform_plan_templates FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated read active plan templates"
  ON public.platform_plan_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.platform_partner_page_template (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Padrão',
  hero_badge TEXT DEFAULT 'Comece Agora',
  hero_title TEXT DEFAULT 'Lance seu negócio digital',
  hero_subtitle TEXT DEFAULT 'Tudo que você precisa para vender online',
  hero_cta_text TEXT DEFAULT 'Começar Grátis',
  hero_image_url TEXT,
  benefits_title TEXT DEFAULT 'Benefícios',
  benefits JSONB DEFAULT '[]'::jsonb,
  features_title TEXT DEFAULT 'Funcionalidades',
  features JSONB DEFAULT '[]'::jsonb,
  faq_title TEXT DEFAULT 'Perguntas Frequentes',
  faq_items JSONB DEFAULT '[]'::jsonb,
  testimonials JSONB DEFAULT '[]'::jsonb,
  cta_title TEXT DEFAULT 'Pronto para começar?',
  cta_subtitle TEXT,
  cta_button_text TEXT DEFAULT 'Criar Conta',
  social_proof_text TEXT,
  show_modules_section BOOLEAN DEFAULT true,
  show_pricing_section BOOLEAN DEFAULT true,
  show_faq_section BOOLEAN DEFAULT true,
  show_testimonials_section BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_partner_page_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage page templates"
  ON public.platform_partner_page_template FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated read active page templates"
  ON public.platform_partner_page_template FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =============================================
-- PILAR 2: BILLING OWNER CONFIG POR PARCEIRO
-- =============================================

ALTER TABLE public.partner_policies
  ADD COLUMN IF NOT EXISTS billing_owner TEXT NOT NULL DEFAULT 'PLATFORM',
  ADD COLUMN IF NOT EXISTS allow_partner_gateway BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_fixed NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_mode TEXT NOT NULL DEFAULT 'percent';

ALTER TABLE public.partner_payment_accounts
  ADD COLUMN IF NOT EXISTS gateway_type TEXT DEFAULT 'asaas',
  ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- =============================================
-- PILAR 3: COBRANÇA DO PARCEIRO (AR)
-- =============================================

CREATE TABLE IF NOT EXISTS public.partner_billing_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE UNIQUE,
  collection_mode TEXT NOT NULL DEFAULT 'INVOICE',
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  grace_days INT NOT NULL DEFAULT 5,
  dunning_policy JSONB NOT NULL DEFAULT '{
    "L1": {"days_overdue": 3, "action": "warning", "description": "Aviso por email/notificação"},
    "L2": {"days_overdue": 7, "action": "block_new_tenants", "description": "Bloqueia criação de novos lojistas"},
    "L3": {"days_overdue": 15, "action": "block_plans", "description": "Bloqueia publicar/editar planos"},
    "L4": {"days_overdue": 30, "action": "suspend_financial", "description": "Suspende funcionalidades financeiras"}
  }'::jsonb,
  current_dunning_level INT DEFAULT 0,
  dunning_started_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_billing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage partner billing config"
  ON public.partner_billing_config FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Partners view own billing config"
  ON public.partner_billing_config FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.partner_ar_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  description TEXT,
  reference_period_start DATE,
  reference_period_end DATE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  gateway_payment_id TEXT,
  gateway_invoice_url TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_ar_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage partner AR invoices"
  ON public.partner_ar_invoices FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Partners view own AR invoices"
  ON public.partner_ar_invoices FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.partner_dunning_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.partner_ar_invoices(id),
  dunning_level INT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversed_at TIMESTAMPTZ,
  reversed_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_dunning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage dunning log"
  ON public.partner_dunning_log FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Partners view own dunning log"
  ON public.partner_dunning_log FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid())
  );

-- =============================================
-- FUNÇÕES
-- =============================================

CREATE OR REPLACE FUNCTION public.import_platform_templates_for_partner(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plans_imported INT := 0;
  v_page_imported BOOLEAN := false;
  v_template RECORD;
  v_page_template RECORD;
BEGIN
  FOR v_template IN 
    SELECT * FROM platform_plan_templates WHERE is_active = true ORDER BY display_order
  LOOP
    INSERT INTO partner_plans (
      partner_id, name, slug, description, monthly_price, currency,
      max_users, max_products, max_orders_per_month,
      included_modules, included_features, is_free, trial_days,
      is_featured, is_default, display_order, is_active
    ) VALUES (
      p_partner_id,
      v_template.name,
      v_template.slug || '-' || substr(p_partner_id::text, 1, 8),
      v_template.description,
      v_template.monthly_price,
      v_template.currency,
      v_template.max_users,
      v_template.max_products,
      v_template.max_orders_per_month,
      v_template.included_modules,
      v_template.included_features,
      v_template.is_free,
      v_template.trial_days,
      v_template.is_featured,
      v_template.is_default,
      v_template.display_order,
      true
    );
    v_plans_imported := v_plans_imported + 1;
  END LOOP;

  SELECT * INTO v_page_template FROM platform_partner_page_template WHERE is_active = true LIMIT 1;
  
  IF v_page_template.id IS NOT NULL THEN
    INSERT INTO partner_marketing_pages (
      partner_id, hero_badge, hero_title, hero_subtitle, hero_cta_text,
      hero_image_url, benefits_title, benefits, features_title, features,
      faq_title, faq_items, testimonials, cta_title, cta_subtitle,
      cta_button_text, social_proof_text, show_modules_section,
      show_pricing_section, show_faq_section, show_testimonials_section,
      published
    ) VALUES (
      p_partner_id,
      v_page_template.hero_badge,
      v_page_template.hero_title,
      v_page_template.hero_subtitle,
      v_page_template.hero_cta_text,
      v_page_template.hero_image_url,
      v_page_template.benefits_title,
      v_page_template.benefits,
      v_page_template.features_title,
      v_page_template.features,
      v_page_template.faq_title,
      v_page_template.faq_items,
      v_page_template.testimonials,
      v_page_template.cta_title,
      v_page_template.cta_subtitle,
      v_page_template.cta_button_text,
      v_page_template.social_proof_text,
      v_page_template.show_modules_section,
      v_page_template.show_pricing_section,
      v_page_template.show_faq_section,
      v_page_template.show_testimonials_section,
      false
    )
    ON CONFLICT (partner_id) DO UPDATE SET
      hero_badge = EXCLUDED.hero_badge,
      hero_title = EXCLUDED.hero_title,
      hero_subtitle = EXCLUDED.hero_subtitle,
      hero_cta_text = EXCLUDED.hero_cta_text,
      benefits = EXCLUDED.benefits,
      features = EXCLUDED.features,
      faq_items = EXCLUDED.faq_items,
      testimonials = EXCLUDED.testimonials,
      updated_at = now();
    v_page_imported := true;
  END IF;

  RETURN jsonb_build_object(
    'plans_imported', v_plans_imported,
    'page_imported', v_page_imported
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_partner_dunning_status(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config partner_billing_config%ROWTYPE;
  v_overdue_amount NUMERIC := 0;
  v_overdue_count INT := 0;
  v_max_days_overdue INT := 0;
  v_suggested_level INT := 0;
BEGIN
  SELECT * INTO v_config FROM partner_billing_config WHERE partner_id = p_partner_id;
  
  IF v_config.id IS NULL THEN
    RETURN jsonb_build_object('has_config', false, 'dunning_level', 0);
  END IF;

  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*),
    COALESCE(MAX(EXTRACT(DAY FROM now() - due_date)::int), 0)
  INTO v_overdue_amount, v_overdue_count, v_max_days_overdue
  FROM partner_ar_invoices
  WHERE partner_id = p_partner_id 
    AND status IN ('overdue', 'pending')
    AND due_date < CURRENT_DATE;

  IF v_max_days_overdue >= (v_config.dunning_policy->'L4'->>'days_overdue')::int THEN
    v_suggested_level := 4;
  ELSIF v_max_days_overdue >= (v_config.dunning_policy->'L3'->>'days_overdue')::int THEN
    v_suggested_level := 3;
  ELSIF v_max_days_overdue >= (v_config.dunning_policy->'L2'->>'days_overdue')::int THEN
    v_suggested_level := 2;
  ELSIF v_max_days_overdue >= (v_config.dunning_policy->'L1'->>'days_overdue')::int THEN
    v_suggested_level := 1;
  END IF;

  RETURN jsonb_build_object(
    'has_config', true,
    'current_level', v_config.current_dunning_level,
    'suggested_level', v_suggested_level,
    'overdue_amount', v_overdue_amount,
    'overdue_count', v_overdue_count,
    'max_days_overdue', v_max_days_overdue,
    'credit_limit', v_config.credit_limit,
    'collection_mode', v_config.collection_mode,
    'dunning_policy', v_config.dunning_policy
  );
END;
$$;

CREATE OR REPLACE TRIGGER update_platform_plan_templates_updated_at
  BEFORE UPDATE ON public.platform_plan_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_platform_partner_page_template_updated_at
  BEFORE UPDATE ON public.platform_partner_page_template
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_partner_billing_config_updated_at
  BEFORE UPDATE ON public.partner_billing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_partner_ar_invoices_updated_at
  BEFORE UPDATE ON public.partner_ar_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
