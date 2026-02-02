// Digital Service Ecosystem Types

// Enums
export type CustomerRegistrationType = 'simple' | 'complete';
export type ComandaStatus = 'open' | 'pending_payment' | 'paid' | 'closed' | 'cancelled';
export type ParticipantRole = 'titular' | 'guest';
export type ServiceCallType = 'waiter' | 'bill' | 'cash_payment' | 'assistance';
export type ServiceCallStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'escalated';
export type ExitStatus = 'pending' | 'approved' | 'denied';
export type CommissionTrigger = 'order_placed' | 'order_delivered' | 'bill_closed' | 'payment_received';
export type TicketStatus = 'available' | 'sold' | 'used' | 'cancelled' | 'expired';

// Customer Registration (KYC)
export interface CustomerRegistration {
  id: string;
  tenant_id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  registration_type: CustomerRegistrationType;
  cpf?: string;
  selfie_url?: string;
  document_url?: string;
  document_type?: 'rg' | 'cnh';
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;
  device_id?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
}

// Comanda (Table Session)
export interface Comanda {
  id: string;
  tenant_id: string;
  store_id?: string;
  table_id?: string;
  comanda_number: number;
  titular_customer_id?: string;
  expected_guests: number;
  actual_guests?: number;
  initial_waiter_id?: string;
  current_waiter_id?: string;
  status: ComandaStatus;
  opened_at: string;
  closed_at?: string;
  subtotal: number;
  service_fee: number;
  service_fee_percent: number;
  discount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  exit_validated: boolean;
  exit_validated_at?: string;
  exit_validated_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  titular_customer?: CustomerRegistration;
  table?: { id: string; number: number; name?: string };
  participants?: ComandaParticipant[];
  orders?: ComandaOrder[];
}

// Comanda Participant (Sub-comanda)
export interface ComandaParticipant {
  id: string;
  comanda_id: string;
  customer_id?: string;
  role: ParticipantRole;
  can_order: boolean;
  can_pay: boolean;
  can_view_total: boolean;
  authorized_by?: string;
  authorized_at?: string;
  requires_approval: boolean;
  invite_code?: string;
  invite_expires_at?: string;
  individual_subtotal: number;
  individual_paid: number;
  exit_qr_code?: string;
  exit_authorized: boolean;
  exit_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: CustomerRegistration;
}

// Comanda Order
export interface ComandaOrder {
  id: string;
  comanda_id: string;
  order_id?: string;
  participant_id?: string;
  ordered_by_customer_id?: string;
  ordered_by_waiter_id?: string;
  requires_waiter_approval: boolean;
  waiter_approved?: boolean;
  waiter_approved_at?: string;
  waiter_approved_by?: string;
  delivered_at?: string;
  delivered_by?: string;
  confirmed_by_customer: boolean;
  confirmed_at?: string;
  can_modify: boolean;
  can_cancel: boolean;
  modified_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  notes?: string;
  created_at: string;
}

// Comanda Payment
export interface ComandaPayment {
  id: string;
  comanda_id: string;
  participant_id?: string;
  payment_id?: string;
  amount: number;
  payment_method: string;
  payment_type: 'full' | 'partial' | 'split';
  requires_waiter_approval: boolean;
  waiter_approved?: boolean;
  waiter_approved_at?: string;
  waiter_approved_by?: string;
  status: 'pending' | 'approved' | 'completed' | 'refunded';
  completed_at?: string;
  split_participants?: string[];
  split_amounts?: Record<string, number>;
  notes?: string;
  created_at: string;
}

// Service Call
export interface ServiceCall {
  id: string;
  tenant_id: string;
  comanda_id?: string;
  table_id?: string;
  call_type: ServiceCallType;
  status: ServiceCallStatus;
  priority: number;
  customer_id?: string;
  assigned_waiter_id?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  escalated_at?: string;
  escalation_level: number;
  escalation_timeout_minutes: number;
  response_time_seconds?: number;
  notes?: string;
  created_at: string;
  // Relations
  customer?: CustomerRegistration;
  table?: { id: string; number: number; name?: string };
  comanda?: Comanda;
}

