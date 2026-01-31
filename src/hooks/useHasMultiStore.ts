import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Simple hook to check if tenant has the Multi-Store module active.
 * Used to scope Multi-Store logic ONLY to tenants that purchased the module.
 */
export function useHasMultiStore() {
  const { tenantId } = useAuth();

  const { data: hasMultiStore = false, isLoading } = useQuery({
    queryKey: ['has-multi-store', tenantId],
    queryFn: async () => {
      if (!tenantId) return false;

      // Check if tenant has multi_store module active
      const { data, error } = await supabase
        .from('tenant_addon_subscriptions')
        .select(`
          id,
          status,
          addon_module:addon_modules!inner(slug)
        `)
        .eq('tenant_id', tenantId)
        .eq('addon_module.slug', 'multi_store')
        .in('status', ['active', 'trial'])
        .limit(1);

      if (error) {
        console.error('[useHasMultiStore] Error:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { hasMultiStore, isLoading };
}
