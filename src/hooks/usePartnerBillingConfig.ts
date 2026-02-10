/**
 * usePartnerBillingConfig - Hook for partner AR billing, invoices, and dunning (Pilar 3)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PartnerBillingConfig {
  id: string;
  partner_id: string;
  collection_mode: 'INVOICE' | 'PIX' | 'CARD' | 'BOLETO';
  credit_limit: number;
  grace_days: number;
  dunning_policy: {
    L1: { days_overdue: number; action: string; description: string };
    L2: { days_overdue: number; action: string; description: string };
    L3: { days_overdue: number; action: string; description: string };
    L4: { days_overdue: number; action: string; description: string };
  };
  current_dunning_level: number;
  dunning_started_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerArInvoice {
  id: string;
  partner_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  description: string | null;
  reference_period_start: string | null;
  reference_period_end: string | null;
  due_date: string;
  paid_at: string | null;
  canceled_at: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'canceled' | 'partially_paid';
  payment_method: string | null;
  gateway_payment_id: string | null;
  gateway_invoice_url: string | null;
  line_items: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  partner?: { id: string; name: string };
}

export interface PartnerDunningLog {
  id: string;
  partner_id: string;
  invoice_id: string | null;
  dunning_level: number;
  action: string;
  description: string | null;
  executed_at: string;
  reversed_at: string | null;
  reversed_by: string | null;
  metadata: any;
  created_at: string;
}

export interface DunningStatus {
  has_config: boolean;
  current_level: number;
  suggested_level: number;
  overdue_amount: number;
  overdue_count: number;
  max_days_overdue: number;
  credit_limit: number;
  collection_mode: string;
  dunning_policy: any;
}

// Super Admin: manage all partner billing configs
export function useAllPartnerBillingConfigs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['all-partner-billing-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_billing_config')
        .select(`*, partner:partners(id, name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (PartnerBillingConfig & { partner: { id: string; name: string } })[];
    },
  });

  const upsertConfig = useMutation({
    mutationFn: async (config: Partial<PartnerBillingConfig> & { partner_id: string }) => {
      const { data, error } = await supabase
        .from('partner_billing_config')
        .upsert(config as any, { onConflict: 'partner_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-partner-billing-configs'] });
      toast({ title: 'Config de cobrança salva!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { configs, isLoading, upsertConfig };
}

// Super Admin: manage AR invoices
export function usePartnerArInvoices(partnerId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['partner-ar-invoices', partnerId],
    queryFn: async () => {
      let query = supabase
        .from('partner_ar_invoices')
        .select(`*, partner:partners(id, name)`)
        .order('due_date', { ascending: false });
      
      if (partnerId) query = query.eq('partner_id', partnerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PartnerArInvoice[];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: Partial<PartnerArInvoice>) => {
      const { data, error } = await supabase
        .from('partner_ar_invoices')
        .insert([invoice as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-ar-invoices'] });
      toast({ title: 'Fatura criada!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PartnerArInvoice> & { id: string }) => {
      const { error } = await supabase
        .from('partner_ar_invoices')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-ar-invoices'] });
      toast({ title: 'Fatura atualizada!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { invoices, isLoading, createInvoice, updateInvoice };
}

// Dunning log
export function usePartnerDunningLog(partnerId?: string) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['partner-dunning-log', partnerId],
    queryFn: async () => {
      let query = supabase
        .from('partner_dunning_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (partnerId) query = query.eq('partner_id', partnerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PartnerDunningLog[];
    },
  });

  return { logs, isLoading };
}

// Dunning status check
export function usePartnerDunningStatus(partnerId?: string) {
  return useQuery({
    queryKey: ['partner-dunning-status', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const { data, error } = await supabase
        .rpc('get_partner_dunning_status', { p_partner_id: partnerId });
      if (error) throw error;
      return data as unknown as DunningStatus;
    },
    enabled: !!partnerId,
  });
}
