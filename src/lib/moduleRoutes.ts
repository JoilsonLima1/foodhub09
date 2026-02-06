/**
 * Module Routes Map
 * 
 * SINGLE SOURCE OF TRUTH for all addon module routing in the sidebar.
 * Maps module slugs to their labels, icons, and routes.
 */

import {
  Truck,
  ChefHat,
  Smartphone,
  KeyRound,
  MessageSquare,
  Gift,
  Tag,
  Zap,
  Building2,
  CreditCard,
  Phone,
  UtensilsCrossed,
  Store,
  LucideIcon,
  Receipt,
  CalendarDays,
  QrCode,
  User,
  Shield,
  ShoppingCart,
  Users,
  DoorOpen,
  MapPinCheck,
  BellRing,
  Award,
  Ticket,
  TrendingUp,
} from 'lucide-react';

export interface ModuleRouteConfig {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Route to use the module (null if no direct page) */
  routeUse: string | null;
  /** Route to configure the module */
  routeConfig: string;
  /** Category for grouping in sidebar */
  category: 'operations' | 'marketing' | 'integrations' | 'management' | 'digital_service' | 'payment' | 'access_control';
  /** If true, module requires initial setup before use */
  requiresSetup?: boolean;
  /** Routes controlled by this module (for gating) */
  controlledRoutes?: string[];
  /** Components/features controlled by this module */
  controlledFeatures?: string[];
}

/**
 * Complete map of all addon modules with their routing configuration.
 * Order defines display order within each category.
 */
