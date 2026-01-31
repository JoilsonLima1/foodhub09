import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModulePurchase {
  id: string;
  tenant_id: string;
  addon_module_id: string;
  user_id: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  gateway: 'asaas' | 'stripe';
  gateway_payment_id: string | null;
  gateway_customer_id: string | null;
  gateway_invoice_url: string | null;
  amount: number;
  currency: string;
  billing_type: string | null;
  invoice_number: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  addon_module?: {
    id: string;
    name: string;
    slug: string;
    monthly_price: number;
  };
}

/**
 * Hook to track module purchase status for UI updates
 */
export function useModulePurchases() {
  const queryClient = useQueryClient();

  const { data: purchases, isLoading, error, refetch } = useQuery({
    queryKey: ['module-purchases'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) return [];

      // Use raw query since module_purchases is new and types may not be generated yet
      const { data, error } = await supabase
        .from('module_purchases')
        .select(`
          *,
          addon_module:addon_modules(id, name, slug, monthly_price)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useModulePurchases] Error fetching purchases:', error);
        return [];
      }

      return (data || []) as ModulePurchase[];
    },
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: (query) => {
      // If there are pending purchases, poll every 5 seconds
      const data = query.state.data as ModulePurchase[] | undefined;
      const hasPending = data?.some(p => p.status === 'pending');
      return hasPending ? 5000 : false;
    }
  });

  /**
   * Check if a module has a pending purchase
   */
  const hasPendingPurchase = (moduleId: string): boolean => {
    return purchases?.some(
      p => p.addon_module_id === moduleId && p.status === 'pending'
    ) || false;
  };

  /**
   * Get pending purchase for a module
   */
  const getPendingPurchase = (moduleId: string): ModulePurchase | undefined => {
    return purchases?.find(
      p => p.addon_module_id === moduleId && p.status === 'pending'
    );
  };

  /**
   * Get all pending purchases
   */
  const pendingPurchases = purchases?.filter(p => p.status === 'pending') || [];

  /**
   * Invalidate and refetch purchases
   */
  const refreshPurchases = async () => {
    await queryClient.invalidateQueries({ queryKey: ['module-purchases'] });
    await queryClient.invalidateQueries({ queryKey: ['tenant-modules-detailed'] });
    await queryClient.invalidateQueries({ queryKey: ['my-addon-subscriptions'] });
  };

  return {
    purchases,
    pendingPurchases,
    isLoading,
    error,
    hasPendingPurchase,
    getPendingPurchase,
    refreshPurchases,
    refetch
  };
}