// Waiter Commission Config
export interface WaiterCommissionConfig {
  id: string;
  tenant_id: string;
  store_id?: string;
  is_enabled: boolean;
  commission_trigger: CommissionTrigger;
  base_percent: number;
  fixed_amount: number;
  split_mode: 'individual' | 'equal' | 'proportional';
  category_rates: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// Waiter Commission
export interface WaiterCommission {
  id: string;
  tenant_id: string;
  waiter_id: string;
  comanda_id?: string;
  order_id?: string;
  trigger_type: CommissionTrigger;
  base_amount: number;
  commission_percent?: number;
  commission_amount: number;
  is_split: boolean;
  split_with?: string[];
  split_percent?: number;
  status: 'pending' | 'approved' | 'paid';
  approved_at?: string;
  approved_by?: string;
  paid_at?: string;
  period_start?: string;
  period_end?: string;
  created_at: string;
}

// Waiter Performance
export interface WaiterPerformance {
  id: string;
  tenant_id: string;
  waiter_id: string;
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  orders_taken: number;
  orders_delivered: number;
  bills_closed: number;
  payments_received: number;
  avg_response_time?: number;
  avg_delivery_time?: number;
  calls_received: number;
  calls_resolved: number;
  calls_escalated: number;
  calls_ignored: number;
  total_sales: number;
  total_commissions: number;
  performance_score?: number;
  created_at: string;
  updated_at: string;
}

// Exit Validation
export interface ExitValidation {
  id: string;
  tenant_id: string;
  comanda_id: string;
  participant_id?: string;
  qr_code: string;
  status: ExitStatus;
  validated_at?: string;
  validated_by?: string;
  validation_method?: 'automatic' | 'waiter' | 'cashier' | 'admin';
  payment_verified: boolean;
  waiter_confirmed: boolean;
  cashier_confirmed: boolean;
  admin_override: boolean;
  denial_reason?: string;
  created_at: string;
}

// Event
export interface Event {
  id: string;
  tenant_id: string;
  store_id?: string;
  name: string;
  description?: string;
  image_url?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  ticket_price: number;
  couvert_price: number;
  total_capacity?: number;
  tickets_sold: number;
  tickets_available?: number;
  is_active: boolean;
  requires_full_registration: boolean;
  allow_refunds: boolean;
  refund_deadline_hours: number;
  created_at: string;
  updated_at: string;
}

// Ticket
export interface Ticket {
  id: string;
  tenant_id: string;
  event_id: string;
  customer_id?: string;
  ticket_code: string;
  ticket_type: 'entry' | 'couvert' | 'vip';
  price_paid: number;
  payment_id?: string;
  status: TicketStatus;
  validated_at?: string;
  validated_by?: string;
  refunded_at?: string;
  refund_amount?: number;
  created_at: string;
  // Relations
  event?: Event;
  customer?: CustomerRegistration;
}

// Global Config (Super Admin)
export interface DigitalServiceGlobalConfig {
  id: string;
  kyc_required_for_ordering: boolean;
  kyc_required_for_payment: boolean;
  kyc_required_for_modification: boolean;
  kyc_required_for_exit: boolean;
  kyc_require_selfie: boolean;
  kyc_require_document: boolean;
  default_order_requires_waiter: boolean;
  default_payment_requires_waiter: boolean;
  default_exit_requires_waiter: boolean;
  default_exit_requires_cashier: boolean;
  default_call_timeout_minutes: number;
  default_escalation_levels: number;
  created_at: string;
  updated_at: string;
}

// Tenant Config
export interface TenantServiceConfig {
  id: string;
  tenant_id: string;
  allow_customer_ordering: boolean;
  order_requires_waiter_approval: boolean;
  allow_order_modification: boolean;
  allow_order_cancellation: boolean;
  modification_deadline_minutes: number;
  allow_customer_payment: boolean;
  payment_requires_waiter_approval: boolean;
  allow_partial_payment: boolean;
  allow_split_payment: boolean;
  block_payment_until_orders_complete: boolean;
  allow_subcomanda: boolean;
  subcomanda_requires_titular_approval: boolean;
  subcomanda_requires_waiter_approval: boolean;
  exit_control_enabled: boolean;
  exit_requires_full_payment: boolean;
  exit_validation_method: 'automatic' | 'waiter' | 'cashier' | 'both' | 'admin';
  allow_waiter_change: boolean;
  waiter_change_requires_approval: boolean;
  notify_waiter: boolean;
  notify_kitchen: boolean;
  notify_bar: boolean;
  notify_cashier: boolean;
  service_fee_percent: number;
  service_fee_optional: boolean;
  created_at: string;
  updated_at: string;
}

// Comanda History (Audit)
export interface ComandaHistory {
  id: string;
  comanda_id: string;
  action: string;
  actor_type: 'customer' | 'waiter' | 'cashier' | 'admin' | 'system';
  actor_id?: string;
  actor_name?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

// Service Call Labels
export const SERVICE_CALL_TYPE_LABELS: Record<ServiceCallType, string> = {
  waiter: 'Chamar Garçom',
  bill: 'Fechar Conta',
  cash_payment: 'Pagar em Dinheiro',
  assistance: 'Solicitar Ajuda',
};

export const SERVICE_CALL_STATUS_LABELS: Record<ServiceCallStatus, string> = {
  pending: 'Pendente',
  acknowledged: 'Recebido',
  in_progress: 'Em Atendimento',
  resolved: 'Resolvido',
  escalated: 'Escalado',
};

export const COMANDA_STATUS_LABELS: Record<ComandaStatus, string> = {
  open: 'Aberta',
  pending_payment: 'Aguardando Pagamento',
  paid: 'Paga',
  closed: 'Fechada',
  cancelled: 'Cancelada',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  available: 'Disponível',
  sold: 'Vendido',
  used: 'Utilizado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};
