-- =============================================
-- Platform SEO Settings (global settings for FoodHub09 SaaS)
-- =============================================
CREATE TABLE IF NOT EXISTS public.platform_seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Global Meta Tags
  site_name TEXT NOT NULL DEFAULT 'FoodHub09',
  default_title TEXT NOT NULL DEFAULT 'FoodHub09 - Sistema de Gestão para Restaurantes',
  default_description TEXT DEFAULT 'Sistema completo para gestão de restaurantes, pizzarias, lanchonetes e bares. PDV, controle de estoque, delivery, relatórios e muito mais.',
  default_keywords TEXT[] DEFAULT ARRAY['sistema restaurante', 'gestão restaurante', 'PDV restaurante', 'delivery', 'controle estoque'],
  
  -- Canonical Domain
  canonical_domain TEXT NOT NULL DEFAULT 'https://foodhub09.com.br',
  
  -- Open Graph Defaults
  og_image_url TEXT,
  og_type TEXT DEFAULT 'website',
  og_locale TEXT DEFAULT 'pt_BR',
  
  -- Twitter/X Defaults
  twitter_card TEXT DEFAULT 'summary_large_image',
  twitter_site TEXT,
  twitter_creator TEXT,
  
  -- Branding
  logo_url TEXT,
  theme_color TEXT DEFAULT '#f97316',
  
  -- Schema.org Organization
  organization_name TEXT DEFAULT 'FoodHub09',
  organization_email TEXT,
  organization_phone TEXT,
  organization_address JSONB,
  social_links TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Schema.org SoftwareApplication
  app_category TEXT DEFAULT 'BusinessApplication',
  app_operating_system TEXT DEFAULT 'Web',
  app_price TEXT DEFAULT '0',
  app_price_currency TEXT DEFAULT 'BRL',
  app_rating_value NUMERIC(2,1) DEFAULT 4.8,
  app_rating_count INTEGER DEFAULT 150,
  app_features TEXT[] DEFAULT ARRAY['PDV Completo', 'Controle de Estoque', 'Gestão de Entregas', 'Monitor de Cozinha', 'Relatórios Avançados', 'Multi-Lojas'],
  
  -- Robots & Indexing
  default_robots TEXT DEFAULT 'index, follow',
  google_site_verification TEXT,
  bing_site_verification TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure singleton (only one row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_seo_settings_singleton ON public.platform_seo_settings ((true));

-- =============================================
-- Platform SEO Pages (per-page SEO for public routes)
-- =============================================
CREATE TABLE IF NOT EXISTS public.platform_seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Route identification
  path TEXT NOT NULL UNIQUE,
  slug TEXT,
  
  -- Page Meta Tags
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  
  -- Open Graph overrides
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  og_type TEXT,
  
  -- Indexing control
  is_indexable BOOLEAN NOT NULL DEFAULT true,
  robots TEXT,
  
  -- Sitemap settings
  sitemap_priority NUMERIC(2,1) DEFAULT 0.8,
  sitemap_changefreq TEXT DEFAULT 'weekly',
  include_in_sitemap BOOLEAN NOT NULL DEFAULT true,
  
  -- Schema.org page-specific
  page_schema_type TEXT,
  page_schema_data JSONB,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_seo_pages_path ON public.platform_seo_pages(path);
CREATE INDEX IF NOT EXISTS idx_platform_seo_pages_active ON public.platform_seo_pages(is_active, include_in_sitemap);

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE public.platform_seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_seo_pages ENABLE ROW LEVEL SECURITY;

-- Super Admin full access using user_roles table
CREATE POLICY "Super admins manage platform SEO settings"
  ON public.platform_seo_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Public read for platform_seo_settings
CREATE POLICY "Anyone can read platform SEO settings"
  ON public.platform_seo_settings
  FOR SELECT
  USING (true);

-- Super Admin full access to platform_seo_pages
CREATE POLICY "Super admins manage platform SEO pages"
  ON public.platform_seo_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Public read for active platform_seo_pages
CREATE POLICY "Anyone can read active platform SEO pages"
  ON public.platform_seo_pages
  FOR SELECT
  USING (is_active = true);

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE TRIGGER update_platform_seo_settings_updated_at
  BEFORE UPDATE ON public.platform_seo_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_seo_pages_updated_at
  BEFORE UPDATE ON public.platform_seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Seed initial data
-- =============================================

-- Insert default global settings
INSERT INTO public.platform_seo_settings (
  site_name,
  default_title,
  default_description,
  canonical_domain,
  organization_name,
  logo_url,
  theme_color
) VALUES (
  'FoodHub09',
  'FoodHub09 - Sistema de Gestão para Restaurantes e Lanchonetes',
  'Sistema completo para gestão de restaurantes, pizzarias, lanchonetes e bares. PDV, controle de estoque, delivery, relatórios e muito mais. Crie sua loja grátis!',
  'https://foodhub09.com.br',
  'FoodHub09',
  'https://foodhub09.com.br/logo.png',
  '#f97316'
) ON CONFLICT DO NOTHING;

-- Insert default pages
INSERT INTO public.platform_seo_pages (path, slug, title, description, sitemap_priority, sitemap_changefreq, display_order) VALUES
  ('/', 'home', 'FoodHub09 - Sistema de Gestão para Restaurantes e Lanchonetes', 'Sistema completo para gestão de restaurantes, pizzarias, lanchonetes e bares. PDV, controle de estoque, delivery, relatórios e muito mais.', 1.0, 'weekly', 1),
  ('/planos', 'plans', 'Planos e Preços | FoodHub09', 'Conheça os planos do FoodHub09. Comece grátis e escale conforme seu negócio cresce. PDV, delivery, estoque e muito mais.', 0.9, 'weekly', 2),
  ('/recursos', 'features', 'Recursos e Funcionalidades | FoodHub09', 'Descubra todas as funcionalidades do FoodHub09: PDV completo, controle de estoque, gestão de entregas, monitor de cozinha e relatórios avançados.', 0.9, 'weekly', 3),
  ('/clientes', 'customers', 'Nossos Clientes | FoodHub09', 'Conheça os restaurantes, pizzarias e lanchonetes que confiam no FoodHub09 para gerenciar suas operações.', 0.8, 'daily', 4),
  ('/auth', 'login', 'Login | FoodHub09', 'Acesse sua conta FoodHub09 ou crie uma nova conta gratuita.', 0.5, 'monthly', 10)
ON CONFLICT (path) DO NOTHING;