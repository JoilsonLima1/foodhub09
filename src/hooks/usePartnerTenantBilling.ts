/**
 * usePartnerTenantBilling - Hook for partner to manage tenant billing (Phase 11)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePartnerContext } from '@/contexts/PartnerContext';

export interface PartnerTenantBillingData {
  tenant_id: string;
  tenant_name: string;
  subscription_status: string;
  billing_mode: string;
  plan_name: string | null;
  monthly_amount: number;
  current_period_end: string | null;
  trial_ends_at: string | null;
  overdue_invoices: number;
  total_overdue: number;
}

export function usePartnerTenantBilling(tenantId?: string) {
  const { currentPartner: partner } = usePartnerContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all tenants with billing status
  const { data: tenantsBilling, isLoading } = useQuery({
    queryKey: ['partner-tenants-billing', partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];

      const { data, error } = await supabase
        .from('partner_tenants')
        .select(`
          tenant_id,
          tenants!inner (
            id,
            name,
            subscription_status
          ),
          tenant_subscriptions (
            id,
            status,
            billing_mode,
            monthly_amount,
            current_period_end,
            trial_ends_at,
            partner_plans (
              name,
              monthly_price
            )
          )
        `)
        .eq('partner_id', partner.id);

      if (error) throw error;

      // Enrich with invoice data
      const tenantIds = data?.map((pt: any) => pt.tenant_id) || [];
      
      const { data: overdueData } = await supabase
        .from('tenant_invoices')
        .select('tenant_id, amount')
        .in('tenant_id', tenantIds)
        .eq('status', 'overdue');

      const overdueByTenant = (overdueData || []).reduce((acc: Record<string, { count: number; total: number }>, inv: any) => {
        if (!acc[inv.tenant_id]) acc[inv.tenant_id] = { count: 0, total: 0 };
        acc[inv.tenant_id].count++;
        acc[inv.tenant_id].total += Number(inv.amount);
        return acc;
      }, {});

      return (data || []).map((pt: any) => {
        const sub = pt.tenant_subscriptions?.[0];
        const overdue = overdueByTenant[pt.tenant_id] || { count: 0, total: 0 };
        return {
          tenant_id: pt.tenant_id,
          tenant_name: pt.tenants?.name || 'N/A',
          subscription_status: pt.tenants?.subscription_status || 'unknown',
          billing_mode: sub?.billing_mode || 'unknown',
          plan_name: sub?.partner_plans?.name || null,
          monthly_amount: sub?.monthly_amount || sub?.partner_plans?.monthly_price || 0,
          current_period_end: sub?.current_period_end,
          trial_ends_at: sub?.trial_ends_at,
          overdue_invoices: overdue.count,
          total_overdue: overdue.total,
        };
      }) as PartnerTenantBillingData[];
    },
    enabled: !!partner?.id,
  });

  // Get specific tenant invoices
  const { data: tenantInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['partner-tenant-invoices', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('tenant_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Apply dunning manually
  const applyDunning = useMutation({
    mutationFn: async (targetTenantId: string) => {
      const { data, error } = await supabase
        .rpc('apply_dunning_policy', { p_tenant_id: targetTenantId });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['partner-tenants-billing'] });
      toast({
        title: 'Política de inadimplência aplicada',
        description: data?.current_status ? `Status: ${data.current_status}` : undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao aplicar política',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reactivate tenant after payment
  const reactivateTenant = useMutation({
    mutationFn: async (targetTenantId: string) => {
      const { data, error } = await supabase
        .rpc('reactivate_on_payment', { p_tenant_id: targetTenantId });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['partner-tenants-billing'] });
      if (data?.reactivated) {
        toast({ title: 'Tenant reativado com sucesso' });
      } else {
        toast({
          title: 'Ainda há faturas pendentes',
          description: `${data?.pending_invoices} fatura(s) em aberto`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao reativar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    tenantsBilling: tenantsBilling || [],
    isLoading,
    tenantInvoices: tenantInvoices || [],
    invoicesLoading,
    applyDunning,
    reactivateTenant,
  };
}
