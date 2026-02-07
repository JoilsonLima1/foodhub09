
-- =============================================
-- WHITE-LABEL SEO INFRASTRUCTURE
-- =============================================

-- 1. Add 'published' column to partner_domains for SEO control
ALTER TABLE public.partner_domains
ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;

-- 2. Add 'include_in_sitemap' to partner_marketing_pages
ALTER TABLE public.partner_marketing_pages
ADD COLUMN IF NOT EXISTS include_in_sitemap BOOLEAN NOT NULL DEFAULT true;

-- 3. Create partner_seo_pages table for custom pages per partner
CREATE TABLE IF NOT EXISTS public.partner_seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  og_type TEXT DEFAULT 'website',
  is_indexable BOOLEAN NOT NULL DEFAULT true,
  robots TEXT DEFAULT 'index, follow',
  sitemap_priority NUMERIC(2,1) DEFAULT 0.8,
  sitemap_changefreq TEXT DEFAULT 'weekly',
  include_in_sitemap BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, path)
);

-- 4. Enable RLS on partner_seo_pages
ALTER TABLE public.partner_seo_pages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for partner_seo_pages
-- Partners can manage their own SEO pages
CREATE POLICY "Partners can manage own SEO pages"
ON public.partner_seo_pages
FOR ALL
USING (
  partner_id IN (
    SELECT partner_id FROM public.partner_users 
    WHERE user_id = auth.uid()
  )
);

-- Public can read active pages for sitemap generation (via service role)
CREATE POLICY "Service role can read all SEO pages"
ON public.partner_seo_pages
FOR SELECT
USING (true);

-- 6. Create RPC to get partner SEO data by domain
CREATE OR REPLACE FUNCTION public.get_partner_seo_by_domain(p_domain TEXT)
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  partner_slug TEXT,
  domain_type TEXT,
  is_published BOOLEAN,
  canonical_domain TEXT,
  site_name TEXT,
  default_title TEXT,
  default_description TEXT,
  og_image_url TEXT,
  favicon_url TEXT,
  logo_url TEXT,
  seo_keywords TEXT[],
  schema_org JSON
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
    pd.published AS is_published,
    pd.domain AS canonical_domain,
    COALESCE(pb.platform_name, p.name) AS site_name,
    COALESCE(pmp.seo_title, pb.meta_title, p.name || ' - Sistema de Gestão') AS default_title,
    COALESCE(pmp.seo_description, pb.meta_description) AS default_description,
    COALESCE(pb.og_image_url, pmp.hero_image_url) AS og_image_url,
    pb.favicon_url,
    pb.logo_url,
    pmp.seo_keywords,
    pmp.schema_org
  FROM partner_domains pd
  JOIN partners p ON p.id = pd.partner_id
  LEFT JOIN partner_branding pb ON pb.partner_id = p.id
  LEFT JOIN partner_marketing_pages pmp ON pmp.partner_id = p.id
  WHERE pd.domain = p_domain
    AND pd.is_verified = true
  LIMIT 1;
END;
$$;

-- 7. Create RPC to get partner sitemap pages
CREATE OR REPLACE FUNCTION public.get_partner_sitemap_pages(p_partner_id UUID)
RETURNS TABLE (
  path TEXT,
  sitemap_priority NUMERIC,
  sitemap_changefreq TEXT,
  lastmod TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return static marketing pages + dynamic SEO pages
  RETURN QUERY
  -- Home page
  SELECT 
    '/'::TEXT AS path,
    1.0::NUMERIC AS sitemap_priority,
    'weekly'::TEXT AS sitemap_changefreq,
    TO_CHAR(NOW(), 'YYYY-MM-DD')::TEXT AS lastmod
  
  UNION ALL
  
  -- Signup page
  SELECT 
    '/signup'::TEXT AS path,
    0.9::NUMERIC AS sitemap_priority,
    'weekly'::TEXT AS sitemap_changefreq,
    TO_CHAR(NOW(), 'YYYY-MM-DD')::TEXT AS lastmod
  
  UNION ALL
  
  -- Custom SEO pages from partner_seo_pages table
  SELECT 
    psp.path,
    psp.sitemap_priority,
    psp.sitemap_changefreq,
    TO_CHAR(psp.updated_at, 'YYYY-MM-DD')::TEXT AS lastmod
  FROM partner_seo_pages psp
  WHERE psp.partner_id = p_partner_id
    AND psp.is_active = true
    AND psp.include_in_sitemap = true
    AND psp.is_indexable = true
  ORDER BY sitemap_priority DESC;
END;
$$;

-- 8. Seed default SEO pages for existing partners
INSERT INTO public.partner_seo_pages (partner_id, path, title, description, sitemap_priority, display_order)
SELECT 
  p.id,
  '/',
  COALESCE(pb.platform_name, p.name) || ' - Sistema de Gestão',
  COALESCE(pb.meta_description, 'A plataforma completa para gestão do seu estabelecimento.'),
  1.0,
  0
FROM partners p
LEFT JOIN partner_branding pb ON pb.partner_id = p.id
ON CONFLICT (partner_id, path) DO NOTHING;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_partner_seo_by_domain(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_sitemap_pages(UUID) TO anon, authenticated;
