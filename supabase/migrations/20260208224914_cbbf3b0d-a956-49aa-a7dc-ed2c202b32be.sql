-- Fix get_public_partner_profile function to use is_active instead of status
CREATE OR REPLACE FUNCTION public.get_public_partner_profile(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_partner RECORD;
  v_branding RECORD;
  v_domains RECORD;
  v_plans_count INT;
BEGIN
  -- Find partner by slug (use is_active instead of status)
  SELECT * INTO v_partner
  FROM public.partners
  WHERE slug = p_slug AND is_active = TRUE AND is_suspended = FALSE;
  
  IF v_partner IS NULL THEN
    RETURN jsonb_build_object('found', FALSE);
  END IF;
  
  -- Get branding
  SELECT * INTO v_branding
  FROM public.partner_branding
  WHERE partner_id = v_partner.id;
  
  -- Get domains
  SELECT * INTO v_domains
  FROM public.partner_domains
  WHERE partner_id = v_partner.id;
  
  -- Count active plans
  SELECT COUNT(*) INTO v_plans_count
  FROM public.partner_plans
  WHERE partner_id = v_partner.id AND is_active = TRUE;
  
  RETURN jsonb_build_object(
    'found', TRUE,
    'partner_id', v_partner.id,
    'name', v_partner.name,
    'slug', v_partner.slug,
    'branding', jsonb_build_object(
      'logo_url', COALESCE(v_branding.logo_url, NULL),
      'platform_name', COALESCE(v_branding.platform_name, v_partner.name),
      'primary_color', COALESCE(v_branding.primary_color, '#3B82F6'),
      'tagline', COALESCE(v_branding.tagline, NULL)
    ),
    'domains', jsonb_build_object(
      'marketing', CASE WHEN v_domains.marketing_domain_verified THEN v_domains.marketing_domain ELSE NULL END,
      'app', CASE WHEN v_domains.app_domain_verified THEN v_domains.app_domain ELSE NULL END
    ),
    'has_plans', v_plans_count > 0
  );
END;
$$;