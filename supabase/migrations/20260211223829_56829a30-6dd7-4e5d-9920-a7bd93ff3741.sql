
-- Drop the old check constraint
ALTER TABLE public.tenant_print_settings
DROP CONSTRAINT IF EXISTS tenant_print_settings_print_mode_check;

-- Migrate existing values
UPDATE public.tenant_print_settings
SET print_mode = CASE print_mode
  WHEN 'BROWSER' THEN 'web'
  WHEN 'AGENT' THEN 'desktop'
  WHEN 'KIOSK' THEN 'smartpos'
  ELSE 'web'
END;

-- Add new check constraint with updated values
ALTER TABLE public.tenant_print_settings
ADD CONSTRAINT tenant_print_settings_print_mode_check
CHECK (print_mode IN ('web', 'desktop', 'smartpos'));

-- Update the RPC function
CREATE OR REPLACE FUNCTION public.get_or_create_tenant_print_settings(p_tenant_id uuid)
RETURNS SETOF tenant_print_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tenant_print_settings (tenant_id, paper_width, printer_profile, print_mode, agent_endpoint)
  VALUES (p_tenant_id, '80', 'GENERIC', 'web', 'https://127.0.0.1:8123')
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN QUERY SELECT * FROM tenant_print_settings WHERE tenant_id = p_tenant_id;
END;
$$;
