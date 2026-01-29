-- RPC function to get active payment gateways (for public checkout)
CREATE OR REPLACE FUNCTION public.get_active_payment_gateways()
RETURNS TABLE (
  id uuid,
  name text,
  provider text,
  is_default boolean,
  config jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pg.id,
    pg.name,
    pg.provider,
    pg.is_default,
    pg.config
  FROM public.payment_gateways pg
  WHERE pg.is_active = true
  ORDER BY pg.is_default DESC, pg.created_at ASC
$$;