-- Allow 'KIOSK' as a valid print_mode value
-- The column is text so no enum change needed, just update the RPC default comment
COMMENT ON COLUMN public.tenant_print_settings.print_mode IS 'BROWSER | AGENT | KIOSK';