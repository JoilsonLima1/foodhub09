import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MultiStoreQuota {
  quota: number;
  used: number;
  available: number;
}

/**
 * Hook to manage Multi-Store quota
 * Each purchase of Multi-Store module = +1 quota for creating branches
 * Headquarters does NOT consume quota
 */
export function useMultiStoreQuota() {
  const { tenantId } = useAuth();

  const { data: quotaInfo, isLoading, error, refetch } = useQuery({
    queryKey: ['multi-store-quota', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        return { quota: 0, used: 0, available: 0 } as MultiStoreQuota;
      }

      // Call the database function to get quota info
      const { data, error } = await supabase.rpc('get_multi_store_quota', {
        p_tenant_id: tenantId,
      });

      if (error) {
        console.error('[useMultiStoreQuota] Error:', error);
        throw error;
      }

      // The RPC returns an array with one row
      const result = data?.[0] || { quota: 0, used: 0, available: 0 };
      
      return {
        quota: result.quota || 0,
        used: result.used || 0,
        available: result.available || 0,
      } as MultiStoreQuota;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 30, // 30 seconds
  });

  /**
   * Check if tenant can create a new branch
   */
  const canCreateBranch = quotaInfo ? quotaInfo.available > 0 : false;

  /**
   * Check if module has been purchased at least once
   */
  const hasModulePurchased = quotaInfo ? quotaInfo.quota > 0 : false;

  return {
    quota: quotaInfo?.quota || 0,
    used: quotaInfo?.used || 0,
    available: quotaInfo?.available || 0,
    canCreateBranch,
    hasModulePurchased,
    isLoading,
    error,
    refetch,
  };
}
