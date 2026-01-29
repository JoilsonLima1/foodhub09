-- =============================================
-- MÓDULO: Marketplace Integrations (99Food, Keeta)
-- =============================================

-- Tabela genérica para integrações de marketplace
CREATE TABLE public.marketplace_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- '99food', 'keeta', etc.
  client_id TEXT,
  client_secret TEXT,
  api_key TEXT,
  merchant_id TEXT,
  store_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  auto_accept_orders BOOLEAN DEFAULT true,
  sync_menu BOOLEAN DEFAULT true,
  sync_prices BOOLEAN DEFAULT true,
  webhook_url TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

-- Pedidos de marketplace
CREATE TABLE public.marketplace_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_order_id TEXT NOT NULL,
  external_short_id TEXT,
  order_id UUID REFERENCES public.orders(id),
  status TEXT DEFAULT 'PLACED',
  customer_name TEXT,
  customer_phone TEXT,
  customer_document TEXT,
  delivery_address JSONB,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_method TEXT,
  scheduled_to TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, provider, external_order_id)
);

-- Logs de marketplace
CREATE TABLE public.marketplace_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  event_type TEXT NOT NULL,
  endpoint TEXT,
  request_data JSONB,
  response_data JSONB,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MÓDULO: Bina Telefônica (Caller ID)
-- =============================================

CREATE TABLE public.caller_id_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  auto_popup BOOLEAN DEFAULT true,
  show_history BOOLEAN DEFAULT true,
  record_calls BOOLEAN DEFAULT false,
  hardware_port TEXT,
  hardware_model TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  customer_id UUID,
  call_type TEXT DEFAULT 'incoming', -- 'incoming', 'outgoing'
  duration_seconds INTEGER,
  was_answered BOOLEAN DEFAULT true,
  order_created BOOLEAN DEFAULT false,
  order_id UUID REFERENCES public.orders(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MÓDULO: SMS Marketing
-- =============================================

CREATE TABLE public.sms_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  provider TEXT DEFAULT 'twilio', -- 'twilio', 'zenvia', 'totalvoice'
  api_key TEXT,
  api_secret TEXT,
  sender_id TEXT,
  is_active BOOLEAN DEFAULT false,
  monthly_limit INTEGER DEFAULT 1000,
  messages_sent_this_month INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sms_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all', -- 'all', 'vip', 'inactive', 'birthday', 'custom'
  target_filter JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  total_recipients INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sms_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.sms_campaigns(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MÓDULO: Programa de Fidelidade
-- =============================================

CREATE TABLE public.loyalty_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  points_per_real NUMERIC DEFAULT 1, -- pontos por R$ gasto
  min_points_redemption INTEGER DEFAULT 100,
  points_expiry_days INTEGER DEFAULT 365,
  vip_threshold INTEGER DEFAULT 1000, -- pontos para virar VIP
  vip_discount_percent NUMERIC DEFAULT 10,
  welcome_points INTEGER DEFAULT 50,
  birthday_points INTEGER DEFAULT 100,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.loyalty_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  cpf TEXT,
  birth_date DATE,
  current_points INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_points_redeemed INTEGER DEFAULT 0,
  is_vip BOOLEAN DEFAULT false,
  vip_since TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.loyalty_customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  type TEXT NOT NULL, -- 'earn', 'redeem', 'expire', 'bonus', 'adjustment'
  points INTEGER NOT NULL,
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MÓDULO: Cupons de Desconto Avançado
-- =============================================

-- Já existe tabela coupons, vamos adicionar campos extras
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS applies_to TEXT DEFAULT 'all', -- 'all', 'category', 'product', 'first_order'
ADD COLUMN IF NOT EXISTS applies_to_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS customer_limit INTEGER, -- limite por cliente
ADD COLUMN IF NOT EXISTS customer_usage JSONB DEFAULT '{}', -- {customer_phone: count}
ADD COLUMN IF NOT EXISTS min_items INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS schedule JSONB, -- {days: [0-6], start_time: '18:00', end_time: '23:00'}
ADD COLUMN IF NOT EXISTS stackable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN DEFAULT false;

-- =============================================
-- MÓDULO: Disparador Inteligente (WhatsApp/SMS)
-- =============================================

CREATE TABLE public.dispatcher_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_api_token TEXT,
  whatsapp_phone_id TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.dispatcher_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'order_confirmed', 'order_preparing', 'order_ready', 'order_delivered', 'abandoned_cart', 'review_request', 'birthday', 'inactive_customer'
  delay_minutes INTEGER DEFAULT 0,
  message_template TEXT NOT NULL,
  channel TEXT DEFAULT 'whatsapp', -- 'whatsapp', 'sms', 'both'
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.dispatcher_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.dispatcher_triggers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id),
  customer_phone TEXT NOT NULL,
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
  external_id TEXT,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MÓDULO: Multi Lojas
-- =============================================

CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- código interno
  type TEXT DEFAULT 'branch', -- 'headquarters', 'branch', 'franchise'
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_headquarters BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  business_hours JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Vincular pedidos à loja
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Vincular produtos à loja (permite preços diferentes por loja)
CREATE TABLE public.store_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_override NUMERIC,
  is_available BOOLEAN DEFAULT true,
  stock_quantity NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, product_id)
);

