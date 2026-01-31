// Custom types that extend the auto-generated Supabase types

export type AppRole = 'admin' | 'manager' | 'cashier' | 'kitchen' | 'stock' | 'delivery' | 'super_admin';

export type OrderStatus = 
  | 'pending_payment' 
  | 'paid' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancelled';

export type OrderOrigin = 'online' | 'pos' | 'whatsapp' | 'ifood' | 'marketplace';

export type PaymentMethod = 'cash' | 'pix' | 'credit_card' | 'debit_card' | 'voucher' | 'mixed';

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_route' | 'delivered' | 'failed';

export type StockMovementType = 'entry' | 'exit' | 'adjustment' | 'reversal' | 'loss';

export type FraudAlertLevel = 'low' | 'medium' | 'high' | 'blocked';

export type PaymentProvider = 'stone_connect' | 'stone_tef' | 'stone_android' | 'cielo_lio' | 'pagbank' | 'manual';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

// User with profile and roles
export interface UserWithProfile {
  id: string;
  email: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    tenant_id: string | null;
    store_id: string | null;
    is_active: boolean;
  } | null;
  roles: AppRole[];
}

// Subscription plan with features
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  monthly_price: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  
  // Feature limits
  max_users: number;
  max_products: number;
  max_orders_per_month: number;
  
  // Feature toggles
  feature_pos: boolean;
  feature_kitchen_display: boolean;
  feature_delivery_management: boolean;
  feature_stock_control: boolean;
  feature_reports_basic: boolean;
  feature_reports_advanced: boolean;
  feature_ai_forecast: boolean;
  feature_multi_branch: boolean;
  feature_api_access: boolean;
  feature_white_label: boolean;
  feature_priority_support: boolean;
  feature_custom_integrations: boolean;
  feature_cmv_reports: boolean;
  feature_goal_notifications: boolean;
  feature_courier_app: boolean;
  feature_public_menu: boolean;
  
  created_at: string;
  updated_at: string;
}

// Subscription
export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

// Feature definition for UI
export interface PlanFeature {
  key: keyof SubscriptionPlan;
  label: string;
  description: string;
  type: 'boolean' | 'number';
  category: 'limits' | 'core' | 'reports' | 'advanced';
}

// Cart item for POS and Online Store
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addons: CartItemAddon[];
  notes?: string;
}

export interface CartItemAddon {
  id: string;
  addonId: string;
  addonName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Dashboard stats
export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  fraudAlerts: number;
}

// Product with relations
export interface ProductWithRelations {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  variations: {
    id: string;
    name: string;
    price_modifier: number;
  }[];
  addons: {
    id: string;
    name: string;
    price: number;
  }[];
  has_variations: boolean;
  has_addons: boolean;
  is_available: boolean;
}

// Order with relations
export interface OrderWithRelations {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: OrderStatus;
  origin: OrderOrigin;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  is_delivery: boolean;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  items: {
    id: string;
    product_name: string;
    variation_name: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string | null;
    addons: {
      addon_name: string;
      quantity: number;
      total_price: number;
    }[];
  }[];
}

// Ingredient with stock info
export interface IngredientWithStock {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  is_low_stock: boolean;
}

// Payment machine record for antifraud
export interface PaymentMachineRecordInput {
  nsu_doc: string;
  authorization_code: string;
  amount: number;
  card_brand?: string;
  card_last4?: string;
  card_type?: string;
  installments?: number;
  transaction_datetime: string;
  tid?: string;
  provider: PaymentProvider;
}

// Duplicate check result
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  alertLevel: FraudAlertLevel | null;
  matchedRecordId: string | null;
  matchReason: string | null;
}
