-- Add implementation status to addon_modules to track which are ready to use
ALTER TABLE public.addon_modules 
ADD COLUMN IF NOT EXISTS implementation_status text NOT NULL DEFAULT 'coming_soon';

-- Add constraint for valid values
ALTER TABLE public.addon_modules 
ADD CONSTRAINT addon_modules_implementation_status_check 
CHECK (implementation_status IN ('ready', 'beta', 'coming_soon', 'development'));

-- Update existing modules with their current implementation status
-- Smart Delivery has basic functionality via /deliveries page
UPDATE public.addon_modules SET implementation_status = 'beta' WHERE slug = 'smart_delivery';

-- iFood integration exists
UPDATE public.addon_modules SET implementation_status = 'ready' WHERE slug = 'integration_ifood';

-- All others are coming soon
UPDATE public.addon_modules SET implementation_status = 'coming_soon' 
WHERE implementation_status = 'coming_soon' 
AND slug NOT IN ('smart_delivery', 'integration_ifood');

-- Add comment for documentation
COMMENT ON COLUMN public.addon_modules.implementation_status IS 'Status: ready (fully functional), beta (basic features), coming_soon (not available), development (internal testing)';