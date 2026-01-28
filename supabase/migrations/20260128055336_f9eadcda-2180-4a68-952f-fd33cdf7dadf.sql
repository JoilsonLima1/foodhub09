-- Add POS display mode settings to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS pos_display_mode TEXT DEFAULT 'list',
ADD COLUMN IF NOT EXISTS pos_allow_cashier_mode_change BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.pos_display_mode IS 'Display mode for POS: list, grid_images';
COMMENT ON COLUMN public.tenants.pos_allow_cashier_mode_change IS 'Allow cashier to change display mode in POS';