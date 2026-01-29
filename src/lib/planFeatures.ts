/**
 * Centralized Plan Feature Definitions
 * 
 * This is the SINGLE SOURCE OF TRUTH for all plan features.
 * All UI screens that display plan features MUST use this utility
 * to ensure consistency with Super Admin configuration.
 */

export interface PlanFeatureDefinition {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'number';
  category: 'limits' | 'core' | 'reports' | 'advanced';
}

/**
 * Complete list of all plan features in the system.
 * This must match the subscription_plans table columns.
 */
export const PLAN_FEATURE_DEFINITIONS: PlanFeatureDefinition[] = [
  // Limits
  { key: 'max_users', label: 'Máximo de Usuários', description: 'Número máximo de usuários ativos (-1 = ilimitado)', type: 'number', category: 'limits' },
  { key: 'max_products', label: 'Máximo de Produtos', description: 'Número máximo de produtos no cardápio (-1 = ilimitado)', type: 'number', category: 'limits' },
  { key: 'max_orders_per_month', label: 'Pedidos por Mês', description: 'Limite de pedidos por mês (-1 = ilimitado)', type: 'number', category: 'limits' },
  
  // Core features
  { key: 'feature_pos', label: 'PDV/Caixa', description: 'Sistema de ponto de venda completo', type: 'boolean', category: 'core' },
  { key: 'feature_kitchen_display', label: 'Painel da Cozinha', description: 'Tela de gestão de preparo', type: 'boolean', category: 'core' },
  { key: 'feature_delivery_management', label: 'Gestão de Entregas', description: 'Gerenciamento de entregadores e rotas', type: 'boolean', category: 'core' },
  { key: 'feature_stock_control', label: 'Controle de Estoque', description: 'Gestão de insumos e receitas', type: 'boolean', category: 'core' },
  { key: 'feature_courier_app', label: 'App do Entregador', description: 'Dashboard mobile para entregadores', type: 'boolean', category: 'core' },
  { key: 'feature_public_menu', label: 'Cardápio na Internet', description: 'Link exclusivo para visualização do cardápio online', type: 'boolean', category: 'core' },
  
  // Reports
  { key: 'feature_reports_basic', label: 'Relatórios Básicos', description: 'Vendas diárias e produtos mais vendidos', type: 'boolean', category: 'reports' },
  { key: 'feature_reports_advanced', label: 'Relatórios Avançados', description: 'Análises detalhadas e comparativos', type: 'boolean', category: 'reports' },
  { key: 'feature_cmv_reports', label: 'Relatório CMV', description: 'Custo de Mercadoria Vendida', type: 'boolean', category: 'reports' },
  { key: 'feature_ai_forecast', label: 'Previsão com IA', description: 'Previsão de vendas com inteligência artificial', type: 'boolean', category: 'reports' },
  { key: 'feature_goal_notifications', label: 'Metas e Notificações', description: 'Alertas quando metas são atingidas', type: 'boolean', category: 'reports' },
  
  // Advanced
  { key: 'feature_multi_branch', label: 'Multi-Unidades', description: 'Gestão de múltiplas filiais', type: 'boolean', category: 'advanced' },
  { key: 'feature_api_access', label: 'Acesso à API', description: 'Integração via API REST', type: 'boolean', category: 'advanced' },
  { key: 'feature_white_label', label: 'White Label', description: 'Marca própria sem FoodHub', type: 'boolean', category: 'advanced' },
  { key: 'feature_priority_support', label: 'Suporte Prioritário', description: 'Atendimento preferencial', type: 'boolean', category: 'advanced' },
  { key: 'feature_custom_integrations', label: 'Integrações Personalizadas', description: 'iFood, Rappi, e outras', type: 'boolean', category: 'advanced' },
];

/**
 * Generates human-readable feature labels from a plan object.
 * This extracts ALL enabled features, not a truncated subset.
 * 
 * @param plan - Any object containing plan feature flags and limits
 * @returns Array of human-readable feature labels
 */
export function extractPlanFeatures(plan: Record<string, unknown>): string[] {
  const features: string[] = [];
  
  // Process limits first
  for (const def of PLAN_FEATURE_DEFINITIONS.filter(d => d.type === 'number')) {
    const value = plan[def.key];
    if (typeof value === 'number' && value !== 0) {
      if (value === -1) {
        features.push(`${def.label.replace('Máximo de ', '').replace('Pedidos por Mês', 'Pedidos')} ilimitados`);
      } else {
        const label = def.key === 'max_users' 
          ? `Até ${value} usuário${value > 1 ? 's' : ''}`
          : def.key === 'max_products'
          ? `Até ${value} produtos`
          : def.key === 'max_orders_per_month'
          ? `Até ${value} pedidos/mês`
          : `${def.label}: ${value}`;
        features.push(label);
      }
    }
  }
  
  // Process boolean features in category order
  const categoryOrder: Array<PlanFeatureDefinition['category']> = ['core', 'reports', 'advanced'];
  
  for (const category of categoryOrder) {
    for (const def of PLAN_FEATURE_DEFINITIONS.filter(d => d.type === 'boolean' && d.category === category)) {
      if (plan[def.key] === true) {
        features.push(def.label);
      }
    }
  }
  
  return features;
}

/**
 * Counts only the boolean features that are enabled
 */
export function countEnabledBooleanFeatures(plan: Record<string, unknown>): number {
  return PLAN_FEATURE_DEFINITIONS
    .filter(d => d.type === 'boolean')
    .filter(d => plan[d.key] === true)
    .length;
}

/**
 * Get features grouped by category for detailed display
 */
export function getFeaturesByCategory(plan: Record<string, unknown>): Record<string, string[]> {
  const grouped: Record<string, string[]> = {
    limits: [],
    core: [],
    reports: [],
    advanced: [],
  };
  
  for (const def of PLAN_FEATURE_DEFINITIONS) {
    const value = plan[def.key];
    
    if (def.type === 'number' && typeof value === 'number' && value !== 0) {
      const label = value === -1 
        ? `${def.label} ilimitados`
        : `${def.label}: ${value}`;
      grouped.limits.push(label);
    } else if (def.type === 'boolean' && value === true) {
      grouped[def.category].push(def.label);
    }
  }
  
  return grouped;
}
