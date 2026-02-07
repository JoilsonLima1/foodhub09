/**
 * usePartnerPaymentAccount - Hook for managing partner payment account status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { useToast } from '@/hooks/use-toast';

interface PartnerPaymentAccount {
  id: string;
  partner_id: string;
  provider: string;
  provider_account_id: string | null;
  provider_wallet_id: string | null;
  status: string;
  kyc_level: string | null;
  capabilities: {
    split?: boolean;
    transfers?: boolean;
    pix?: boolean;
  } | null;
  onboarding_url: string | null;
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export function usePartnerPaymentAccount() {
  const { currentPartner } = usePartnerContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const partnerId = currentPartner?.id;

  // Fetch partner payment account
  const { data: account, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-payment-account', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      
      const { data, error } = await supabase
        .from('partner_payment_accounts')
        .select('*')
        .eq('partner_id', partnerId)
        .maybeSingle();
      
      if (error) throw error;
      return data as PartnerPaymentAccount | null;
    },
    enabled: !!partnerId,
  });

  // Start onboarding mutation
  const startOnboarding = useMutation({
    mutationFn: async () => {
      if (!partnerId) throw new Error('Partner ID not found');
      
      const { data, error } = await supabase.functions.invoke('partner-payment-ops', {
        body: { action: 'start_onboarding', partner_id: partnerId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Onboarding iniciado',
        description: data.onboarding_link 
          ? 'Link de cadastro gerado com sucesso.' 
          : 'Processo de cadastro iniciado.',
      });
      queryClient.invalidateQueries({ queryKey: ['partner-payment-account', partnerId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao iniciar onboarding',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sync status mutation
  const syncStatus = useMutation({
    mutationFn: async () => {
      if (!partnerId) throw new Error('Partner ID not found');
      
      const { data, error } = await supabase.functions.invoke('partner-payment-ops', {
        body: { action: 'sync_status', partner_id: partnerId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Status sincronizado',
        description: 'Informações atualizadas com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['partner-payment-account', partnerId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao sincronizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Computed properties
  const isSplitAvailable = account?.status === 'approved' && (account?.capabilities as any)?.split === true;
  const isTransfersAvailable = account?.status === 'approved' && (account?.capabilities as any)?.transfers === true;
  const canStartOnboarding = !account || account.status === 'not_started';
  const canSyncStatus = account?.status === 'pending';
  const onboardingLink = account?.onboarding_url;

  return {
    account,
    isLoading,
    error,
    refetch,
    startOnboarding,
    syncStatus,
    isSplitAvailable,
    isTransfersAvailable,
    canStartOnboarding,
    canSyncStatus,
    onboardingLink,
  };
}
