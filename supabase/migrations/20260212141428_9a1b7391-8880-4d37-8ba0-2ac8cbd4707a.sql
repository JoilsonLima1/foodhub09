
-- Add structured columns to printer_routes
ALTER TABLE public.printer_routes 
  ADD COLUMN IF NOT EXISTS is_base boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS route_key text,
  ADD COLUMN IF NOT EXISTS printers text[] NOT NULL DEFAULT '{}';

-- Migrate existing printer_name to printers array
UPDATE public.printer_routes 
SET printers = ARRAY[printer_name]
WHERE printer_name IS NOT NULL AND printer_name != '';

-- Set route_key from route_type for existing rows
UPDATE public.printer_routes 
SET route_key = route_type
WHERE route_key IS NULL;

-- Mark base sectors as non-removable
UPDATE public.printer_routes 
SET is_base = true 
WHERE route_type IN ('caixa', 'cozinha', 'bar');

-- Ensure route_key has a value then add NOT NULL + default
ALTER TABLE public.printer_routes 
  ALTER COLUMN route_key SET NOT NULL,
  ALTER COLUMN route_key SET DEFAULT '';

-- Unique constraint: one route_key per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_printer_routes_tenant_route_key 
  ON public.printer_routes(tenant_id, route_key);
