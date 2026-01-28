import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AddonModule } from './useAddonModules';

export interface PlanAddonModule {
  id: string;
  plan_id: string;
  addon_module_id: string;
  created_at: string;
  created_by: string | null;
  addon_module?: AddonModule;
}

/**
 * Hook to manage addon modules included in subscription plans (Super Admin)
 */
export function usePlanAddonModules(planId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: planAddons, isLoading, error } = useQuery({
    queryKey: ['plan-addon-modules', planId],
    queryFn: async () => {
      let query = supabase
        .from('plan_addon_modules')
        .select(`
          *,
          addon_module:addon_modules(*)
        `)
        .order('created_at', { ascending: true });

      if (planId) {
        query = query.eq('plan_id', planId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PlanAddonModule[];
    },
    enabled: !!planId,
  });

  const { data: allPlanAddons, isLoading: isLoadingAll } = useQuery({
    queryKey: ['all-plan-addon-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_addon_modules')
        .select(`
          *,
          addon_module:addon_modules(*)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PlanAddonModule[];
    },
  });

  const addModuleToPlan = useMutation({
    mutationFn: async (params: { plan_id: string; addon_module_id: string }) => {
      const { data, error } = await supabase
        .from('plan_addon_modules')
        .insert({
          plan_id: params.plan_id,
          addon_module_id: params.addon_module_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-addon-modules'] });
      queryClient.invalidateQueries({ queryKey: ['all-plan-addon-modules'] });
      toast({
        title: 'Módulo adicionado',
        description: 'O módulo foi incluído no plano.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeModuleFromPlan = useMutation({
    mutationFn: async (params: { plan_id: string; addon_module_id: string }) => {
      const { error } = await supabase
        .from('plan_addon_modules')
        .delete()
        .eq('plan_id', params.plan_id)
        .eq('addon_module_id', params.addon_module_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-addon-modules'] });
      queryClient.invalidateQueries({ queryKey: ['all-plan-addon-modules'] });
      toast({
        title: 'Módulo removido',
        description: 'O módulo foi removido do plano.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleModuleInPlan = async (planId: string, addonModuleId: string, isIncluded: boolean) => {
    if (isIncluded) {
      await removeModuleFromPlan.mutateAsync({ plan_id: planId, addon_module_id: addonModuleId });
    } else {
      await addModuleToPlan.mutateAsync({ plan_id: planId, addon_module_id: addonModuleId });
    }
  };

  const isPlanAddonIncluded = (planId: string, addonModuleId: string): boolean => {
    if (!allPlanAddons) return false;
    return allPlanAddons.some(
      (pa) => pa.plan_id === planId && pa.addon_module_id === addonModuleId
    );
  };

  const getPlanAddons = (planId: string): PlanAddonModule[] => {
    if (!allPlanAddons) return [];
    return allPlanAddons.filter((pa) => pa.plan_id === planId);
  };

  return {
    planAddons,
    allPlanAddons,
    isLoading,
    isLoadingAll,
    error,
    addModuleToPlan,
    removeModuleFromPlan,
    toggleModuleInPlan,
    isPlanAddonIncluded,
    getPlanAddons,
  };
}