export const MODULE_ROUTES: Record<string, ModuleRouteConfig> = {
  // =====================================================
  // OPERATIONS
  // =====================================================
  smart_delivery: {
    slug: 'smart_delivery',
    label: 'Smart Delivery',
    icon: Truck,
    routeUse: '/deliveries',
    routeConfig: '/settings?tab=modules&panel=smart_delivery',
    category: 'operations',
    controlledRoutes: ['/deliveries'],
    controlledFeatures: ['delivery_management', 'delivery_zones'],
  },
  kitchen_monitor: {
    slug: 'kitchen_monitor',
    label: 'Monitor de Cozinha',
    icon: ChefHat,
    routeUse: '/kitchen',
    routeConfig: '/settings?tab=modules&panel=kitchen_monitor',
    category: 'operations',
    controlledRoutes: ['/kitchen'],
    controlledFeatures: ['kitchen_display'],
  },
  mobile_command: {
    slug: 'mobile_command',
    label: 'Comanda Mobile',
    icon: Smartphone,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=mobile_command',
    category: 'operations',
    requiresSetup: true,
    controlledFeatures: ['mobile_app_waiter'],
  },
  password_panel: {
    slug: 'password_panel',
    label: 'Painel de Senha',
    icon: KeyRound,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=password_panel',
    category: 'operations',
    requiresSetup: true,
    controlledFeatures: ['password_display'],
  },
  comandas: {
    slug: 'comandas',
    label: 'Comandas Digitais',
    icon: Receipt,
    routeUse: '/comandas',
    routeConfig: '/settings?tab=service',
    category: 'operations',
    controlledRoutes: ['/comandas'],
    controlledFeatures: ['comandas', 'table_sessions'],
  },
  events_tickets: {
    slug: 'events_tickets',
    label: 'Eventos & Ingressos',
    icon: CalendarDays,
    routeUse: '/events',
    routeConfig: '/settings?tab=modules&panel=events_tickets',
    category: 'operations',
    controlledRoutes: ['/events'],
    controlledFeatures: ['events', 'tickets', 'ticket_validation'],
  },
  waiter_commissions: {
    slug: 'waiter_commissions',
    label: 'Comissões de Garçom',
    icon: Award,
    routeUse: null,
    routeConfig: '/settings?tab=waiters',
    category: 'operations',
    controlledFeatures: ['waiter_commissions', 'waiter_performance'],
  },

  // =====================================================
  // MARKETING
  // =====================================================
  sms_marketing: {
    slug: 'sms_marketing',
    label: 'SMS Marketing',
    icon: MessageSquare,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=sms_marketing',
    category: 'marketing',
    requiresSetup: true,
    controlledFeatures: ['sms_campaigns'],
  },
  loyalty_program: {
    slug: 'loyalty_program',
    label: 'Programa de Fidelidade',
    icon: Gift,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=loyalty_program',
    category: 'marketing',
    controlledFeatures: ['loyalty_points', 'rewards'],
  },
  discount_coupons: {
    slug: 'discount_coupons',
    label: 'Cupons de Desconto',
    icon: Tag,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=discount_coupons',
    category: 'marketing',
    controlledFeatures: ['coupons'],
  },
  intelligent_dispatcher: {
    slug: 'intelligent_dispatcher',
    label: 'Disparador Inteligente',
    icon: Zap,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=intelligent_dispatcher',
    category: 'marketing',
    requiresSetup: true,
    controlledFeatures: ['automated_messages', 'whatsapp_integration'],
  },
  marketing_ceo: {
    slug: 'marketing_ceo',
    label: 'CEO de Marketing',
    icon: TrendingUp,
    routeUse: '/marketing',
    routeConfig: '/settings?tab=modules&panel=marketing_ceo',
    category: 'marketing',
    controlledRoutes: ['/marketing'],
    controlledFeatures: ['seo_management', 'sitemap', 'robots_txt', 'search_console'],
  },

  // =====================================================
  // INTEGRATIONS
  // =====================================================
  integration_99food: {
    slug: 'integration_99food',
    label: '99Food',
    icon: UtensilsCrossed,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=integration_99food',
    category: 'integrations',
    requiresSetup: true,
    controlledFeatures: ['99food_orders'],
  },
  integration_keeta: {
    slug: 'integration_keeta',
    label: 'Keeta',
    icon: Store,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=integration_keeta',
    category: 'integrations',
    requiresSetup: true,
    controlledFeatures: ['keeta_orders'],
  },
  integration_bina: {
    slug: 'integration_bina',
    label: 'Bina Caller ID',
    icon: Phone,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=integration_bina',
    category: 'integrations',
    requiresSetup: true,
    controlledFeatures: ['caller_id'],
  },
  tef_integration: {
    slug: 'tef_integration',
    label: 'TEF - Maquininha',
    icon: CreditCard,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=tef_integration',
    category: 'integrations',
    requiresSetup: true,
    controlledFeatures: ['tef_payments'],
  },

  // =====================================================
  // MANAGEMENT
  // =====================================================
  multi_store: {
    slug: 'multi_store',
    label: 'Multi Lojas',
    icon: Building2,
    routeUse: '/stores',
    routeConfig: '/settings?tab=modules&panel=multi_store',
    category: 'management',
    controlledRoutes: ['/stores'],
    controlledFeatures: ['multi_branch', 'store_management'],
  },

  // =====================================================
  // DIGITAL SERVICE (Atendimento Digital)
  // =====================================================
  client_app_basic: {
    slug: 'client_app_basic',
    label: 'App Cliente Básico',
    icon: User,
    routeUse: null,
    routeConfig: '/settings?tab=service',
    category: 'digital_service',
    controlledRoutes: ['/menu', '/track-order'],
    controlledFeatures: ['public_menu', 'order_tracking', 'customer_registration'],
  },
  client_ordering: {
    slug: 'client_ordering',
    label: 'Pedido pelo App',
    icon: ShoppingCart,
    routeUse: null,
    routeConfig: '/settings?tab=service',
    category: 'digital_service',
    controlledFeatures: ['client_checkout', 'cart', 'self_ordering'],
  },
  sub_tabs_split_bill: {
    slug: 'sub_tabs_split_bill',
    label: 'Subcomanda & Divisão',
    icon: Users,
    routeUse: null,
    routeConfig: '/settings?tab=service',
    category: 'digital_service',
    controlledFeatures: ['subcomandas', 'split_bill', 'companions'],
  },
  call_waiter_close_bill: {
    slug: 'call_waiter_close_bill',
    label: 'Chamar Garçom & Fechar Conta',
    icon: BellRing,
    routeUse: null,
    routeConfig: '/settings?tab=service',
    category: 'digital_service',
    controlledFeatures: ['service_calls', 'close_bill_request', 'escalation'],
  },

  // =====================================================
  // PAYMENT (Pagamentos)
  // =====================================================
  pix_qr_waiter: {
    slug: 'pix_qr_waiter',
    label: 'PIX QR Garçom',
    icon: QrCode,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=pix_qr_waiter',
    category: 'payment',
    requiresSetup: true,
    controlledFeatures: ['pix_dynamic_qr', 'waiter_pix'],
  },

  // =====================================================
  // ACCESS CONTROL (Controle de Acesso)
  // =====================================================
  kyc_advanced: {
    slug: 'kyc_advanced',
    label: 'Verificação Avançada (KYC)',
    icon: Shield,
    routeUse: null,
    routeConfig: '/settings?tab=service',
    category: 'access_control',
    controlledFeatures: ['kyc_selfie', 'kyc_document', 'kyc_cpf'],
  },
  exit_qr_gate: {
    slug: 'exit_qr_gate',
    label: 'Controle de Saída (QR Gate)',
    icon: DoorOpen,
    routeUse: null,
    routeConfig: '/settings?tab=service',
    category: 'access_control',
    controlledFeatures: ['exit_validation', 'gate_control'],
  },
  tickets_cover: {
    slug: 'tickets_cover',
    label: 'Ingressos & Couvert',
    icon: Ticket,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=tickets_cover',
    category: 'access_control',
    controlledFeatures: ['ticket_sales', 'cover_charge', 'entry_validation'],
  },
  delivery_confirmation: {
    slug: 'delivery_confirmation',
    label: 'Confirmação de Entrega',
    icon: MapPinCheck,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=delivery_confirmation',
    category: 'operations',
    controlledFeatures: ['delivery_qr', 'delivery_nfc', 'delivery_photo'],
  },
};

