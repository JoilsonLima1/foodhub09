-- Fix complete_partner_registration to use is_active instead of status
CREATE OR REPLACE FUNCTION public.complete_partner_registration(
  p_user_id uuid, 
  p_name text, 
  p_slug text, 
  p_email text, 
  p_phone text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_partner_id UUID;
  v_slug text := p_slug;
BEGIN
  -- Check if user already has a partner
  IF EXISTS (
    SELECT 1 FROM public.partner_users WHERE user_id = p_user_id
  ) THEN
    -- Return existing partner
    SELECT partner_id INTO v_partner_id
    FROM public.partner_users WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'partner_id', v_partner_id,
      'message', 'Parceiro já existe'
    );
  END IF;
  
  -- Ensure unique slug
  WHILE EXISTS (SELECT 1 FROM public.partners WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;
  
  -- Create partner using is_active (correct column)
  INSERT INTO public.partners (name, slug, email, phone, is_active, is_suspended)
  VALUES (p_name, v_slug, p_email, p_phone, TRUE, FALSE)
  RETURNING id INTO v_partner_id;
  
  -- Link user as admin
  INSERT INTO public.partner_users (partner_id, user_id, role, is_active)
  VALUES (v_partner_id, p_user_id, 'admin', TRUE);
  
  -- Create default branding
  INSERT INTO public.partner_branding (partner_id, platform_name)
  VALUES (v_partner_id, p_name)
  ON CONFLICT (partner_id) DO NOTHING;
  
  -- Create default domains record
  INSERT INTO public.partner_domains (partner_id)
  VALUES (v_partner_id)
  ON CONFLICT (partner_id) DO NOTHING;
  
  -- Create default settlement config (manual mode)
  INSERT INTO public.partner_settlement_config (
    partner_id, 
    payout_frequency, 
    minimum_payout, 
    holdback_days,
    auto_payout
  )
  VALUES (v_partner_id, 'monthly', 100.00, 14, FALSE)
  ON CONFLICT (partner_id) DO NOTHING;
  
  -- Onboarding status is auto-created via trigger
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'partner_id', v_partner_id,
    'slug', v_slug,
    'redirect_url', '/partner/onboarding'
  );
END;
$$;

-- Fix submit_partner_lead to use is_active instead of status
CREATE OR REPLACE FUNCTION public.submit_partner_lead(
  p_partner_id uuid, 
  p_name text, 
  p_contact text, 
  p_message text DEFAULT NULL::text, 
  p_source_url text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- Validate partner exists and is active (use is_active, not status)
  IF NOT EXISTS (
    SELECT 1 FROM public.partners 
    WHERE id = p_partner_id AND is_active = TRUE AND is_suspended = FALSE
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Parceiro não encontrado');
  END IF;
  
  -- Insert lead
  INSERT INTO public.partner_leads (partner_id, name, contact, message, source_url)
  VALUES (p_partner_id, p_name, p_contact, p_message, p_source_url)
  RETURNING id INTO v_lead_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'lead_id', v_lead_id
  );
END;
$$;

-- Fix get_public_partner_profile to use correct partner_domains schema
CREATE OR REPLACE FUNCTION public.get_public_partner_profile(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_partner RECORD;
  v_branding RECORD;
  v_marketing_domain TEXT;
  v_app_domain TEXT;
  v_plans_count INT;
BEGIN
  -- Find partner by slug
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
  
  -- Get domains by type
  SELECT domain INTO v_marketing_domain
  FROM public.partner_domains
  WHERE partner_id = v_partner.id 
    AND domain_type = 'marketing' 
    AND is_verified = TRUE
  LIMIT 1;
  
  SELECT domain INTO v_app_domain
  FROM public.partner_domains
  WHERE partner_id = v_partner.id 
    AND domain_type = 'app' 
    AND is_verified = TRUE
  LIMIT 1;
  
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
      'logo_url', v_branding.logo_url,
      'platform_name', COALESCE(v_branding.platform_name, v_partner.name),
      'primary_color', COALESCE(v_branding.primary_color, '#3B82F6'),
      'tagline', v_branding.hero_subtitle
    ),
    'domains', jsonb_build_object(
      'marketing', v_marketing_domain,
      'app', v_app_domain
    ),
    'has_plans', v_plans_count > 0
  );
END;
$$;