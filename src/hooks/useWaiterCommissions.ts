import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { WaiterCommission, WaiterCommissionConfig, WaiterPerformance, CommissionTrigger } from '@/types/digitalService';

export function useWaiterCommissionConfig() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['waiter-commission-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('waiter_commission_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data as WaiterCommissionConfig | null;
    },
    enabled: !!tenantId,
  });
}

export function useSaveWaiterCommissionConfig() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<WaiterCommissionConfig>) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      const { data: existing } = await supabase
        .from('waiter_commission_config')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('waiter_commission_config')
          .update({
            ...config,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('waiter_commission_config')
          .insert({
            tenant_id: tenantId,
            ...config,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-commission-config'] });
      toast({ title: 'Configuração salva!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useWaiterCommissions(waiterId?: string, period?: { start: string; end: string }) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['waiter-commissions', tenantId, waiterId, period],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('waiter_commissions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (waiterId) {
        query = query.eq('waiter_id', waiterId);
      }

      if (period) {
        query = query
          .gte('created_at', period.start)
          .lte('created_at', period.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WaiterCommission[];
    },
    enabled: !!tenantId,
  });
}

export function useApproveCommission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commissionId: string) => {
      const { error } = await supabase
        .from('waiter_commissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', commissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-commissions'] });
      toast({ title: 'Comissão aprovada!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao aprovar comissão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMarkCommissionPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commissionIds: string[]) => {
      const { error } = await supabase
        .from('waiter_commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .in('id', commissionIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-commissions'] });
      toast({ title: 'Comissões marcadas como pagas!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao marcar comissões',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useWaiterPerformance(waiterId?: string, periodType: 'daily' | 'weekly' | 'monthly' = 'daily') {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['waiter-performance', tenantId, waiterId, periodType],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('waiter_performance')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_type', periodType)
        .order('period_date', { ascending: false })
        .limit(30);

      if (waiterId) {
        query = query.eq('waiter_id', waiterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WaiterPerformance[];
    },
    enabled: !!tenantId,
  });
}

export function useWaiterRanking(periodType: 'daily' | 'weekly' | 'monthly' = 'daily') {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['waiter-ranking', tenantId, periodType],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get latest period
      const { data: latest, error: latestError } = await supabase
        .from('waiter_performance')
        .select('period_date')
        .eq('tenant_id', tenantId)
        .eq('period_type', periodType)
        .order('period_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw latestError;
      if (!latest) return [];

      const { data, error } = await supabase
        .from('waiter_performance')
        .select(`
          *,
          waiter:couriers(id, name, phone)
        `)
        .eq('tenant_id', tenantId)
        .eq('period_type', periodType)
        .eq('period_date', latest.period_date)
        .order('performance_score', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}
