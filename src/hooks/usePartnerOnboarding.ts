/**
 * usePartnerOnboarding - Hook for partner onboarding progress and actions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { toast } from 'sonner';

export interface OnboardingStep {
  completed: boolean;
  [key: string]: unknown;
}

export interface OnboardingProgress {
  partner_id: string;
  steps: {
    branding: OnboardingStep & { has_logo: boolean; has_name: boolean; has_colors: boolean };
    payments: OnboardingStep & { has_asaas: boolean; asaas_status: string | null; split_enabled: boolean };
    notifications: OnboardingStep & { using_defaults: boolean };
    plans: OnboardingStep & { active_plans_count: number };
    domains: OnboardingStep & { marketing_domain: string | null; app_domain: string | null; marketing_verified: boolean; app_verified: boolean };
    compliance: OnboardingStep;
  };
  ready_to_sell: boolean;
  dry_run_passed: boolean;
  completed_at: string | null;
  completion_percentage: number;
}

export interface DryRunResult {
  success: boolean;
  all_passed: boolean;
  tests: Array<{
    test: string;
    name: string;
    passed: boolean;
    details: string;
  }>;
  summary: {
    total_tests: number;
    passed: number;
    failed: number;
  };
  certified: boolean;
  timestamp: string;
}

export interface ActionReadiness {
  allowed: boolean;
  reason: string;
  missing_steps: string[];
}

export interface PartnerGuide {
  key: string;
  title: string;
  content_md: string;
  category: string;
}

export function usePartnerOnboarding() {
  const { currentPartner } = usePartnerContext();
  const queryClient = useQueryClient();
  const partnerId = currentPartner?.id;

  // Fetch onboarding progress
  const { data: progress, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-onboarding', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      
      const { data, error } = await supabase
        .rpc('get_partner_onboarding_progress', { p_partner_id: partnerId });
      
      if (error) throw error;
      return data as unknown as OnboardingProgress;
    },
    enabled: !!partnerId,
  });

  // Update a specific step
  const updateStep = useMutation({
    mutationFn: async ({ step, value }: { step: string; value: boolean }) => {
      if (!partnerId) throw new Error('Partner ID required');
      
      const { data, error } = await supabase
        .rpc('update_partner_onboarding_step', {
          p_partner_id: partnerId,
          p_step: step,
          p_value: value,
        });
      
      if (error) throw error;
      return data as unknown as OnboardingProgress;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['partner-onboarding', partnerId], data);
      toast.success('Progresso atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Check readiness for specific action
  const checkReadiness = async (action: string): Promise<ActionReadiness> => {
    if (!partnerId) return { allowed: false, reason: 'Partner não identificado', missing_steps: [] };
    
    const { data, error } = await supabase
      .rpc('assert_partner_ready_for', {
        p_partner_id: partnerId,
        p_action: action,
      });
    
    if (error) throw error;
    return data as unknown as ActionReadiness;
  };

  // Run dry-run test
  const runDryRun = useMutation({
    mutationFn: async () => {
      if (!partnerId) throw new Error('Partner ID required');
      
      const { data, error } = await supabase
        .rpc('run_partner_onboarding_dry_run', { p_partner_id: partnerId });
      
      if (error) throw error;
      return data as unknown as DryRunResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-onboarding', partnerId] });
      if (data.certified) {
        toast.success('🎉 Parabéns! Sua operação está certificada!');
      } else {
        toast.warning(`Teste concluído: ${data.summary.passed}/${data.summary.total_tests} aprovados`);
      }
    },
    onError: (error) => {
      toast.error('Erro no teste: ' + error.message);
    },
  });

  return {
    progress,
    isLoading,
    error,
    refetch,
    updateStep: updateStep.mutate,
    isUpdating: updateStep.isPending,
    checkReadiness,
    runDryRun: runDryRun.mutate,
    isRunningDryRun: runDryRun.isPending,
    dryRunResult: runDryRun.data,
  };
}

export function usePartnerGuides(category?: string) {
  return useQuery({
    queryKey: ['partner-guides', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_partner_guides', { p_category: category || null });
      
      if (error) throw error;
      return data as unknown as PartnerGuide[];
    },
  });
}
