/**
 * usePartnerSettlementConfig - Hook for managing partner settlement configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { useToast } from '@/hooks/use-toast';

interface PartnerSettlementConfig {
  partner_id: string;
  settlement_mode: string;
  payout_schedule: string;
  payout_min_amount: number;
  payout_day_of_week: number | null;
  payout_day_of_month: number | null;
  chargeback_reserve_percent: number;
  auto_payout_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateConfigInput {
  settlement_mode?: 'split' | 'invoice' | 'manual';
  payout_schedule?: 'daily' | 'weekly' | 'manual';
  payout_min_amount?: number;
  payout_day_of_week?: number | null;
}

export function usePartnerSettlementConfig() {
  const { currentPartner } = usePartnerContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const partnerId = currentPartner?.id;

  // Fetch partner settlement config
  const { data: config, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-settlement-config', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      
      const { data, error } = await supabase
        .from('partner_settlement_configs')
        .select('*')
        .eq('partner_id', partnerId)
        .maybeSingle();
      
      if (error) throw error;
      return data as PartnerSettlementConfig | null;
    },
    enabled: !!partnerId,
  });

  // Update/create config mutation
  const updateConfig = useMutation({
    mutationFn: async (input: UpdateConfigInput) => {
      if (!partnerId) throw new Error('Partner ID not found');
      
      // Use RPC to upsert the config
      const { data, error } = await supabase.rpc('upsert_partner_settlement_config', {
        p_partner_id: partnerId,
        p_settlement_mode: input.settlement_mode || config?.settlement_mode || 'manual',
        p_payout_schedule: input.payout_schedule || config?.payout_schedule || 'manual',
        p_payout_min_amount: input.payout_min_amount ?? config?.payout_min_amount ?? 100,
        p_payout_day_of_week: input.payout_day_of_week ?? config?.payout_day_of_week ?? null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de repasse foram atualizadas.',
      });
      queryClient.invalidateQueries({ queryKey: ['partner-settlement-config', partnerId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    config,
    isLoading,
    error,
    refetch,
    updateConfig,
  };
}
