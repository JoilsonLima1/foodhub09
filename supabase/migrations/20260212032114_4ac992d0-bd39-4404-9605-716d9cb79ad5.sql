-- Add SmartPOS device secret to system_settings
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('smartpos_device_secret', '""'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;