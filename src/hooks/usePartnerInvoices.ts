/**
 * usePartnerInvoices - Hook for partner invoice management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePartnerContext } from '@/contexts/PartnerContext';

export interface PartnerInvoiceData {
  id: string;
  tenant_subscription_id: string | null;
  tenant_id: string;
  partner_id: string;
  partner_plan_id: string | null;
  amount: number;
  currency: string | null;
  description: string | null;
  due_date: string;
  paid_at: string | null;
  canceled_at: string | null;
  status: string;
  payment_provider: string | null;
  gateway_payment_id: string | null;
  gateway_invoice_url: string | null;
  billing_type: string | null;
  invoice_number: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  tenant?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  plan?: {
    id: string;
    name: string;
  } | null;
}

export interface InvoiceFilters {
  tenant_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export function usePartnerInvoices(filters?: InvoiceFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['partner-invoices', currentPartner?.id, filters],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      let query = supabase
        .from('partner_invoices')
        .select(`
          *,
          tenant:tenants!tenant_id (id, name, email),
          plan:partner_plans!partner_plan_id (id, name)
        `)
        .eq('partner_id', currentPartner.id)
        .order('created_at', { ascending: false });

      if (filters?.tenant_id) {
        query = query.eq('tenant_id', filters.tenant_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return (data || []) as PartnerInvoiceData[];
    },
    enabled: !!currentPartner?.id,
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'pending').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.amount || 0), 0),
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0),
  };

  const resendInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) throw new Error('Fatura não encontrada');

      // Re-create checkout for this tenant
      const { data, error } = await supabase.functions.invoke('partner-tenant-checkout', {
        body: {
          tenant_id: invoice.tenant_id,
          tenant_subscription_id: invoice.tenant_subscription_id,
          gateway: 'asaas',
          billing_type: invoice.billing_type || 'UNDEFINED',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      toast({ title: 'Nova cobrança gerada', description: 'Link de pagamento atualizado' });
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao reenviar cobrança',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ invoiceId, subscriptionId }: { invoiceId: string; subscriptionId: string }) => {
      // Update invoice status
      const { error: invoiceError } = await supabase
        .from('partner_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Activate subscription manually
      const { data, error } = await supabase.rpc('activate_partner_tenant_subscription', {
        p_tenant_subscription_id: subscriptionId,
        p_payment_provider: 'manual',
        p_gateway_payment_id: null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['partner-tenants-data'] });
      toast({ title: 'Fatura marcada como paga' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao marcar como paga',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    invoices,
    isLoading,
    stats,
    refetch,
    resendInvoice,
    markAsPaid,
  };
}