-- =============================================
-- MÓDULO: Comanda Mobile
-- =============================================

CREATE TABLE public.mobile_command_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  require_table BOOLEAN DEFAULT true,
  allow_split_payment BOOLEAN DEFAULT true,
  show_product_images BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mobile_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  device_id TEXT,
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MÓDULO: Painel de Senha
-- =============================================

CREATE TABLE public.password_panel_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  display_format TEXT DEFAULT 'numeric', -- 'numeric', 'alphanumeric'
  voice_enabled BOOLEAN DEFAULT true,
  voice_text TEXT DEFAULT 'Senha {number} pronta para retirada',
  display_timeout_seconds INTEGER DEFAULT 30,
  max_displayed INTEGER DEFAULT 5,
  reset_daily BOOLEAN DEFAULT true,
  current_number INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.password_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  password_number TEXT NOT NULL,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'preparing', 'ready', 'called', 'delivered'
  called_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MÓDULO: TEF PINPAD
-- =============================================

CREATE TABLE public.tef_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  provider TEXT, -- 'sitef', 'rede', 'stone', 'cielo', 'pagseguro'
  establishment_code TEXT,
  terminal_id TEXT,
  com_port TEXT,
  auto_capture BOOLEAN DEFAULT true,
  print_receipt BOOLEAN DEFAULT true,
  confirmation_required BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.tef_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  payment_id UUID REFERENCES public.payments(id),
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL, -- 'credit', 'debit', 'pix', 'voucher'
  installments INTEGER DEFAULT 1,
  card_brand TEXT,
  card_last4 TEXT,
  authorization_code TEXT,
  nsu TEXT,
  host_nsu TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'declined', 'cancelled', 'error'
  error_message TEXT,
  receipt_merchant TEXT,
  receipt_customer TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MÓDULO: Monitor de Preparos (KDS)
-- =============================================

