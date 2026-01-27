-- Create enum for iFood order status
CREATE TYPE public.ifood_order_status AS ENUM (
  'PLACED',
  'CONFIRMED', 
  'INTEGRATED',
  'CANCELLED',
  'PREPARATION_STARTED',
  'READY_TO_PICKUP',
  'DISPATCHED',
  'DELIVERED',
  'CONCLUDED'
);

-- Create table for iFood integration settings per tenant
CREATE TABLE public.ifood_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  client_id TEXT,
  client_secret TEXT,
  merchant_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  auto_accept_orders BOOLEAN DEFAULT true,
  sync_menu BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for iFood orders received
CREATE TABLE public.ifood_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  ifood_order_id TEXT NOT NULL,
  ifood_short_id TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status public.ifood_order_status DEFAULT 'PLACED',
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address JSONB,
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT,
  scheduled_to TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, ifood_order_id)
);

-- Create table for iFood menu sync mapping
CREATE TABLE public.ifood_menu_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  ifood_item_id TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, product_id)
);

-- Create table for integration logs
CREATE TABLE public.ifood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  endpoint TEXT,
  request_data JSONB,
  response_data JSONB,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ifood_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifood_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifood_menu_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifood_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ifood_integrations (admin/manager only - contains secrets)
CREATE POLICY "Admin/Manager can manage iFood integration"
ON public.ifood_integrations
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

-- RLS Policies for ifood_orders (all staff can view)
CREATE POLICY "Staff can view iFood orders"
ON public.ifood_orders
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Admin/Manager can manage iFood orders"
ON public.ifood_orders
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

-- RLS Policies for ifood_menu_mapping
CREATE POLICY "Staff can view menu mapping"
ON public.ifood_menu_mapping
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Admin/Manager can manage menu mapping"
ON public.ifood_menu_mapping
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

-- RLS Policies for ifood_logs (admin only)
CREATE POLICY "Admin can view iFood logs"
ON public.ifood_logs
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Create indexes for performance
CREATE INDEX idx_ifood_orders_tenant ON public.ifood_orders(tenant_id);
CREATE INDEX idx_ifood_orders_status ON public.ifood_orders(status);
CREATE INDEX idx_ifood_orders_created ON public.ifood_orders(created_at DESC);
CREATE INDEX idx_ifood_logs_tenant ON public.ifood_logs(tenant_id);
CREATE INDEX idx_ifood_logs_created ON public.ifood_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_ifood_integrations_updated_at
  BEFORE UPDATE ON public.ifood_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ifood_orders_updated_at
  BEFORE UPDATE ON public.ifood_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();