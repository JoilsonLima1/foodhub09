/**
 * useTenantAddons - Hook for tenant add-on subscriptions
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TenantAddonSubscription {
  id: string;
  addon_id: string;
  addon_name: string;
  addon_description: string | null;
  amount: number;
  pricing_type: string;
  status: string;
  start_at: string;
  end_at: string | null;
}

export interface AvailableAddon {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  pricing_type: 'recurring' | 'one_time';
  billing_period: 'monthly' | 'yearly' | null;
  is_subscribed: boolean;
}

export function useTenantAddons() {
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Get current subscriptions
  const { data: subscriptions = [], isLoading: isLoadingSubscriptions, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['tenant-addon-subscriptions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .rpc('list_tenant_addon_subscriptions', { p_tenant_id: tenantId });
      
      if (error) throw error;
      return (data || []) as TenantAddonSubscription[];
    },
    enabled: !!tenantId,
  });

  // Get available add-ons
  const { data: availableAddons = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['available-addons', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .rpc('list_available_addons_for_tenant', { p_tenant_id: tenantId });
      
      if (error) throw error;
      return (data || []) as AvailableAddon[];
    },
    enabled: !!tenantId,
  });

  const subscribe = useMutation({
    mutationFn: async (addonId: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      
      const { data, error } = await supabase.rpc('subscribe_tenant_addon', {
        p_tenant_id: tenantId,
        p_addon_id: addonId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-addon-subscriptions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['available-addons', tenantId] });
      toast({ title: 'Add-on contratado', description: 'O add-on foi ativado com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao contratar', description: error.message, variant: 'destructive' });
    },
  });

  const cancel = useMutation({
    mutationFn: async ({ subscriptionId, reason }: { subscriptionId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('cancel_tenant_addon_subscription', {
        p_subscription_id: subscriptionId,
        p_reason: reason || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-addon-subscriptions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['available-addons', tenantId] });
      toast({ title: 'Add-on cancelado', description: 'A assinatura foi cancelada.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
    },
  });

  return {
    subscriptions,
    availableAddons,
    isLoading: isLoadingSubscriptions || isLoadingAvailable,
    refetch: refetchSubscriptions,
    subscribe: subscribe.mutateAsync,
    cancel: cancel.mutateAsync,
    isSubscribing: subscribe.isPending,
    isCanceling: cancel.isPending,
  };
}
