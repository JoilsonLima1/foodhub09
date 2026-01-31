-- Create public function to expose addon modules for landing page (no auth required)
CREATE OR REPLACE FUNCTION public.get_public_addon_modules()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  description text,
  category text,
  icon text,
  monthly_price numeric,
  currency text,
  display_order integer,
  features jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    am.id,
    am.slug,
    am.name,
    am.description,
    am.category::text,
    am.icon,
    am.monthly_price,
    am.currency,
    am.display_order,
    am.features
  FROM public.addon_modules am
  WHERE am.is_active = true
    AND am.implementation_status = 'ready'
  ORDER BY am.display_order ASC
$$;