/**
 * useTenantBilling - Hook for tenant billing management (Phase 11)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TenantBillingProfile {
  id: string;
  tenant_id: string;
  partner_id: string | null;
  provider: string;
  provider_customer_id: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_doc: string | null;
  billing_name: string | null;
  status: 'active' | 'incomplete' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface TenantInvoice {
  id: string;
  tenant_id: string;
  partner_id: string | null;
  plan_id: string | null;
  subscription_id: string | null;
  provider: string;
  provider_payment_id: string | null;
  provider_payment_url: string | null;
  amount: number;
  currency: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled' | 'refunded' | 'chargeback';
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface BillingSummary {
  profile: TenantBillingProfile | null;
  subscription: {
    id: string;
    status: string;
    billing_mode: string;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    monthly_amount: number | null;
  } | null;
  plan: {
    id: string;
    name: string;
    monthly_price: number;
    slug: string;
  } | null;
  invoices: TenantInvoice[];
}

export function useTenantBilling() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['tenant-billing-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .rpc('get_tenant_billing_summary', { p_tenant_id: tenantId });

      if (error) throw error;
      return data as unknown as BillingSummary | null;
    },
    enabled: !!tenantId,
  });

  const { data: invoices } = useQuery({
    queryKey: ['tenant-invoices', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('tenant_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as TenantInvoice[];
    },
    enabled: !!tenantId,
  });

  const updateBillingProfile = useMutation({
    mutationFn: async (profileData: {
      billing_email?: string;
      billing_phone?: string;
      billing_doc?: string;
      billing_name?: string;
    }) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .rpc('create_or_update_billing_profile', {
          p_tenant_id: tenantId,
          p_billing_email: profileData.billing_email || null,
          p_billing_phone: profileData.billing_phone || null,
          p_billing_doc: profileData.billing_doc || null,
          p_billing_name: profileData.billing_name || null,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-billing-summary'] });
      toast({ title: 'Dados de cobrança atualizados' });
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
    summary,
    invoices: invoices || [],
    isLoading,
    error,
    refetch,
    updateBillingProfile,
    profile: summary?.profile || null,
    subscription: summary?.subscription || null,
    plan: summary?.plan || null,
  };
}
