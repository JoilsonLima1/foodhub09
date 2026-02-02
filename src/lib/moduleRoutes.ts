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
  category: 'operations' | 'marketing' | 'integrations' | 'management';
  /** If true, module requires initial setup before use */
  requiresSetup?: boolean;
}

/**
 * Complete map of all addon modules with their routing configuration.
 * Order defines display order within each category.
 */
export const MODULE_ROUTES: Record<string, ModuleRouteConfig> = {
  // Operations
  smart_delivery: {
    slug: 'smart_delivery',
    label: 'Smart Delivery',
    icon: Truck,
    routeUse: '/deliveries',
    routeConfig: '/settings?tab=modules&panel=smart_delivery',
    category: 'operations',
  },
  kitchen_monitor: {
    slug: 'kitchen_monitor',
    label: 'Monitor de Cozinha',
    icon: ChefHat,
    routeUse: '/kitchen',
    routeConfig: '/settings?tab=modules&panel=kitchen_monitor',
    category: 'operations',
  },
  mobile_command: {
    slug: 'mobile_command',
    label: 'Comanda Mobile',
    icon: Smartphone,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=mobile_command',
    category: 'operations',
    requiresSetup: true,
  },
  password_panel: {
    slug: 'password_panel',
    label: 'Painel de Senha',
    icon: KeyRound,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=password_panel',
    category: 'operations',
    requiresSetup: true,
  },

  // Marketing
  sms_marketing: {
    slug: 'sms_marketing',
    label: 'SMS Marketing',
    icon: MessageSquare,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=sms_marketing',
    category: 'marketing',
    requiresSetup: true,
  },
  loyalty_program: {
    slug: 'loyalty_program',
    label: 'Programa de Fidelidade',
    icon: Gift,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=loyalty_program',
    category: 'marketing',
  },
  discount_coupons: {
    slug: 'discount_coupons',
    label: 'Cupons de Desconto',
    icon: Tag,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=discount_coupons',
    category: 'marketing',
  },
  intelligent_dispatcher: {
    slug: 'intelligent_dispatcher',
    label: 'Disparador Inteligente',
    icon: Zap,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=intelligent_dispatcher',
    category: 'marketing',
    requiresSetup: true,
  },

  // Integrations
  integration_99food: {
    slug: 'integration_99food',
    label: '99Food',
    icon: UtensilsCrossed,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=integration_99food',
    category: 'integrations',
    requiresSetup: true,
  },
  integration_keeta: {
    slug: 'integration_keeta',
    label: 'Keeta',
    icon: Store,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=integration_keeta',
    category: 'integrations',
    requiresSetup: true,
  },
  integration_bina: {
    slug: 'integration_bina',
    label: 'Bina Caller ID',
    icon: Phone,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=integration_bina',
    category: 'integrations',
    requiresSetup: true,
  },
  tef_integration: {
    slug: 'tef_integration',
    label: 'TEF - Maquininha',
    icon: CreditCard,
    routeUse: null,
    routeConfig: '/settings?tab=modules&panel=tef_integration',
    category: 'integrations',
    requiresSetup: true,
  },

  // Management
  multi_store: {
    slug: 'multi_store',
    label: 'Multi Lojas',
    icon: Building2,
    routeUse: '/stores',
    routeConfig: '/settings?tab=modules&panel=multi_store',
    category: 'management',
  },
  comandas: {
    slug: 'comandas',
    label: 'Comandas',
    icon: Receipt,
    routeUse: '/comandas',
    routeConfig: '/settings?tab=service',
    category: 'operations',
  },
  events_tickets: {
    slug: 'events_tickets',
    label: 'Eventos & Ingressos',
    icon: CalendarDays,
    routeUse: '/events',
    routeConfig: '/settings?tab=modules&panel=events_tickets',
    category: 'operations',
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
  };

  Object.values(MODULE_ROUTES).forEach((config) => {
    grouped[config.category].push(config);
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
};
