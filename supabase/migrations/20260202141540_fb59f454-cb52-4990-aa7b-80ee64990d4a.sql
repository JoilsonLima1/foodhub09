-- =============================================
-- DIGITAL SERVICE ECOSYSTEM - COMPLETE SCHEMA
-- =============================================

-- =============================================
-- 1) ENUMS
-- =============================================

CREATE TYPE public.customer_registration_type AS ENUM ('simple', 'complete');
CREATE TYPE public.comanda_status AS ENUM ('open', 'pending_payment', 'paid', 'closed', 'cancelled');
CREATE TYPE public.participant_role AS ENUM ('titular', 'guest');
CREATE TYPE public.service_call_type AS ENUM ('waiter', 'bill', 'cash_payment', 'assistance');
CREATE TYPE public.service_call_status AS ENUM ('pending', 'acknowledged', 'in_progress', 'resolved', 'escalated');
CREATE TYPE public.exit_status AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE public.commission_trigger AS ENUM ('order_placed', 'order_delivered', 'bill_closed', 'payment_received');
CREATE TYPE public.ticket_status AS ENUM ('available', 'sold', 'used', 'cancelled', 'expired');

-- =============================================
-- 2) CUSTOMER REGISTRATIONS (KYC)
-- =============================================

CREATE TABLE public.customer_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Basic info (simple registration)
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  
  -- Complete registration (KYC)
  registration_type customer_registration_type DEFAULT 'simple',
  cpf TEXT,
  selfie_url TEXT,
  document_url TEXT,
  document_type TEXT, -- 'rg' or 'cnh'
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  verification_notes TEXT,
  
  -- Metadata
  device_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customer_registrations_tenant ON public.customer_registrations(tenant_id);
CREATE INDEX idx_customer_registrations_phone ON public.customer_registrations(phone);
CREATE INDEX idx_customer_registrations_cpf ON public.customer_registrations(cpf);

-- =============================================
-- 3) COMANDAS (TABLE SESSIONS)
-- =============================================

CREATE TABLE public.comandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  
  -- Identification
  comanda_number SERIAL,
  
  -- Customer info
  titular_customer_id UUID REFERENCES public.customer_registrations(id),
  expected_guests INTEGER DEFAULT 1,
  actual_guests INTEGER,
  
  -- Waiter assignment
  initial_waiter_id UUID REFERENCES public.couriers(id), -- Using couriers table for waiters
  current_waiter_id UUID REFERENCES public.couriers(id),
  
  -- Status
  status comanda_status DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  
  -- Financial
  subtotal NUMERIC(10,2) DEFAULT 0,
  service_fee NUMERIC(10,2) DEFAULT 0,
  service_fee_percent NUMERIC(5,2) DEFAULT 10,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  pending_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Exit control
  exit_validated BOOLEAN DEFAULT FALSE,
  exit_validated_at TIMESTAMPTZ,
  exit_validated_by UUID REFERENCES auth.users(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comandas_tenant ON public.comandas(tenant_id);
CREATE INDEX idx_comandas_table ON public.comandas(table_id);
CREATE INDEX idx_comandas_status ON public.comandas(status);
CREATE INDEX idx_comandas_opened ON public.comandas(opened_at);

-- =============================================
-- 4) COMANDA PARTICIPANTS (SUB-COMANDAS)
-- =============================================

CREATE TABLE public.comanda_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customer_registrations(id),
  
  -- Role and permissions
  role participant_role DEFAULT 'guest',
  can_order BOOLEAN DEFAULT FALSE,
  can_pay BOOLEAN DEFAULT FALSE,
  can_view_total BOOLEAN DEFAULT TRUE,
  
  -- Authorization
  authorized_by UUID REFERENCES public.customer_registrations(id),
  authorized_at TIMESTAMPTZ,
  requires_approval BOOLEAN DEFAULT TRUE,
  
  -- QR Code for joining
  invite_code TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  
  -- Individual consumption
  individual_subtotal NUMERIC(10,2) DEFAULT 0,
  individual_paid NUMERIC(10,2) DEFAULT 0,
  
  -- Exit control
  exit_qr_code TEXT UNIQUE,
  exit_authorized BOOLEAN DEFAULT FALSE,
  exit_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comanda_participants_comanda ON public.comanda_participants(comanda_id);
