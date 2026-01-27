-- Fix system_settings public exposure - restrict to authenticated users
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;

-- Create a function to get public settings (only specific non-sensitive keys for landing page)
CREATE OR REPLACE FUNCTION public.get_public_settings()
RETURNS TABLE (
  setting_key text,
  setting_value jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only expose specific settings needed for public landing page
  SELECT s.setting_key, s.setting_value
  FROM public.system_settings s
  WHERE s.setting_key IN ('branding', 'colors', 'landing_layout', 'trial_period')
$$;

-- Allow authenticated users to view all system settings
CREATE POLICY "Authenticated users can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);