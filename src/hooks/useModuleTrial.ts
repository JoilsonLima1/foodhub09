/**
 * useModuleTrial Hook
 * 
 * Handles free trial activation and status for addon modules.
 * Allows users to start a free trial (7 days) without payment.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const TRIAL_DURATION_DAYS = 7;

export interface TrialInfo {
  isOnTrial: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number;
  isTrialExpired: boolean;
  canStartTrial: boolean;
}

export interface ModuleActivationInfo {
  moduleSlug: string;
  isActive: boolean;
  isOnTrial: boolean;
  isFreeActivation: boolean;
  trialEndsAt: Date | null;
  source: string | null;
}

/**
 * Check trial status and activation options for a module
 */
export function useModuleTrial(moduleSlug: string) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current module status including trial info
  const { data: moduleStatus, isLoading, refetch } = useQuery({
    queryKey: ['module-trial-status', tenantId, moduleSlug],
    queryFn: async (): Promise<ModuleActivationInfo | null> => {
      if (!tenantId) return null;

      // Get module ID from slug
      const { data: moduleData } = await supabase
        .from('addon_modules')
        .select('id')
        .eq('slug', moduleSlug)
        .single();

      if (!moduleData) return null;

      // Check if tenant has this module (any status)
      const { data: subscription } = await supabase
        .from('tenant_addon_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('addon_module_id', moduleData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subscription) {
        // No subscription - can start trial
        return {
          moduleSlug,
          isActive: false,
          isOnTrial: false,
          isFreeActivation: false,
          trialEndsAt: null,
          source: null,
        };
      }

      const now = new Date();
      const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
      const isTrialExpired = trialEndsAt ? trialEndsAt < now : false;
      const isOnTrial = subscription.status === 'trial' && trialEndsAt && !isTrialExpired;
      const isActive = ['active', 'trial'].includes(subscription.status) && !isTrialExpired;

      return {
        moduleSlug,
        isActive,
        isOnTrial: !!isOnTrial,
        isFreeActivation: subscription.is_free === true,
        trialEndsAt,
        source: subscription.source,
      };
    },
    enabled: !!tenantId,
    staleTime: 1000 * 30,
  });

  // Get trial info derived from status
  const getTrialInfo = (): TrialInfo => {
    if (!moduleStatus) {
      return {
        isOnTrial: false,
        trialEndsAt: null,
        daysRemaining: 0,
        isTrialExpired: false,
        canStartTrial: true,
      };
    }

    const now = new Date();
    const trialEndsAt = moduleStatus.trialEndsAt;
    const isTrialExpired = trialEndsAt ? trialEndsAt < now : false;
    const daysRemaining = trialEndsAt 
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      isOnTrial: moduleStatus.isOnTrial,
      trialEndsAt,
      daysRemaining,
      isTrialExpired,
      canStartTrial: !moduleStatus.isActive && !moduleStatus.isOnTrial && !isTrialExpired,
    };
  };

  // Activate free trial
  const activateTrial = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // Get module ID
      const { data: moduleData, error: moduleError } = await supabase
        .from('addon_modules')
        .select('id, name')
        .eq('slug', moduleSlug)
        .single();

      if (moduleError || !moduleData) throw new Error('Module not found');

      // Calculate trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

      // Check if there's an existing subscription
      const { data: existing } = await supabase
        .from('tenant_addon_subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('addon_module_id', moduleData.id)
        .maybeSingle();

      if (existing) {
        // Update existing subscription to trial
        const { error } = await supabase
          .from('tenant_addon_subscriptions')
          .update({
            status: 'trial',
            trial_ends_at: trialEndsAt.toISOString(),
            source: 'trial',
            is_free: true,
            price_paid: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new trial subscription
        const { error } = await supabase
          .from('tenant_addon_subscriptions')
          .insert({
            tenant_id: tenantId,
            addon_module_id: moduleData.id,
            status: 'trial',
            trial_ends_at: trialEndsAt.toISOString(),
            source: 'trial',
            is_free: true,
            price_paid: 0,
            started_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      return { moduleName: moduleData.name, trialEndsAt };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['module-trial-status'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-modules-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['my-addon-subscriptions'] });
      
      toast({
        title: 'Teste grátis ativado! 🎉',
        description: `Você tem ${TRIAL_DURATION_DAYS} dias para testar o ${data.moduleName}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao ativar teste',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Activate free (for free plan users)
  const activateFree = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // Get module ID
      const { data: moduleData, error: moduleError } = await supabase
        .from('addon_modules')
        .select('id, name')
        .eq('slug', moduleSlug)
        .single();

      if (moduleError || !moduleData) throw new Error('Module not found');

      // Check if there's an existing subscription
      const { data: existing } = await supabase
        .from('tenant_addon_subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('addon_module_id', moduleData.id)
        .maybeSingle();

      if (existing) {
        // Update existing subscription to active free
        const { error } = await supabase
          .from('tenant_addon_subscriptions')
          .update({
            status: 'active',
            source: 'free_activation',
            is_free: true,
            price_paid: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new free subscription
        const { error } = await supabase
          .from('tenant_addon_subscriptions')
          .insert({
            tenant_id: tenantId,
            addon_module_id: moduleData.id,
            status: 'active',
            source: 'free_activation',
            is_free: true,
            price_paid: 0,
            started_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      return { moduleName: moduleData.name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['module-trial-status'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-modules-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['my-addon-subscriptions'] });
      
      toast({
        title: 'Módulo ativado! 🎉',
        description: `O ${data.moduleName} foi ativado gratuitamente.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao ativar módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    moduleStatus,
    isLoading,
    trialInfo: getTrialInfo(),
    activateTrial,
    activateFree,
    refetch,
  };
}

/**
 * Format trial end date for display
 */
export function formatTrialEndDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