CREATE TABLE public.kitchen_display_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  display_mode TEXT DEFAULT 'list', -- 'list', 'grid', 'kanban'
  auto_advance BOOLEAN DEFAULT true,
  alert_threshold_minutes INTEGER DEFAULT 15,
  show_customer_name BOOLEAN DEFAULT true,
  show_order_number BOOLEAN DEFAULT true,
  group_by_category BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.kitchen_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  categories UUID[] DEFAULT '{}', -- categorias de produtos para esta estação
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.kitchen_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.kitchen_stations(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'preparing', 'ready', 'served'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  bumped_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ÍNDICES E RLS
-- =============================================

-- Índices
CREATE INDEX IF NOT EXISTS idx_marketplace_integrations_tenant ON public.marketplace_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_tenant ON public.marketplace_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_provider ON public.marketplace_orders(tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant ON public.call_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON public.call_logs(tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_tenant ON public.sms_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_campaign ON public.sms_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone ON public.loyalty_customers(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_dispatcher_messages_tenant ON public.dispatcher_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stores_tenant ON public.stores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_password_queue_tenant ON public.password_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tef_transactions_tenant ON public.tef_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_order_items_order ON public.kitchen_order_items(order_id);

-- Enable RLS
ALTER TABLE public.marketplace_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_id_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatcher_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatcher_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatcher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_command_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_panel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tef_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tef_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_display_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies para todas as tabelas
-- Marketplace Integrations
CREATE POLICY "Admins can manage marketplace integrations" ON public.marketplace_integrations
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view marketplace integrations" ON public.marketplace_integrations
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Marketplace Orders
CREATE POLICY "Staff can view marketplace orders" ON public.marketplace_orders
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage marketplace orders" ON public.marketplace_orders
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- Marketplace Logs
CREATE POLICY "Admins can view marketplace logs" ON public.marketplace_logs
  FOR SELECT USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    has_role(auth.uid(), 'admin')
  );

-- Caller ID
CREATE POLICY "Admins can manage caller id config" ON public.caller_id_config
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view caller id config" ON public.caller_id_config
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can manage call logs" ON public.call_logs
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

-- SMS
CREATE POLICY "Admins can manage sms config" ON public.sms_config
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view sms config" ON public.sms_config
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage sms campaigns" ON public.sms_campaigns
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view sms campaigns" ON public.sms_campaigns
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can view sms messages" ON public.sms_messages
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Loyalty
CREATE POLICY "Admins can manage loyalty config" ON public.loyalty_config
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view loyalty config" ON public.loyalty_config
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can manage loyalty customers" ON public.loyalty_customers
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can manage loyalty transactions" ON public.loyalty_transactions
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Dispatcher
CREATE POLICY "Admins can manage dispatcher config" ON public.dispatcher_config
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view dispatcher config" ON public.dispatcher_config
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage dispatcher triggers" ON public.dispatcher_triggers
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view dispatcher triggers" ON public.dispatcher_triggers
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can view dispatcher messages" ON public.dispatcher_messages
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Stores
CREATE POLICY "Admins can manage stores" ON public.stores
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view stores" ON public.stores
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage store products" ON public.store_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_products.store_id 
      AND s.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

-- Mobile Command
CREATE POLICY "Admins can manage mobile command config" ON public.mobile_command_config
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view mobile command config" ON public.mobile_command_config
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can manage mobile sessions" ON public.mobile_sessions
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Password Panel
CREATE POLICY "Admins can manage password panel config" ON public.password_panel_config
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view password panel config" ON public.password_panel_config
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can manage password queue" ON public.password_queue
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

-- TEF
CREATE POLICY "Admins can manage tef config" ON public.tef_config
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view tef config" ON public.tef_config
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can manage tef transactions" ON public.tef_transactions
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Kitchen Display
CREATE POLICY "Admins can manage kitchen display config" ON public.kitchen_display_config
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view kitchen display config" ON public.kitchen_display_config
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage kitchen stations" ON public.kitchen_stations
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can view kitchen stations" ON public.kitchen_stations
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Kitchen staff can manage kitchen order items" ON public.kitchen_order_items
  FOR ALL USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR 
     has_role(auth.uid(), 'kitchen') OR has_role(auth.uid(), 'cashier'))
  );

-- Enable realtime for kitchen and password queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.password_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_order_items;

-- Update addon_modules implementation status
UPDATE public.addon_modules SET implementation_status = 'ready' WHERE slug IN (
  'integration_99food', 'integration_keeta', 'integration_bina',
  'integration_sms', 'loyalty_program', 'discount_coupons',
  'intelligent_dispatcher', 'multi_store', 'mobile_command',
  'password_panel', 'tef_integration', 'kitchen_monitor',
  'smart_delivery'
);