/**
 * usePlanProration - Hook for plan change with proration
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProrationCalculation {
  from_plan_id: string | null;
  from_plan_name: string | null;
  from_amount: number;
  to_plan_id: string;
  to_plan_name: string;
  to_amount: number;
  days_remaining: number;
  days_in_cycle: number;
  proration_credit: number;
  proration_charge: number;
  net_amount: number;
}

export interface ProrationRecord {
  id: string;
  tenant_id: string;
  from_plan_name: string | null;
  to_plan_name: string | null;
  net_amount: number;
  status: 'pending' | 'applied' | 'waived';
  created_at: string;
  applied_at: string | null;
}

export function usePlanProration(tenantId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get proration history
  const { data: prorationHistory = [], isLoading } = useQuery({
    queryKey: ['plan-prorations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('plan_change_prorations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as ProrationRecord[];
    },
    enabled: !!tenantId,
  });

  // Calculate proration for a plan change
  const calculateProration = useMutation({
    mutationFn: async ({ tenantId: tid, newPlanId }: { tenantId: string; newPlanId: string }) => {
      const { data, error } = await supabase.rpc('calculate_proration', {
        p_tenant_id: tid,
        p_new_plan_id: newPlanId,
      });
      
      if (error) throw error;
      return data?.[0] as ProrationCalculation | undefined;
    },
  });

  // Execute plan change with proration
  const changePlanWithProration = useMutation({
    mutationFn: async ({ 
      tenantId: tid, 
      newPlanId, 
      waiveProration = false 
    }: { 
      tenantId: string; 
      newPlanId: string; 
      waiveProration?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('change_tenant_plan_with_proration', {
        p_tenant_id: tid,
        p_new_plan_id: newPlanId,
        p_waive_proration: waiveProration,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-prorations', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });
      toast({ 
        title: 'Plano alterado', 
        description: 'A mudança de plano foi processada com sucesso.' 
      });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao alterar plano', description: error.message, variant: 'destructive' });
    },
  });

  return {
    prorationHistory,
    isLoading,
    calculateProration: calculateProration.mutateAsync,
    changePlanWithProration: changePlanWithProration.mutateAsync,
    isCalculating: calculateProration.isPending,
    isChangingPlan: changePlanWithProration.isPending,
  };
}