/**
 * Get module config by slug
 */
export function getModuleConfig(slug: string): ModuleRouteConfig | undefined {
  return MODULE_ROUTES[slug];
}

/**
 * Get all modules grouped by category
 */
export function getModulesByCategory(): Record<string, ModuleRouteConfig[]> {
  const grouped: Record<string, ModuleRouteConfig[]> = {
    operations: [],
    marketing: [],
    integrations: [],
    management: [],
    digital_service: [],
    payment: [],
    access_control: [],
  };

  Object.values(MODULE_ROUTES).forEach((config) => {
    if (grouped[config.category]) {
      grouped[config.category].push(config);
    }
  });

  return grouped;
}

/**
 * Category labels for display
 */
export const MODULE_CATEGORY_LABELS: Record<string, string> = {
  operations: 'Operação',
  marketing: 'Marketing',
  integrations: 'Integrações',
  management: 'Gestão',
  digital_service: 'Atendimento Digital',
  payment: 'Pagamentos',
  access_control: 'Controle de Acesso',
};

/**
 * Find which module controls a specific route
 */
export function getModuleForRoute(route: string): ModuleRouteConfig | undefined {
  return Object.values(MODULE_ROUTES).find(
    (config) => config.controlledRoutes?.some((r) => route.startsWith(r))
  );
}

/**
 * Find which module controls a specific feature
 */
export function getModuleForFeature(feature: string): ModuleRouteConfig | undefined {
  return Object.values(MODULE_ROUTES).find(
    (config) => config.controlledFeatures?.includes(feature)
  );
}

/**
 * Get all routes controlled by modules (for gating)
 */
export function getAllControlledRoutes(): string[] {
  const routes: string[] = [];
  Object.values(MODULE_ROUTES).forEach((config) => {
    if (config.controlledRoutes) {
      routes.push(...config.controlledRoutes);
    }
  });
  return routes;
}
