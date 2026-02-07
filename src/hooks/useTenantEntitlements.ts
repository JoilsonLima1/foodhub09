/**
 * useTenantEntitlements - Hook for checking tenant entitlements
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TenantEntitlement {
  id: string;
  tenant_id: string;
  entitlement_key: string;
  entitlement_value: Record<string, unknown>;
  source: 'plan' | 'addon' | 'policy' | 'manual' | 'promotion';
  source_id: string | null;
  effective_from: string;
  effective_to: string | null;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  current_value: Record<string, unknown> | null;
  reason: string | null;
}

export function useTenantEntitlements() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Get all active entitlements
  const { data: entitlements = [], isLoading, refetch } = useQuery({
    queryKey: ['tenant-entitlements', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_entitlements')
        .select('*')
        .eq('tenant_id', tenantId)
        .or('effective_to.is.null,effective_to.gt.now()');
      
      if (error) throw error;
      return (data || []) as TenantEntitlement[];
    },
    enabled: !!tenantId,
  });

  // Check a specific entitlement
  const checkEntitlement = useMutation({
    mutationFn: async ({ key, requestedValue }: { key: string; requestedValue?: number }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      
      const { data, error } = await supabase.rpc('check_entitlement', {
        p_tenant_id: tenantId,
        p_key: key,
        p_requested_value: requestedValue || null,
      });
      
      if (error) throw error;
      return data?.[0] as EntitlementCheckResult | undefined;
    },
  });

  // Rebuild entitlements (admin only)
  const rebuildEntitlements = useMutation({
    mutationFn: async (tid: string) => {
      const { data, error } = await supabase.rpc('rebuild_tenant_entitlements', {
        p_tenant_id: tid,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-entitlements'] });
    },
  });

  // Helper to check if an entitlement is enabled
  const hasEntitlement = (key: string): boolean => {
    const entitlement = entitlements.find(e => e.entitlement_key === key);
    if (!entitlement) return false;
    return entitlement.entitlement_value?.enabled === true;
  };

  // Helper to get entitlement limit
  const getEntitlementLimit = (key: string): number | null => {
    const entitlement = entitlements.find(e => e.entitlement_key === key);
    if (!entitlement) return null;
    const limit = entitlement.entitlement_value?.limit;
    return typeof limit === 'number' ? limit : null;
  };

  return {
    entitlements,
    isLoading,
    refetch,
    checkEntitlement: checkEntitlement.mutateAsync,
    rebuildEntitlements: rebuildEntitlements.mutateAsync,
    hasEntitlement,
    getEntitlementLimit,
    isChecking: checkEntitlement.isPending,
  };
}
