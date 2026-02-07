-- =====================================================
-- Partner Program Marketing & Leads System (100% ADITIVO)
-- =====================================================

-- Partner Leads Table (for public partner profiles)
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL, -- email or phone
  message TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_partner_leads_partner_id ON public.partner_leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_leads_status ON public.partner_leads(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_leads_created ON public.partner_leads(partner_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Partners can only see their own leads
CREATE POLICY "Partners can view own leads"
  ON public.partner_leads
  FOR SELECT
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can update own leads"
  ON public.partner_leads
  FOR UPDATE
  USING (
    partner_id IN (
      SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid()
    )
  );

-- Allow anonymous lead submission (public form)
CREATE POLICY "Anyone can submit leads"
  ON public.partner_leads
  FOR INSERT
  WITH CHECK (true);

-- Super admins can view all leads
CREATE POLICY "Super admins can view all leads"
  ON public.partner_leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Update timestamp trigger
CREATE TRIGGER update_partner_leads_updated_at
  BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RPC: submit_partner_lead (Public - for lead forms)
-- =====================================================
CREATE OR REPLACE FUNCTION public.submit_partner_lead(
  p_partner_id UUID,
  p_name TEXT,
  p_contact TEXT,
  p_message TEXT DEFAULT NULL,
  p_source_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- Validate partner exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.partners 
    WHERE id = p_partner_id AND status = 'active'
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

-- =====================================================
-- RPC: get_public_partner_profile (for /parceiros/:slug)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_public_partner_profile(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner RECORD;
  v_branding RECORD;
  v_domains RECORD;
  v_plans_count INT;
BEGIN
  -- Find partner by slug
  SELECT * INTO v_partner
  FROM public.partners
  WHERE slug = p_slug AND status = 'active';
  
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
    'city', v_partner.city,
    'state', v_partner.state,
    'branding', jsonb_build_object(
      'logo_url', v_branding.logo_url,
      'platform_name', v_branding.platform_name,
      'primary_color', v_branding.primary_color,
      'tagline', v_branding.tagline
    ),
    'domains', jsonb_build_object(
      'marketing', CASE WHEN v_domains.marketing_domain_verified THEN v_domains.marketing_domain ELSE NULL END,
      'app', CASE WHEN v_domains.app_domain_verified THEN v_domains.app_domain ELSE NULL END
    ),
    'has_plans', v_plans_count > 0
  );
END;
$$;

-- =====================================================
-- RPC: create_partner_account (Self-registration)
-- Creates auth user, partner, and initial configs
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_partner_account(
  p_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_partner_id UUID;
  v_slug TEXT;
BEGIN
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'email_exists',
      'message', 'Este email já está cadastrado. Faça login.'
    );
  END IF;
  
  -- Generate slug from name
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  
  -- Ensure unique slug
  WHILE EXISTS (SELECT 1 FROM public.partners WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;
  
  -- Create auth user via auth.users (requires service role, handled by edge function)
  -- For now, return info for edge function to complete
  v_partner_id := gen_random_uuid();
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'action', 'create_user_required',
    'partner_id', v_partner_id,
    'slug', v_slug,
    'name', p_name,
    'email', p_email,
    'phone', p_phone
  );
END;
$$;

-- =====================================================
-- RPC: complete_partner_registration (after auth.signUp)
-- Called after auth user is created to create partner record
-- =====================================================
CREATE OR REPLACE FUNCTION public.complete_partner_registration(
  p_user_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
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
  WHILE EXISTS (SELECT 1 FROM public.partners WHERE slug = p_slug) LOOP
    p_slug := p_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;
  
  -- Create partner
  INSERT INTO public.partners (name, slug, email, phone, status)
  VALUES (p_name, p_slug, p_email, p_phone, 'active')
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
    'slug', p_slug,
    'redirect_url', '/partner/onboarding'
  );
END;
$$;

-- =====================================================
-- RPC: get_partner_leads (for partner leads page)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_partner_leads(
  p_partner_id UUID,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leads JSONB;
  v_total INT;
BEGIN
  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_users 
    WHERE partner_id = p_partner_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Acesso negado');
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM public.partner_leads
  WHERE partner_id = p_partner_id
    AND (p_status IS NULL OR status = p_status);
  
  -- Get leads
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'contact', contact,
      'message', message,
      'source_url', source_url,
      'status', status,
      'notes', notes,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::JSONB)
  INTO v_leads
  FROM public.partner_leads
  WHERE partner_id = p_partner_id
    AND (p_status IS NULL OR status = p_status)
  LIMIT p_limit
  OFFSET p_offset;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'leads', v_leads,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- =====================================================
-- RPC: update_partner_lead_status
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_partner_lead_status(
  p_lead_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  -- Get partner_id from lead
  SELECT partner_id INTO v_partner_id
  FROM public.partner_leads
  WHERE id = p_lead_id;
  
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Lead não encontrado');
  END IF;
  
  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_users 
    WHERE partner_id = v_partner_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Acesso negado');
  END IF;
  
  -- Update lead
  UPDATE public.partner_leads
  SET status = p_status,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_lead_id;
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.submit_partner_lead(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_partner_profile(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_partner_account(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_partner_registration(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_leads(UUID, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_partner_lead_status(UUID, TEXT, TEXT) TO authenticated;