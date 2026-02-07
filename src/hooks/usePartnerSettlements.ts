/**
 * usePartnerSettlements - Hook for partner settlement management (READ-ONLY consumption of ledger)
 * 
 * This hook consumes data from the Settlement Engine (Phase 6) without modifying the SSOT ledger.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePartnerContext } from '@/contexts/PartnerContext';

export interface SettlementData {
  id: string;
  partner_id: string;
  period_start: string;
  period_end: string;
  total_gross: number;
  total_partner_net: number;
  total_platform_fee: number;
  transaction_count: number;
  settlement_mode: 'split' | 'invoice' | 'manual';
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  generated_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PayoutData {
  id: string;
  partner_id: string;
  settlement_id: string | null;
  amount: number;
  payout_method: 'pix' | 'ted' | 'asaas_transfer' | 'manual' | 'split_auto';
  provider_reference: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  executed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FinancialSummary {
  available_balance: number;
  in_chargeback_window: number;
  pending_settlement: number;
  total_paid: number;
  calculated_at: string;
}

export function usePartnerSettlements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();

  // Fetch settlements
  const { data: settlements = [], isLoading: isLoadingSettlements } = useQuery({
    queryKey: ['partner-settlements', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('partner_id', currentPartner.id)
        .order('period_end', { ascending: false });

      if (error) throw error;
      return (data || []) as SettlementData[];
    },
    enabled: !!currentPartner?.id,
  });

  // Fetch payouts
  const { data: payouts = [], isLoading: isLoadingPayouts } = useQuery({
    queryKey: ['partner-payouts', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      const { data, error } = await supabase
        .from('partner_payouts')
        .select('*')
        .eq('partner_id', currentPartner.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PayoutData[];
    },
    enabled: !!currentPartner?.id,
  });

  // Fetch financial summary via RPC
  const { data: financialSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['partner-financial-summary', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return null;

      const { data, error } = await supabase.rpc('get_partner_financial_summary', {
        p_partner_id: currentPartner.id,
      });

      if (error) throw error;
      return data as unknown as FinancialSummary;
    },
    enabled: !!currentPartner?.id,
  });

  // Generate settlement mutation
  const generateSettlement = useMutation({
    mutationFn: async ({ periodStart, periodEnd }: { periodStart: string; periodEnd: string }) => {
      if (!currentPartner?.id) throw new Error('Partner not found');

      const { data, error } = await supabase.rpc('generate_partner_settlement', {
        p_partner_id: currentPartner.id,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; settlement_id?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate settlement');
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['partner-financial-summary'] });
      toast({ title: 'Settlement gerado', description: `ID: ${data.settlement_id}` });
    },
    onError: (error: Error) => {
      const message = error.message === 'settlement_exists' 
        ? 'Já existe um settlement para este período'
        : error.message === 'no_transactions'
        ? 'Nenhuma transação não liquidada no período'
        : error.message;
      toast({ title: 'Erro ao gerar settlement', description: message, variant: 'destructive' });
    },
  });

  // Execute payout mutation (admin only)
  const executePayout = useMutation({
    mutationFn: async ({ 
      settlementId, 
      payoutMethod = 'manual',
      providerReference 
    }: { 
      settlementId: string; 
      payoutMethod?: string;
      providerReference?: string;
    }) => {
      const { data, error } = await supabase.rpc('execute_partner_payout', {
        p_settlement_id: settlementId,
        p_payout_method: payoutMethod,
        p_provider_reference: providerReference || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; payout_id?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute payout');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['partner-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['partner-financial-summary'] });
      toast({ title: 'Payout executado com sucesso' });
    },
    onError: (error: Error) => {
      const message = error.message === 'payout_exists'
        ? 'Já existe um payout para este settlement'
        : error.message === 'settlement_not_found'
        ? 'Settlement não encontrado'
        : error.message;
      toast({ title: 'Erro ao executar payout', description: message, variant: 'destructive' });
    },
  });

  // Stats computed from data
  const stats = {
    totalSettlements: settlements.length,
    pendingSettlements: settlements.filter(s => s.status === 'pending').length,
    paidSettlements: settlements.filter(s => s.status === 'paid').length,
    totalPaidOut: payouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
    pendingPayouts: payouts.filter(p => p.status === 'pending').length,
  };

  return {
    // Data
    settlements,
    payouts,
    financialSummary,
    stats,
    
    // Loading states
    isLoading: isLoadingSettlements || isLoadingPayouts || isLoadingSummary,
    isLoadingSettlements,
    isLoadingPayouts,
    isLoadingSummary,
    
    // Actions
    generateSettlement,
    executePayout,
  };
}
