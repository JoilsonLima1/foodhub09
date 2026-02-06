-- =====================================================
-- 1. Add marketing_ceo module to addon_modules catalog
-- =====================================================
INSERT INTO public.addon_modules (
  slug,
  name,
  description,
  category,
  icon,
  monthly_price,
  setup_fee,
  features,
  is_active,
  display_order,
  implementation_status
) VALUES (
  'marketing_ceo',
  'CEO de Marketing',
  'Módulo completo de SEO e marketing digital: meta tags, sitemap, robots.txt, integração com Google/Bing Search Console, auditorias automatizadas e relatórios de performance.',
  'marketing',
  'TrendingUp',
  49.90,
  0,
  '["Gestão de Meta Tags", "Geração de Sitemap.xml", "Configuração de Robots.txt", "Integração Google Search Console", "Integração Bing Webmaster", "Auditorias SEO Automatizadas", "Relatórios de Performance", "Otimização de Páginas"]'::jsonb,
  true,
  15,
  'ready'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- =====================================================
-- 2. Create marketing_seo_audit_history for score tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketing_seo_audit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  settings_id UUID REFERENCES public.marketing_seo_settings(id) ON DELETE SET NULL,
  previous_score INTEGER NOT NULL DEFAULT 0,
  current_score INTEGER NOT NULL DEFAULT 0,
  score_delta INTEGER GENERATED ALWAYS AS (current_score - previous_score) STORED,
  audit_type TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_seo_audit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies using has_role function (consistent with existing patterns)
CREATE POLICY "Super admins have full access to audit history"
  ON public.marketing_seo_audit_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant users can view their audit history"
  ON public.marketing_seo_audit_history
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can insert audit history"
  ON public.marketing_seo_audit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_marketing_seo_audit_history_tenant 
  ON public.marketing_seo_audit_history(tenant_id, created_at DESC);

-- =====================================================
-- 3. Add marketing_ceo to Enterprise plan by default
-- =====================================================
INSERT INTO public.plan_addon_modules (plan_id, addon_module_id)
SELECT sp.id, am.id
FROM public.subscription_plans sp
CROSS JOIN public.addon_modules am
WHERE sp.name = 'Enterprise' 
  AND am.slug = 'marketing_ceo'
ON CONFLICT DO NOTHING;