CREATE INDEX idx_comanda_participants_customer ON public.comanda_participants(customer_id);

-- =============================================
-- 5) COMANDA ORDERS (ITEMS)
-- =============================================

CREATE TABLE public.comanda_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES public.comanda_participants(id),
  
  -- Who made the order
  ordered_by_customer_id UUID REFERENCES public.customer_registrations(id),
  ordered_by_waiter_id UUID REFERENCES public.couriers(id),
  
  -- Workflow
  requires_waiter_approval BOOLEAN DEFAULT FALSE,
  waiter_approved BOOLEAN,
  waiter_approved_at TIMESTAMPTZ,
  waiter_approved_by UUID REFERENCES public.couriers(id),
  
  -- Delivery confirmation
  delivered_at TIMESTAMPTZ,
  delivered_by UUID REFERENCES public.couriers(id),
  confirmed_by_customer BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  
  -- Modification tracking
  can_modify BOOLEAN DEFAULT TRUE,
  can_cancel BOOLEAN DEFAULT TRUE,
  modified_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comanda_orders_comanda ON public.comanda_orders(comanda_id);

-- =============================================
-- 6) COMANDA PAYMENTS
-- =============================================

CREATE TABLE public.comanda_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.comanda_participants(id),
  payment_id UUID REFERENCES public.payments(id),
  
  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_type TEXT DEFAULT 'full', -- 'full', 'partial', 'split'
  
  -- Workflow
  requires_waiter_approval BOOLEAN DEFAULT FALSE,
  waiter_approved BOOLEAN,
  waiter_approved_at TIMESTAMPTZ,
  waiter_approved_by UUID REFERENCES public.couriers(id),
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'refunded'
  completed_at TIMESTAMPTZ,
  
  -- For split payments
  split_participants UUID[] DEFAULT '{}',
  split_amounts JSONB,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comanda_payments_comanda ON public.comanda_payments(comanda_id);

-- =============================================
-- 7) SERVICE CALLS (WAITER CALLS)
-- =============================================

CREATE TABLE public.service_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.tables(id),
  
  -- Call details
  call_type service_call_type NOT NULL,
  status service_call_status DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  
  -- Customer who called
  customer_id UUID REFERENCES public.customer_registrations(id),
  
  -- Assignment
  assigned_waiter_id UUID REFERENCES public.couriers(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  -- Escalation
  escalated_at TIMESTAMPTZ,
  escalation_level INTEGER DEFAULT 0,
  escalation_timeout_minutes INTEGER DEFAULT 5,
  
  -- Response time tracking
  response_time_seconds INTEGER,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_service_calls_tenant ON public.service_calls(tenant_id);
CREATE INDEX idx_service_calls_status ON public.service_calls(status);
CREATE INDEX idx_service_calls_waiter ON public.service_calls(assigned_waiter_id);

-- =============================================
-- 8) WAITER COMMISSIONS
-- =============================================

CREATE TABLE public.waiter_commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  
  -- Commission settings
  is_enabled BOOLEAN DEFAULT FALSE,
  commission_trigger commission_trigger DEFAULT 'bill_closed',
  
  -- Rates
  base_percent NUMERIC(5,2) DEFAULT 0,
  fixed_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Split rules
  split_mode TEXT DEFAULT 'individual', -- 'individual', 'equal', 'proportional'
  
  -- Category-specific rates
  category_rates JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, store_id)
);

CREATE TABLE public.waiter_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  waiter_id UUID REFERENCES public.couriers(id) ON DELETE CASCADE NOT NULL,
  comanda_id UUID REFERENCES public.comandas(id),
  order_id UUID REFERENCES public.orders(id),
  
  -- Commission details
  trigger_type commission_trigger NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL,
  commission_percent NUMERIC(5,2),
  commission_amount NUMERIC(10,2) NOT NULL,
  
  -- Split info
  is_split BOOLEAN DEFAULT FALSE,
  split_with UUID[] DEFAULT '{}',
  split_percent NUMERIC(5,2),
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid'
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  
  period_start DATE,
  period_end DATE,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_waiter_commissions_waiter ON public.waiter_commissions(waiter_id);
CREATE INDEX idx_waiter_commissions_period ON public.waiter_commissions(period_start, period_end);

-- =============================================
-- 9) WAITER PERFORMANCE
-- =============================================

