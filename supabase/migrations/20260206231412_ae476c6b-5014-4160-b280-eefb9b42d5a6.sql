-- Function to get public subscribers for the /clientes page
-- Only returns tenants that opted-in for public display

-- First, add opt-out column to tenants if it doesn't exist
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS hide_from_public_listing boolean DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url text;

-- Create the RPC function
CREATE OR REPLACE FUNCTION public.get_public_subscribers()
RETURNS TABLE (
  id uuid,
  name text,
  category_name text,
  city text,
  state text,
  logo_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.name,
    bcc.name as category_name,
    t.city,
    t.state,
    t.logo_url
  FROM public.tenants t
  LEFT JOIN public.business_category_configs bcc ON t.business_category = bcc.category_key
  WHERE t.is_active = true
    AND t.subscription_status IN ('active', 'trialing')
    AND (t.hide_from_public_listing = false OR t.hide_from_public_listing IS NULL)
  ORDER BY t.name;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_subscribers() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_subscribers() TO authenticated;

COMMENT ON FUNCTION public.get_public_subscribers() IS 'Returns list of active subscribers for public display on /clientes page';