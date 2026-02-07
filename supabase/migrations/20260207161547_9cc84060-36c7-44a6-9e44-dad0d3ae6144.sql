-- Add domain type to partner_domains (app vs marketing)
ALTER TABLE public.partner_domains 
ADD COLUMN IF NOT EXISTS domain_type TEXT NOT NULL DEFAULT 'app' CHECK (domain_type IN ('app', 'marketing'));

-- Add powered_by settings to partner_branding
ALTER TABLE public.partner_branding
ADD COLUMN IF NOT EXISTS powered_by_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS powered_by_text TEXT DEFAULT 'Powered by FoodHub09',
ADD COLUMN IF NOT EXISTS footer_text TEXT,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Create partner_marketing_pages for landing page content
CREATE TABLE IF NOT EXISTS public.partner_marketing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  hero_badge TEXT,
  hero_title TEXT NOT NULL DEFAULT 'Transforme seu negócio',
  hero_subtitle TEXT,
  hero_cta_text TEXT DEFAULT 'Começar Agora',
  hero_cta_url TEXT,
  hero_image_url TEXT,
  benefits_title TEXT DEFAULT 'Por que escolher nossa plataforma?',
  benefits JSON DEFAULT '[]'::json,
  features_title TEXT DEFAULT 'Funcionalidades',
  features JSON DEFAULT '[]'::json,
  faq_title TEXT DEFAULT 'Perguntas Frequentes',
  faq_items JSON DEFAULT '[]'::json,
  cta_title TEXT DEFAULT 'Pronto para começar?',
  cta_subtitle TEXT,
  cta_button_text TEXT DEFAULT 'Criar minha conta grátis',
  social_proof_text TEXT,
  testimonials JSON DEFAULT '[]'::json,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  schema_org JSON,
  show_modules_section BOOLEAN DEFAULT true,
  show_pricing_section BOOLEAN DEFAULT true,
  show_faq_section BOOLEAN DEFAULT true,
  show_testimonials_section BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id)
);

-- Enable RLS
ALTER TABLE public.partner_marketing_pages ENABLE ROW LEVEL SECURITY;

-- RLS: Public read
CREATE POLICY "Public can read marketing pages" 
ON public.partner_marketing_pages FOR SELECT USING (true);

-- RLS: Partner admins can manage
CREATE POLICY "Partner admins can manage their marketing pages" 
ON public.partner_marketing_pages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.partner_users pu 
    WHERE pu.partner_id = partner_marketing_pages.partner_id 
    AND pu.user_id = auth.uid() 
    AND pu.role = 'partner_admin'
    AND pu.is_active = true
  )
);

-- RLS: Super admins can manage all
CREATE POLICY "Super admins can manage all marketing pages" 
ON public.partner_marketing_pages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'super_admin'
  )
);

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_partner_by_domain(text);

-- Recreate with new signature
CREATE FUNCTION public.get_partner_by_domain(p_domain TEXT)
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  partner_slug TEXT,
  domain_type TEXT,
  branding JSON,
  marketing_page JSON
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS partner_id,
    p.name AS partner_name,
    p.slug AS partner_slug,
    pd.domain_type,
    row_to_json(pb.*) AS branding,
    row_to_json(pmp.*) AS marketing_page
  FROM partner_domains pd
  JOIN partners p ON p.id = pd.partner_id
  LEFT JOIN partner_branding pb ON pb.partner_id = p.id
  LEFT JOIN partner_marketing_pages pmp ON pmp.partner_id = p.id
  WHERE pd.domain = p_domain
    AND pd.is_verified = true
    AND p.is_active = true;
END;
$$;

-- RPC for public partner plans
CREATE OR REPLACE FUNCTION public.get_public_partner_plans(p_partner_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  monthly_price NUMERIC,
  currency TEXT,
  max_users INTEGER,
  max_products INTEGER,
  max_orders_per_month INTEGER,
  included_modules TEXT[],
  included_features TEXT[],
  display_order INTEGER,
  trial_days INTEGER,
  is_free BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id, pp.name, pp.slug, pp.description, pp.monthly_price, pp.currency,
    pp.max_users, pp.max_products, pp.max_orders_per_month,
    pp.included_modules, pp.included_features, pp.display_order, pp.trial_days, pp.is_free
  FROM partner_plans pp
  WHERE pp.partner_id = p_partner_id AND pp.is_active = true
  ORDER BY pp.display_order ASC;
END;
$$;

-- Index for domain lookups
CREATE INDEX IF NOT EXISTS idx_partner_domains_domain_verified 
ON public.partner_domains(domain) WHERE is_verified = true;

-- Trigger for updated_at
CREATE TRIGGER update_partner_marketing_pages_updated_at
BEFORE UPDATE ON public.partner_marketing_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();