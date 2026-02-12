
-- Migrate print_agent_* keys to desktop_pdv_* in system_settings
-- Copy existing values, then remove old keys

INSERT INTO public.system_settings (setting_key, setting_value, created_at, updated_at)
SELECT 
  CASE setting_key
    WHEN 'print_agent_windows_url' THEN 'desktop_pdv_windows_url'
    WHEN 'print_agent_mac_url' THEN 'desktop_pdv_mac_url'
    WHEN 'print_agent_default_port' THEN 'desktop_pdv_default_port'
  END,
  setting_value,
  now(),
  now()
FROM public.system_settings
WHERE setting_key IN ('print_agent_windows_url', 'print_agent_mac_url', 'print_agent_default_port')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();

-- Remove old keys
DELETE FROM public.system_settings 
WHERE setting_key IN ('print_agent_windows_url', 'print_agent_mac_url', 'print_agent_default_port');
