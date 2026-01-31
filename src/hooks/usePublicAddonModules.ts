import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicAddonModule {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: 'integrations' | 'operations' | 'marketing' | 'hardware' | 'logistics';
  icon: string;
  monthly_price: number;
  currency: string;
  display_order: number;
  features: string[];
}

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
        category: m.category as PublicAddonModule['category'],
        icon: m.icon,
        monthly_price: m.monthly_price,
        currency: m.currency,
        display_order: m.display_order,
        features: Array.isArray(m.features) ? m.features : [],
      })) as PublicAddonModule[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    modules: modules || [],
    isLoading,
    error,
  };
}
