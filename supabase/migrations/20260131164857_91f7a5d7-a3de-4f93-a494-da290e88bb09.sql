-- =============================================
-- STORE USER ACCESS: Multi-Store Permission Table
-- =============================================

-- Create store_user_access table for mapping users to stores
CREATE TABLE IF NOT EXISTS public.store_user_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'standard' CHECK (access_level IN ('admin', 'manager', 'standard')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate user-store pairs
  UNIQUE (user_id, store_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_user_access_user ON public.store_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_store_user_access_store ON public.store_user_access(store_id);
CREATE INDEX IF NOT EXISTS idx_store_user_access_tenant ON public.store_user_access(tenant_id);

-- Enable RLS
ALTER TABLE public.store_user_access ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR store_user_access
-- =============================================

-- Super admins can do everything
CREATE POLICY "Super admins have full access to store_user_access"
ON public.store_user_access
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins can manage store access for their tenant
CREATE POLICY "Admins can manage store access for their tenant"
ON public.store_user_access
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') 
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

-- Managers can view store access in their tenant
CREATE POLICY "Managers can view store access for their tenant"
ON public.store_user_access
FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager')
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

-- Users can see their own access records
CREATE POLICY "Users can view their own store access"
ON public.store_user_access
FOR SELECT
USING (user_id = auth.uid());

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user has access to a specific store
CREATE OR REPLACE FUNCTION public.user_has_store_access(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check store_user_access table
    SELECT 1
    FROM public.store_user_access sua
    WHERE sua.user_id = _user_id
      AND sua.store_id = _store_id
  )
  OR EXISTS (
    -- Super admins and tenant admins have access to all stores in their tenant
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    JOIN public.stores s ON s.tenant_id = p.tenant_id
    WHERE ur.user_id = _user_id
      AND s.id = _store_id
      AND ur.role IN ('super_admin', 'admin')
  )
$$;

-- Function to get allowed stores for a user
CREATE OR REPLACE FUNCTION public.get_user_allowed_stores(_user_id uuid)
RETURNS TABLE (
  store_id uuid,
  store_name text,
  store_code text,
  is_headquarters boolean,
  is_active boolean,
  access_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_tenant AS (
    SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
  ),
  is_admin AS (
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
    ) as admin_status
  )
  -- If admin, return all stores in tenant
  SELECT 
    s.id as store_id,
    s.name as store_name,
    s.code as store_code,
    s.is_headquarters,
    s.is_active,
    'admin'::text as access_level
  FROM public.stores s
  JOIN user_tenant ut ON s.tenant_id = ut.tenant_id
  WHERE (SELECT admin_status FROM is_admin)
  
  UNION
  
  -- Otherwise return only explicitly assigned stores
  SELECT 
    s.id as store_id,
    s.name as store_name,
    s.code as store_code,
    s.is_headquarters,
    s.is_active,
    sua.access_level
  FROM public.store_user_access sua
  JOIN public.stores s ON s.id = sua.store_id
  WHERE sua.user_id = _user_id
    AND NOT (SELECT admin_status FROM is_admin)
  
  ORDER BY is_headquarters DESC, store_name;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_store_user_access_updated_at
  BEFORE UPDATE ON public.store_user_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE REALTIME FOR store_user_access
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_user_access;