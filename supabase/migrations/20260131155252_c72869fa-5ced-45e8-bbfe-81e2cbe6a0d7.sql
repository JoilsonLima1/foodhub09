-- Add quota tracking column to tenant_addon_subscriptions for modules that allow multiple purchases
ALTER TABLE public.tenant_addon_subscriptions 
ADD COLUMN IF NOT EXISTS quota integer DEFAULT 1;

-- Add store_id to profiles for branch manager isolation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

-- Create index for store-based lookups
CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON public.profiles(store_id);

-- Create function to get multi-store quota info for a tenant
CREATE OR REPLACE FUNCTION public.get_multi_store_quota(p_tenant_id uuid)
RETURNS TABLE(
  quota integer,
  used integer,
  available integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id uuid;
  v_quota integer := 0;
  v_used integer := 0;
BEGIN
  -- Get the multi_store module id
  SELECT id INTO v_module_id
  FROM public.addon_modules 
  WHERE slug = 'multi_store';
  
  IF v_module_id IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0;
    RETURN;
  END IF;
  
  -- Sum total quota from all active subscriptions for this module
  SELECT COALESCE(SUM(tas.quota), 0) INTO v_quota
  FROM public.tenant_addon_subscriptions tas
  WHERE tas.tenant_id = p_tenant_id
    AND tas.addon_module_id = v_module_id
    AND tas.status IN ('active', 'trial');
  
  -- Count branches (non-headquarters stores)
  SELECT COUNT(*) INTO v_used
  FROM public.stores s
  WHERE s.tenant_id = p_tenant_id
    AND s.is_headquarters = false;
  
  RETURN QUERY SELECT v_quota, v_used, (v_quota - v_used);
END;
$$;

-- Update RLS policy for profiles to consider store_id isolation
CREATE POLICY "Users can view profiles in same store" 
ON public.profiles 
FOR SELECT 
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    -- Admin/Manager can see all profiles in tenant
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    -- Others can only see own profile or same store
    user_id = auth.uid() OR
    store_id IS NULL OR
    store_id = (SELECT store_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Create function to check if tenant can create more stores
CREATE OR REPLACE FUNCTION public.can_create_branch(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (q.available > 0)
  FROM public.get_multi_store_quota(p_tenant_id) q
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.tenant_addon_subscriptions.quota IS 'Number of units for quota-based modules (e.g., multi_store allows N branches per unit purchased)';