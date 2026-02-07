/**
 * usePartnerPlanModules - Hook for managing modules included in partner plans
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerPolicy } from '@/hooks/usePartnerPolicy';

export interface PartnerPlanModuleData {
  id: string;
  partner_plan_id: string;
  module_key: string;
  included_quantity: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function usePartnerPlanModules(planId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();
  const { policy } = usePartnerPolicy();

  // Fetch modules included in a specific plan
  const { data: planModules = [], isLoading: isLoadingPlanModules } = useQuery({
    queryKey: ['partner-plan-modules', planId],
    queryFn: async () => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from('partner_plan_modules')
        .select('*')
        .eq('partner_plan_id', planId);

      if (error) throw error;
      return (data || []) as PartnerPlanModuleData[];
    },
    enabled: !!planId,
  });

  // Fetch all available modules for this partner (based on policy)
  const { data: availableModules = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['partner-available-modules', currentPartner?.id, policy?.allowed_modules_catalog],
    queryFn: async () => {
      if (!policy?.allowed_modules_catalog || policy.allowed_modules_catalog.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('addon_modules')
        .select('id, name, slug, icon, monthly_price')
        .eq('is_active', true)
        .in('slug', policy.allowed_modules_catalog)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentPartner?.id && !!policy,
  });

  // Upsert modules for a plan
  const savePlanModules = useMutation({
    mutationFn: async ({ 
      planId, 
      modules 
    }: { 
      planId: string; 
      modules: { module_key: string; included_quantity: number }[] 
    }) => {
      // First, delete existing modules for this plan
      const { error: deleteError } = await supabase
        .from('partner_plan_modules')
        .delete()
        .eq('partner_plan_id', planId);

      if (deleteError) throw deleteError;

      // Then insert new modules
      if (modules.length > 0) {
        const { error: insertError } = await supabase
          .from('partner_plan_modules')
          .insert(
            modules.map(m => ({
              partner_plan_id: planId,
              module_key: m.module_key,
              included_quantity: m.included_quantity,
              is_active: true,
            }))
          );

        if (insertError) throw insertError;
      }

      return { planId, modulesCount: modules.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-plan-modules', data.planId] });
      toast({ title: 'Módulos salvos', description: `${data.modulesCount} módulos configurados` });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar módulos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Validation helpers
  const maxModulesAllowed = policy?.max_modules_per_plan || 10;
  
  const validateModulesCount = (count: number): boolean => {
    return count <= maxModulesAllowed;
  };

  const getModuleBySlug = (moduleSlug: string) => {
    return availableModules.find(m => m.slug === moduleSlug);
  };

  const isModuleIncluded = (moduleSlug: string): boolean => {
    return planModules.some(pm => pm.module_key === moduleSlug);
  };

  return {
    planModules,
    availableModules,
    isLoading: isLoadingPlanModules || isLoadingAvailable,
    savePlanModules,
    maxModulesAllowed,
    validateModulesCount,
    getModuleBySlug,
    isModuleIncluded,
  };
}