CREATE TABLE public.waiter_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  waiter_id UUID REFERENCES public.couriers(id) ON DELETE CASCADE NOT NULL,
  
  -- Period
  period_date DATE NOT NULL,
  period_type TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  
  -- Metrics
  orders_taken INTEGER DEFAULT 0,
  orders_delivered INTEGER DEFAULT 0,
  bills_closed INTEGER DEFAULT 0,
  payments_received INTEGER DEFAULT 0,
  
  -- Response times (averages in seconds)
  avg_response_time INTEGER,
  avg_delivery_time INTEGER,
  
  -- Calls
  calls_received INTEGER DEFAULT 0,
  calls_resolved INTEGER DEFAULT 0,
  calls_escalated INTEGER DEFAULT 0,
  calls_ignored INTEGER DEFAULT 0,
  
  -- Revenue
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_commissions NUMERIC(10,2) DEFAULT 0,
  
  -- Score (0-100)
  performance_score NUMERIC(5,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(waiter_id, period_date, period_type)
);

CREATE INDEX idx_waiter_performance_waiter ON public.waiter_performance(waiter_id);
CREATE INDEX idx_waiter_performance_date ON public.waiter_performance(period_date);

-- =============================================
-- 10) EXIT CONTROL
-- =============================================

CREATE TABLE public.exit_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.comanda_participants(id),
  
  -- QR Code
  qr_code TEXT UNIQUE NOT NULL,
  
  -- Validation
  status exit_status DEFAULT 'pending',
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),
  validation_method TEXT, -- 'automatic', 'waiter', 'cashier', 'admin'
  
  -- Requirements check
  payment_verified BOOLEAN DEFAULT FALSE,
  waiter_confirmed BOOLEAN DEFAULT FALSE,
  cashier_confirmed BOOLEAN DEFAULT FALSE,
  admin_override BOOLEAN DEFAULT FALSE,
  
  denial_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exit_validations_comanda ON public.exit_validations(comanda_id);
CREATE INDEX idx_exit_validations_qr ON public.exit_validations(qr_code);

-- =============================================
-- 11) EVENTS AND TICKETS
-- =============================================

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  
  -- Event details
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Schedule
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  -- Pricing
  ticket_price NUMERIC(10,2) NOT NULL,
  couvert_price NUMERIC(10,2) DEFAULT 0,
  
  -- Capacity
  total_capacity INTEGER,
  tickets_sold INTEGER DEFAULT 0,
  tickets_available INTEGER,
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  requires_full_registration BOOLEAN DEFAULT TRUE,
  allow_refunds BOOLEAN DEFAULT FALSE,
  refund_deadline_hours INTEGER DEFAULT 24,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_tenant ON public.events(tenant_id);
CREATE INDEX idx_events_date ON public.events(event_date);

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customer_registrations(id),
  
  -- Ticket details
  ticket_code TEXT UNIQUE NOT NULL,
  ticket_type TEXT DEFAULT 'entry', -- 'entry', 'couvert', 'vip'
  price_paid NUMERIC(10,2) NOT NULL,
  
  -- Payment
  payment_id UUID REFERENCES public.payments(id),
  
  -- Status
  status ticket_status DEFAULT 'sold',
  
  -- Validation
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),
  
  -- Refund
  refunded_at TIMESTAMPTZ,
  refund_amount NUMERIC(10,2),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tickets_event ON public.tickets(event_id);
CREATE INDEX idx_tickets_customer ON public.tickets(customer_id);
CREATE INDEX idx_tickets_code ON public.tickets(ticket_code);

-- =============================================
-- 12) CONFIGURATION TABLES
-- =============================================

-- Super Admin global configuration
CREATE TABLE public.digital_service_global_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- KYC Requirements (which features require complete registration)
  kyc_required_for_ordering BOOLEAN DEFAULT FALSE,
  kyc_required_for_payment BOOLEAN DEFAULT TRUE,
  kyc_required_for_modification BOOLEAN DEFAULT FALSE,
  kyc_required_for_exit BOOLEAN DEFAULT FALSE,
  kyc_require_selfie BOOLEAN DEFAULT FALSE,
  kyc_require_document BOOLEAN DEFAULT TRUE,
  
  -- Default workflow settings
  default_order_requires_waiter BOOLEAN DEFAULT FALSE,
  default_payment_requires_waiter BOOLEAN DEFAULT FALSE,
  default_exit_requires_waiter BOOLEAN DEFAULT TRUE,
  default_exit_requires_cashier BOOLEAN DEFAULT FALSE,
  
  -- Escalation defaults
  default_call_timeout_minutes INTEGER DEFAULT 5,
  default_escalation_levels INTEGER DEFAULT 2,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant-specific configuration
