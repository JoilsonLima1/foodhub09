/**
 * useBillingOps - Hook for Super Admin billing operations (Phase 11)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BillingOpsOverview {
  overdue_count: number;
  pending_count: number;
  chargeback_count: number;
  total_overdue_amount: number;
  recent_problem_invoices: Array<{
    id: string;
    tenant_id: string;
    tenant_name: string;
    amount: number;
    due_date: string;
    status: string;
    partner_id: string | null;
  }>;
}

export function useBillingOps() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ['billing-ops-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_billing_ops_overview');

      if (error) throw error;
      return data as unknown as BillingOpsOverview;
    },
  });

  // Run billing cycle cron manually
  const runBillingCron = useMutation({
    mutationFn: async (targetDate?: string) => {
      const { data, error } = await supabase
        .rpc('run_billing_cycle_cron', { 
          p_target_date: targetDate || new Date().toISOString().split('T')[0] 
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['billing-ops-overview'] });
      toast({
        title: 'Ciclo de cobrança executado',
        description: `Faturas criadas: ${data?.invoices_created || 0}, Dunning aplicado: ${data?.dunning_applied || 0}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao executar ciclo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sync invoice from SSOT
  const syncInvoice = useMutation({
    mutationFn: async (providerPaymentId: string) => {
      const { data, error } = await supabase
        .rpc('sync_invoice_status_from_ssot', { p_provider_payment_id: providerPaymentId });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['billing-ops-overview'] });
      toast({
        title: 'Status sincronizado',
        description: data?.new_status ? `Novo status: ${data.new_status}` : undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao sincronizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Apply dunning to specific tenant
  const applyDunning = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase
        .rpc('apply_dunning_policy', { p_tenant_id: tenantId });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-ops-overview'] });
      toast({ title: 'Política de dunning aplicada' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao aplicar dunning',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    overview,
    isLoading,
    refetch,
    runBillingCron,
    syncInvoice,
    applyDunning,
  };
}
