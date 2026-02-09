
-- Add unique constraint on partner_onboarding_status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_onboarding_status_partner_id_key') THEN
    ALTER TABLE public.partner_onboarding_status ADD CONSTRAINT partner_onboarding_status_partner_id_key UNIQUE (partner_id);
  END IF;
END $$;

-- Recreate RPC without references to non-existent tables
CREATE OR REPLACE FUNCTION public.complete_partner_registration(
  p_user_id uuid,
  p_name text,
  p_slug text,
  p_email text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_slug text := p_slug;
BEGIN
  -- Check if user already linked
  SELECT pu.partner_id INTO v_partner_id
  FROM public.partner_users pu WHERE pu.user_id = p_user_id LIMIT 1;

  IF v_partner_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE, 'status', 'already_ok',
      'partner_id', v_partner_id,
      'redirect_url', '/partner/onboarding'
    );
  END IF;

  -- Check orphaned partner by email
  SELECT p.id INTO v_partner_id
  FROM public.partners p WHERE p.email = p_email LIMIT 1;

  IF v_partner_id IS NOT NULL THEN
    INSERT INTO public.partner_users (partner_id, user_id, role, is_active)
    VALUES (v_partner_id, p_user_id, 'admin', TRUE)
    ON CONFLICT DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM public.partner_onboarding_status WHERE partner_id = v_partner_id) THEN
      INSERT INTO public.partner_onboarding_status (partner_id) VALUES (v_partner_id);
    END IF;
    RETURN jsonb_build_object(
      'success', TRUE, 'status', 'repaired',
      'partner_id', v_partner_id,
      'redirect_url', '/partner/onboarding'
    );
  END IF;

  -- Create new partner
  WHILE EXISTS (SELECT 1 FROM public.partners WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;

  INSERT INTO public.partners (name, slug, email, phone, is_active, is_suspended)
  VALUES (p_name, v_slug, p_email, p_phone, TRUE, FALSE)
  RETURNING id INTO v_partner_id;

  INSERT INTO public.partner_users (partner_id, user_id, role, is_active)
  VALUES (v_partner_id, p_user_id, 'admin', TRUE);

  IF NOT EXISTS (SELECT 1 FROM public.partner_branding WHERE partner_id = v_partner_id) THEN
    INSERT INTO public.partner_branding (partner_id, platform_name) VALUES (v_partner_id, p_name);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.partner_domains WHERE partner_id = v_partner_id) THEN
    INSERT INTO public.partner_domains (partner_id, domain, domain_type, is_primary)
    VALUES (v_partner_id, v_slug || '.app', 'app', TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.partner_onboarding_status WHERE partner_id = v_partner_id) THEN
    INSERT INTO public.partner_onboarding_status (partner_id) VALUES (v_partner_id);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE, 'status', 'created',
    'partner_id', v_partner_id,
    'slug', v_slug,
    'redirect_url', '/partner/onboarding'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE, 'status', 'error',
    'message', SQLERRM, 'code', SQLSTATE
  );
END;
$$;