CREATE TABLE public.tenant_service_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Order workflow
  allow_customer_ordering BOOLEAN DEFAULT TRUE,
  order_requires_waiter_approval BOOLEAN DEFAULT FALSE,
  allow_order_modification BOOLEAN DEFAULT TRUE,
  allow_order_cancellation BOOLEAN DEFAULT TRUE,
  modification_deadline_minutes INTEGER DEFAULT 5,
  
  -- Payment workflow
  allow_customer_payment BOOLEAN DEFAULT TRUE,
  payment_requires_waiter_approval BOOLEAN DEFAULT FALSE,
  allow_partial_payment BOOLEAN DEFAULT TRUE,
  allow_split_payment BOOLEAN DEFAULT TRUE,
  block_payment_until_orders_complete BOOLEAN DEFAULT FALSE,
  
  -- Sub-comanda
  allow_subcomanda BOOLEAN DEFAULT TRUE,
  subcomanda_requires_titular_approval BOOLEAN DEFAULT TRUE,
  subcomanda_requires_waiter_approval BOOLEAN DEFAULT FALSE,
  
  -- Exit control
  exit_control_enabled BOOLEAN DEFAULT TRUE,
  exit_requires_full_payment BOOLEAN DEFAULT TRUE,
  exit_validation_method TEXT DEFAULT 'waiter', -- 'automatic', 'waiter', 'cashier', 'both', 'admin'
  
  -- Waiter assignment
  allow_waiter_change BOOLEAN DEFAULT FALSE,
  waiter_change_requires_approval BOOLEAN DEFAULT TRUE,
  
  -- Notifications (who receives)
  notify_waiter BOOLEAN DEFAULT TRUE,
  notify_kitchen BOOLEAN DEFAULT TRUE,
  notify_bar BOOLEAN DEFAULT FALSE,
  notify_cashier BOOLEAN DEFAULT FALSE,
  
  -- Service fee
  service_fee_percent NUMERIC(5,2) DEFAULT 10,
  service_fee_optional BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 13) COMANDA HISTORY (AUDIT LOG)
-- =============================================

CREATE TABLE public.comanda_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  
  action TEXT NOT NULL,
  actor_type TEXT NOT NULL, -- 'customer', 'waiter', 'cashier', 'admin', 'system'
  actor_id UUID,
  actor_name TEXT,
  
  details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comanda_history_comanda ON public.comanda_history(comanda_id);
CREATE INDEX idx_comanda_history_created ON public.comanda_history(created_at);

-- =============================================
-- 14) RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.customer_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_commission_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_service_global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_service_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_history ENABLE ROW LEVEL SECURITY;

-- Customer registrations policies
CREATE POLICY "Tenant users can view customer registrations"
ON public.customer_registrations FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can create customer registrations"
ON public.customer_registrations FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admin can update customer registrations"
ON public.customer_registrations FOR UPDATE
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- Comandas policies
CREATE POLICY "Tenant users can view comandas"
ON public.comandas FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can create comandas"
ON public.comandas FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can update comandas"
ON public.comandas FOR UPDATE
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- Comanda participants policies
CREATE POLICY "Tenant users can manage comanda participants"
ON public.comanda_participants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id 
    AND public.user_belongs_to_tenant(auth.uid(), c.tenant_id)
  )
);

-- Comanda orders policies
CREATE POLICY "Tenant users can manage comanda orders"
ON public.comanda_orders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id 
    AND public.user_belongs_to_tenant(auth.uid(), c.tenant_id)
  )
);

-- Comanda payments policies
CREATE POLICY "Tenant users can manage comanda payments"
ON public.comanda_payments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id 
    AND public.user_belongs_to_tenant(auth.uid(), c.tenant_id)
  )
);

