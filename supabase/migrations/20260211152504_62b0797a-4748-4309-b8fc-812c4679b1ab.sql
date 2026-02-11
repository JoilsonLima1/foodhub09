
-- 1. Create tenant_print_agents table for device pairing
CREATE TABLE IF NOT EXISTS public.tenant_print_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text,
  pairing_token text,
  pairing_token_expires_at timestamptz,
  paired_at timestamptz,
  last_seen_at timestamptz,
  status text NOT NULL DEFAULT 'offline',
  agent_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, device_id)
);

-- Enable RLS
ALTER TABLE public.tenant_print_agents ENABLE ROW LEVEL SECURITY;

-- Tenant members can view their own agents
CREATE POLICY "Tenant members can view their print agents"
  ON public.tenant_print_agents FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Tenant admins can manage their print agents
CREATE POLICY "Tenant admins can insert print agents"
  ON public.tenant_print_agents FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Tenant admins can update print agents"
  ON public.tenant_print_agents FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Tenant admins can delete print agents"
  ON public.tenant_print_agents FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 2. Add printer name columns to tenant_print_settings
ALTER TABLE public.tenant_print_settings
  ADD COLUMN IF NOT EXISTS default_printer_name text,
  ADD COLUMN IF NOT EXISTS kitchen_printer_name text,
  ADD COLUMN IF NOT EXISTS bar_printer_name text;

-- 3. Update the get_or_create function to include new columns
CREATE OR REPLACE FUNCTION public.get_or_create_tenant_print_settings(p_tenant_id uuid)
RETURNS SETOF public.tenant_print_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_print_settings (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN QUERY
  SELECT * FROM public.tenant_print_settings WHERE tenant_id = p_tenant_id;
END;
$$;

-- 4. Enable realtime for tenant_print_agents (for live status)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_print_agents;
