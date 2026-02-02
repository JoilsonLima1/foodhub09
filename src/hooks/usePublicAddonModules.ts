import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Extended category type to include all addon module categories
export type AddonModuleCategory = 
  | 'integrations' 
  | 'operations' 
  | 'marketing' 
  | 'hardware' 
  | 'logistics'
  | 'digital_service'
  | 'payment'
  | 'access_control';

export interface PublicAddonModule {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: AddonModuleCategory;
  icon: string;
  monthly_price: number;
  currency: string;
  display_order: number;
  features: string[];
}

// Category display labels (Portuguese)
export const ADDON_CATEGORY_LABELS: Record<AddonModuleCategory, string> = {
  integrations: 'Integrações',
  operations: 'Operações',
  marketing: 'Marketing',
  hardware: 'Hardware',
  logistics: 'Logística',
  digital_service: 'Atendimento Digital',
  payment: 'Pagamentos',
  access_control: 'Controle de Acesso',
};

// Category descriptions for the landing page
export const ADDON_CATEGORY_DESCRIPTIONS: Record<AddonModuleCategory, string> = {
  integrations: 'Conecte-se aos principais marketplaces e plataformas de delivery',
  operations: 'Gerencie comandas, mesas, garçons e múltiplas lojas',
  marketing: 'Fidelize clientes com campanhas, cupons e programas de pontos',
  hardware: 'Integre impressoras, monitores, balanças e terminais de pagamento',
  logistics: 'Otimize entregas com rastreamento e confirmação inteligente',
  digital_service: 'App do cliente, cadastro, pedidos online e autoatendimento',
  payment: 'QR Pix, pagamento na comanda e divisão de conta',
  access_control: 'Controle de entrada, saída e validação de ingressos',
};

/**
 * Hook to fetch addon modules for public landing page (no auth required)
 */
export function usePublicAddonModules() {
  const { data: modules, isLoading, error } = useQuery({
    queryKey: ['public-addon-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_addon_modules');

      if (error) {
        console.error('[usePublicAddonModules] Error:', error);
        throw error;
      }

      // Transform the data to match expected interface
      return (data || []).map((m: any) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        description: m.description,
        category: m.category as AddonModuleCategory,
        icon: m.icon,
        monthly_price: m.monthly_price,
        currency: m.currency,
        display_order: m.display_order,
        features: Array.isArray(m.features) ? m.features : [],
      })) as PublicAddonModule[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Group modules by category
  const modulesByCategory = (modules || []).reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<AddonModuleCategory, PublicAddonModule[]>);

  // Get categories that have modules (in a specific order)
  const categoryOrder: AddonModuleCategory[] = [
    'operations',
    'digital_service',
    'payment',
    'access_control',
    'marketing',
    'integrations',
    'hardware',
    'logistics',
  ];

  const activeCategories = categoryOrder.filter(
    cat => modulesByCategory[cat] && modulesByCategory[cat].length > 0
  );

  return {
    modules: modules || [],
    modulesByCategory,
    activeCategories,
    isLoading,
    error,
  };
}
