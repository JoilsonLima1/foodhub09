
-- Tabela de configurações de impressão por tenant
CREATE TABLE public.tenant_print_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  paper_width text NOT NULL DEFAULT '80' CHECK (paper_width IN ('58', '80')),
  printer_profile text NOT NULL DEFAULT 'GENERIC' CHECK (printer_profile IN ('EPSON', 'ELGIN', 'BEMATECH', 'DARUMA', 'TOMATE', 'GENERIC')),
  print_mode text NOT NULL DEFAULT 'BROWSER' CHECK (print_mode IN ('BROWSER', 'AGENT')),
  agent_endpoint text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_print_settings ENABLE ROW LEVEL SECURITY;

-- Tenant users can read their own settings
CREATE POLICY "tps_tenant_select" ON public.tenant_print_settings
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Tenant admins/managers can insert their own settings
CREATE POLICY "tps_tenant_insert" ON public.tenant_print_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Tenant admins/managers can update their own settings
CREATE POLICY "tps_tenant_update" ON public.tenant_print_settings
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Super admin full access
CREATE POLICY "tps_super_admin" ON public.tenant_print_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- RPC: get or create tenant print settings
CREATE OR REPLACE FUNCTION public.get_or_create_tenant_print_settings(p_tenant_id uuid)
RETURNS SETOF public.tenant_print_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to insert, do nothing if already exists
  INSERT INTO public.tenant_print_settings (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Return the row
  RETURN QUERY SELECT * FROM public.tenant_print_settings WHERE tenant_id = p_tenant_id;
END;
$$;
