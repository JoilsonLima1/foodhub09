
-- Create printer_routes table for dynamic print routing
CREATE TABLE public.printer_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Caixa',
  printer_name TEXT,
  route_type TEXT DEFAULT 'caixa',
  paper_width TEXT DEFAULT '80',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printer_routes ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage routes for their own tenant
CREATE POLICY "Users can view their tenant printer routes"
  ON public.printer_routes FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert printer routes for their tenant"
  ON public.printer_routes FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their tenant printer routes"
  ON public.printer_routes FOR UPDATE
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tenant printer routes"
  ON public.printer_routes FOR DELETE
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_printer_routes_updated_at
  BEFORE UPDATE ON public.printer_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index
CREATE INDEX idx_printer_routes_tenant ON public.printer_routes(tenant_id);
