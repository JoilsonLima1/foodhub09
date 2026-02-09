
-- Fix infinite recursion in partner_users RLS policies
-- The current "Partner admins can manage partner users" policy queries partner_users itself, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Partner admins can manage partner users" ON public.partner_users;

-- Create a SECURITY DEFINER helper function to check partner admin status without triggering RLS
CREATE OR REPLACE FUNCTION public.is_partner_admin(_user_id uuid, _partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_users
    WHERE user_id = _user_id
      AND partner_id = _partner_id
      AND is_active = true
      AND role = 'admin'
  )
$$;

-- Create non-recursive policies for partner_users
-- Users can view their own partner_users records
CREATE POLICY "Users can view own partner_users"
ON public.partner_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Partner admins can view all users in their partner org (uses security definer function)
CREATE POLICY "Partner admins can view partner users"
ON public.partner_users
FOR SELECT
TO authenticated
USING (public.is_partner_admin(auth.uid(), partner_id));

-- Partner admins can insert/update/delete partner users (uses security definer function)
CREATE POLICY "Partner admins can manage partner users"
ON public.partner_users
FOR ALL
TO authenticated
USING (public.is_partner_admin(auth.uid(), partner_id))
WITH CHECK (public.is_partner_admin(auth.uid(), partner_id));

-- Also fix the partners table policy that has the same recursion issue
DROP POLICY IF EXISTS "Partner users can view own partner" ON public.partners;
DROP POLICY IF EXISTS "Partner users can update own partner" ON public.partners;

CREATE POLICY "Partner users can view own partner"
ON public.partners
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partner_users pu
    WHERE pu.partner_id = id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
  )
);

CREATE POLICY "Partner users can update own partner"
ON public.partners
FOR UPDATE
TO authenticated
USING (public.is_partner_admin(auth.uid(), id));

-- Now recreate the complete_partner_registration RPC to be truly atomic and idempotent
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
  v_status text := 'created';
BEGIN
  -- Step 1: Check if user already has a partner link
  SELECT pu.partner_id INTO v_partner_id
  FROM public.partner_users pu
  WHERE pu.user_id = p_user_id
  LIMIT 1;

  IF v_partner_id IS NOT NULL THEN
    -- User already linked to a partner - return success (idempotent)
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'already_ok',
      'partner_id', v_partner_id,
      'redirect_url', '/partner/onboarding',
      'message', 'Parceiro já existe'
    );
  END IF;

  -- Step 2: Check if a partner with this email already exists (orphaned partner)
  SELECT p.id INTO v_partner_id
  FROM public.partners p
  WHERE p.email = p_email
  LIMIT 1;

  IF v_partner_id IS NOT NULL THEN
    -- Partner exists but user not linked - repair the link
    INSERT INTO public.partner_users (partner_id, user_id, role, is_active)
    VALUES (v_partner_id, p_user_id, 'admin', TRUE)
    ON CONFLICT DO NOTHING;

    -- Ensure onboarding status exists
    INSERT INTO public.partner_onboarding_status (partner_id)
    VALUES (v_partner_id)
    ON CONFLICT (partner_id) DO NOTHING;

    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'repaired',
      'partner_id', v_partner_id,
      'redirect_url', '/partner/onboarding',
      'message', 'Vínculo reparado'
    );
  END IF;

  -- Step 3: Create new partner from scratch

  -- Ensure unique slug
  WHILE EXISTS (SELECT 1 FROM public.partners WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;

  -- Create partner record
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

  -- Create default settlement config
  INSERT INTO public.partner_settlement_config (
    partner_id, payout_frequency, minimum_payout, holdback_days, auto_payout
  )
  VALUES (v_partner_id, 'monthly', 100.00, 14, FALSE)
  ON CONFLICT (partner_id) DO NOTHING;

  -- Ensure onboarding status (trigger may also create it, but be safe)
  INSERT INTO public.partner_onboarding_status (partner_id)
  VALUES (v_partner_id)
  ON CONFLICT (partner_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'created',
    'partner_id', v_partner_id,
    'slug', v_slug,
    'redirect_url', '/partner/onboarding'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'status', 'error',
    'message', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;