-- Service calls policies
CREATE POLICY "Tenant users can manage service calls"
ON public.service_calls FOR ALL
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- Waiter commission config policies
CREATE POLICY "Admin can manage waiter commission config"
ON public.waiter_commission_config FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- Waiter commissions policies
CREATE POLICY "Tenant users can view waiter commissions"
ON public.waiter_commissions FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admin can manage waiter commissions"
ON public.waiter_commissions FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- Waiter performance policies
CREATE POLICY "Tenant users can view waiter performance"
ON public.waiter_performance FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- Exit validations policies
CREATE POLICY "Tenant users can manage exit validations"
ON public.exit_validations FOR ALL
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- Events policies
CREATE POLICY "Tenant users can view events"
ON public.events FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admin can manage events"
ON public.events FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- Tickets policies
CREATE POLICY "Tenant users can view tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can create tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admin can manage tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- Global config policies (super admin only)
CREATE POLICY "Super admin can manage global config"
ON public.digital_service_global_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Tenant service config policies
CREATE POLICY "Tenant users can view service config"
ON public.tenant_service_config FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admin can manage service config"
ON public.tenant_service_config FOR ALL
TO authenticated
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id) AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- Comanda history policies
CREATE POLICY "Tenant users can view comanda history"
ON public.comanda_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id 
    AND public.user_belongs_to_tenant(auth.uid(), c.tenant_id)
  )
);

CREATE POLICY "System can insert comanda history"
ON public.comanda_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id 
    AND public.user_belongs_to_tenant(auth.uid(), c.tenant_id)
  )
);

-- =============================================
-- 15) HELPER FUNCTIONS
-- =============================================

-- Generate unique QR code
CREATE OR REPLACE FUNCTION public.generate_unique_code(prefix TEXT DEFAULT '')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := prefix || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  RETURN v_code;
END;
$$;

-- Calculate comanda totals
CREATE OR REPLACE FUNCTION public.update_comanda_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal NUMERIC(10,2);
  v_service_fee NUMERIC(10,2);
  v_paid NUMERIC(10,2);
BEGIN
  -- Calculate subtotal from orders
  SELECT COALESCE(SUM(o.total), 0) INTO v_subtotal
  FROM public.comanda_orders co
  JOIN public.orders o ON o.id = co.order_id
  WHERE co.comanda_id = COALESCE(NEW.comanda_id, OLD.comanda_id)
  AND co.cancelled_at IS NULL;
  
  -- Calculate paid amount
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.comanda_payments
  WHERE comanda_id = COALESCE(NEW.comanda_id, OLD.comanda_id)
  AND status = 'completed';
  
  -- Update comanda
  UPDATE public.comandas
  SET 
    subtotal = v_subtotal,
    service_fee = v_subtotal * (service_fee_percent / 100),
    total = v_subtotal + (v_subtotal * (service_fee_percent / 100)) - discount,
    paid_amount = v_paid,
    pending_amount = (v_subtotal + (v_subtotal * (service_fee_percent / 100)) - discount) - v_paid,
    updated_at = now()
  WHERE id = COALESCE(NEW.comanda_id, OLD.comanda_id);
  
  RETURN NEW;
END;
$$;

-- Log comanda history
CREATE OR REPLACE FUNCTION public.log_comanda_action(
  p_comanda_id UUID,
  p_action TEXT,
  p_actor_type TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.comanda_history (
    comanda_id, action, actor_type, actor_id, actor_name, details
  ) VALUES (
    p_comanda_id, p_action, p_actor_type, p_actor_id, p_actor_name, p_details
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Update event tickets availability
CREATE OR REPLACE FUNCTION public.update_event_tickets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET 
    tickets_sold = (
      SELECT COUNT(*) FROM public.tickets 
      WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
      AND status IN ('sold', 'used')
    ),
    tickets_available = total_capacity - (
      SELECT COUNT(*) FROM public.tickets 
      WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
      AND status IN ('sold', 'used')
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER update_comanda_on_order_change
AFTER INSERT OR UPDATE OR DELETE ON public.comanda_orders
FOR EACH ROW EXECUTE FUNCTION public.update_comanda_totals();

CREATE TRIGGER update_comanda_on_payment_change
AFTER INSERT OR UPDATE OR DELETE ON public.comanda_payments
FOR EACH ROW EXECUTE FUNCTION public.update_comanda_totals();

CREATE TRIGGER update_event_on_ticket_change
AFTER INSERT OR UPDATE OR DELETE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_event_tickets();

-- Initialize global config
INSERT INTO public.digital_service_global_config (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.comandas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comanda_orders;