
-- =============================================
-- PUBLICATION CONTROLS FOR PARTNER MARKETING
-- =============================================

-- 1. Add publication columns to partner_marketing_pages (if not exists from partial run)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partner_marketing_pages' AND column_name = 'published') THEN
    ALTER TABLE public.partner_marketing_pages ADD COLUMN published BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partner_marketing_pages' AND column_name = 'published_at') THEN
    ALTER TABLE public.partner_marketing_pages ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Add is_suspended to partners (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' AND column_name = 'is_suspended') THEN
    ALTER TABLE public.partners ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' AND column_name = 'suspended_at') THEN
    ALTER TABLE public.partners ADD COLUMN suspended_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' AND column_name = 'suspension_reason') THEN
    ALTER TABLE public.partners ADD COLUMN suspension_reason TEXT;
  END IF;
END $$;

-- 3. Drop existing function and recreate with new signature
DROP FUNCTION IF EXISTS public.get_partner_by_domain(TEXT);

CREATE FUNCTION public.get_partner_by_domain(p_domain TEXT)
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  partner_slug TEXT,
  domain_type TEXT,
  is_published BOOLEAN,
  is_suspended BOOLEAN,
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
    COALESCE(pd.published, false) AS is_published,
    COALESCE(p.is_suspended, false) AS is_suspended,
    CASE WHEN pb.id IS NOT NULL THEN
      json_build_object(
        'id', pb.id,
        'partner_id', pb.partner_id,
        'logo_url', pb.logo_url,
        'favicon_url', pb.favicon_url,
        'primary_color', pb.primary_color,
        'secondary_color', pb.secondary_color,
        'accent_color', pb.accent_color,
        'platform_name', pb.platform_name,
        'support_email', pb.support_email,
        'support_phone', pb.support_phone,
        'terms_url', pb.terms_url,
        'privacy_url', pb.privacy_url,
        'hero_title', pb.hero_title,
        'hero_subtitle', pb.hero_subtitle,
        'powered_by_enabled', pb.powered_by_enabled,
        'powered_by_text', pb.powered_by_text,
        'footer_text', pb.footer_text,
        'meta_title', pb.meta_title,
        'meta_description', pb.meta_description,
        'og_image_url', pb.og_image_url
      )
    ELSE NULL END AS branding,
    CASE WHEN pmp.id IS NOT NULL THEN
      json_build_object(
        'id', pmp.id,
        'partner_id', pmp.partner_id,
        'hero_badge', pmp.hero_badge,
        'hero_title', pmp.hero_title,
        'hero_subtitle', pmp.hero_subtitle,
        'hero_cta_text', pmp.hero_cta_text,
        'hero_cta_url', pmp.hero_cta_url,
        'hero_image_url', pmp.hero_image_url,
        'benefits_title', pmp.benefits_title,
        'benefits', pmp.benefits,
        'features_title', pmp.features_title,
        'features', pmp.features,
        'faq_title', pmp.faq_title,
        'faq_items', pmp.faq_items,
        'cta_title', pmp.cta_title,
        'cta_subtitle', pmp.cta_subtitle,
        'cta_button_text', pmp.cta_button_text,
        'social_proof_text', pmp.social_proof_text,
        'testimonials', pmp.testimonials,
        'seo_title', pmp.seo_title,
        'seo_description', pmp.seo_description,
        'seo_keywords', pmp.seo_keywords,
        'schema_org', pmp.schema_org,
        'show_modules_section', pmp.show_modules_section,
        'show_pricing_section', pmp.show_pricing_section,
        'show_faq_section', pmp.show_faq_section,
        'show_testimonials_section', pmp.show_testimonials_section,
        'published', pmp.published,
        'published_at', pmp.published_at
      )
    ELSE NULL END AS marketing_page
  FROM partner_domains pd
  JOIN partners p ON p.id = pd.partner_id
  LEFT JOIN partner_branding pb ON pb.partner_id = p.id
  LEFT JOIN partner_marketing_pages pmp ON pmp.partner_id = p.id
  WHERE pd.domain = p_domain
    AND pd.is_verified = true
  LIMIT 1;
END;
$$;

-- 4. RPC to publish/unpublish partner landing
CREATE OR REPLACE FUNCTION public.publish_partner_landing(
  p_partner_id UUID,
  p_publish BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_marketing_domain BOOLEAN;
BEGIN
  -- Check if partner has a verified marketing domain
  SELECT EXISTS(
    SELECT 1 FROM partner_domains 
    WHERE partner_id = p_partner_id 
    AND domain_type = 'marketing' 
    AND is_verified = true
  ) INTO v_has_marketing_domain;
  
  IF p_publish AND NOT v_has_marketing_domain THEN
    RAISE EXCEPTION 'Cannot publish: No verified marketing domain found';
  END IF;
  
  -- Update marketing page publication status
  UPDATE partner_marketing_pages
  SET 
    published = p_publish,
    published_at = CASE WHEN p_publish THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE partner_id = p_partner_id;
  
  -- Also update domain publication status
  UPDATE partner_domains
  SET published = p_publish
  WHERE partner_id = p_partner_id
    AND domain_type = 'marketing';
  
  RETURN TRUE;
END;
$$;

-- 5. RPC to get partner publication status
CREATE OR REPLACE FUNCTION public.get_partner_publication_status(p_partner_id UUID)
RETURNS TABLE (
  marketing_domain TEXT,
  marketing_domain_verified BOOLEAN,
  app_domain TEXT,
  app_domain_verified BOOLEAN,
  is_published BOOLEAN,
  published_at TIMESTAMPTZ,
  has_branding BOOLEAN,
  has_marketing_page BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT domain FROM partner_domains WHERE partner_id = p_partner_id AND domain_type = 'marketing' LIMIT 1) AS marketing_domain,
    (SELECT is_verified FROM partner_domains WHERE partner_id = p_partner_id AND domain_type = 'marketing' LIMIT 1) AS marketing_domain_verified,
    (SELECT domain FROM partner_domains WHERE partner_id = p_partner_id AND domain_type = 'app' LIMIT 1) AS app_domain,
    (SELECT is_verified FROM partner_domains WHERE partner_id = p_partner_id AND domain_type = 'app' LIMIT 1) AS app_domain_verified,
    COALESCE((SELECT pmp.published FROM partner_marketing_pages pmp WHERE pmp.partner_id = p_partner_id LIMIT 1), false) AS is_published,
    (SELECT pmp.published_at FROM partner_marketing_pages pmp WHERE pmp.partner_id = p_partner_id LIMIT 1) AS published_at,
    EXISTS(SELECT 1 FROM partner_branding WHERE partner_id = p_partner_id) AS has_branding,
    EXISTS(SELECT 1 FROM partner_marketing_pages WHERE partner_id = p_partner_id) AS has_marketing_page;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_partner_by_domain(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_partner_landing(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_publication_status(UUID) TO authenticated;
