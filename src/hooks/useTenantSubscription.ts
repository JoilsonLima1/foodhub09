/**
 * useTenantSubscription - Hook to manage tenant subscription status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  partner_tenant_id: string | null;
  partner_plan_id: string | null;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  billing_mode: 'trial' | 'automatic' | 'offline';
  external_subscription_id: string | null;
  payment_provider: 'stripe' | 'asaas' | null;
  monthly_amount: number | null;
  currency: string;
}

export function useTenantSubscription() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data as TenantSubscription | null;
    },
    enabled: !!tenantId,
  });

  // Check access (uses RPC function)
  const { data: accessCheck } = useQuery({
    queryKey: ['tenant-subscription-access', tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return { allowed: true, reason: 'no_check' };

      const { data, error } = await supabase
        .rpc('check_tenant_subscription_access', {
          p_tenant_id: tenantId,
          p_user_id: user.id,
        });

      if (error) {
        console.error('Access check error:', error);
        return { allowed: true, reason: 'error' };
      }

      return data as { allowed: boolean; reason: string; show_renewal_banner?: boolean };
    },
    enabled: !!tenantId && !!user?.id,
  });

  // Computed states
  const isTrialActive = subscription?.status === 'trial' && 
    subscription.trial_ends_at && 
    new Date(subscription.trial_ends_at) > new Date();

  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isExpired = subscription?.status === 'expired' || 
    (subscription?.status === 'trial' && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < new Date());

  const needsRenewal = accessCheck?.show_renewal_banner || isExpired;

  // Update subscription status
  const updateStatus = useMutation({
    mutationFn: async ({ status }: { status: TenantSubscription['status'] }) => {
      if (!subscription?.id) throw new Error('No subscription found');

      const updates: Partial<TenantSubscription> = { status };

      if (status === 'canceled') {
        updates.canceled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tenant_subscriptions')
        .update(updates)
        .eq('id', subscription.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    subscription,
    isLoading,
    error,
    accessCheck,
    isTrialActive,
    trialDaysRemaining,
    isExpired,
    needsRenewal,
    updateStatus,
  };
}
