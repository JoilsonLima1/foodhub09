-- Tabela de Mesas do restaurante
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  name TEXT,
  qr_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, number)
);

-- Tabela de Sessões/Comandas (uma comanda por vez por mesa)
CREATE TABLE public.table_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  customer_name TEXT,
  customer_phone TEXT,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Itens consumidos na comanda (vinculados à sessão)
CREATE TABLE public.table_session_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  variation_id UUID REFERENCES public.product_variations(id),
  variation_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  added_by UUID,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_session_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for tables
CREATE POLICY "Users can view tenant tables"
ON public.tables FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Managers can manage tables"
ON public.tables FOR ALL
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- RLS policies for table_sessions
CREATE POLICY "Staff can view tenant sessions"
ON public.table_sessions FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can manage sessions"
ON public.table_sessions FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS policies for table_session_items
CREATE POLICY "Staff can view session items"
ON public.table_session_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.table_sessions s
    WHERE s.id = table_session_items.session_id
    AND s.tenant_id = get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Staff can manage session items"
ON public.table_session_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.table_sessions s
    WHERE s.id = table_session_items.session_id
    AND s.tenant_id = get_user_tenant_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.table_sessions s
    WHERE s.id = table_session_items.session_id
    AND s.tenant_id = get_user_tenant_id(auth.uid())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_table_sessions_updated_at
BEFORE UPDATE ON public.table_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for sessions and items
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_session_items;