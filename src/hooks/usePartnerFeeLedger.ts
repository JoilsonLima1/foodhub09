/**
 * usePartnerFeeLedger - Hook for viewing partner fee ledger entries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FeeLedgerEntry {
  id: string;
  partner_id: string;
  tenant_id: string;
  tenant_invoice_id: string | null;
  period: string;
  invoice_amount: number;
  tx_fee_percent: number;
  tx_fee_fixed_cents: number;
  fee_calculated: number;
  ar_invoice_id: string | null;
  status: 'accrued' | 'invoiced' | 'paid' | 'void';
  created_at: string;
}

export function usePartnerFeeLedger(partnerId?: string, period?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['partner-fee-ledger', partnerId, period],
    queryFn: async () => {
      if (!partnerId) return [];
      let query = supabase
        .from('partner_fee_ledger')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (period) query = query.eq('period', period);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FeeLedgerEntry[];
    },
    enabled: !!partnerId,
  });

  const accrueForPeriod = useMutation({
    mutationFn: async ({ partnerId: pid, period: per }: { partnerId: string; period: string }) => {
      const { data, error } = await supabase
        .rpc('accrue_partner_tx_fees_for_period', { p_partner_id: pid, p_period: per });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-fee-ledger'] });
      toast({
        title: 'Accrual concluído',
        description: `${data?.invoices_processed || 0} faturas processadas, R$ ${data?.total_tx_fees || 0} em taxas`,
      });
    },
    onError: (e: any) => toast({ title: 'Erro no accrual', description: e.message, variant: 'destructive' }),
  });

  const generateInvoice = useMutation({
    mutationFn: async ({ partnerId: pid, period: per }: { partnerId: string; period: string }) => {
      const { data, error } = await supabase
        .rpc('generate_partner_monthly_invoice', { p_partner_id: pid, p_period: per });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-fee-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['partner-ar-invoices'] });
      toast({
        title: 'Fatura gerada!',
        description: `${data?.invoice_number} — R$ ${data?.total?.toFixed(2)} (venc. ${data?.due_date})`,
      });
    },
    onError: (e: any) => toast({ title: 'Erro ao gerar fatura', description: e.message, variant: 'destructive' }),
  });

  const summary = {
    totalAccrued: entries.filter(e => e.status === 'accrued').reduce((s, e) => s + e.fee_calculated, 0),
    totalInvoiced: entries.filter(e => e.status === 'invoiced').reduce((s, e) => s + e.fee_calculated, 0),
    count: entries.length,
  };

  return {
    entries,
    summary,
    isLoading,
    accrueForPeriod,
    generateInvoice,
  };
}
