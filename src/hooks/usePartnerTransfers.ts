/**
 * usePartnerTransfers - Hook for fetching partner transfer history
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';

interface ProviderTransfer {
  id: string;
  payout_job_id: string | null;
  partner_id: string;
  provider: string;
  provider_transfer_id: string | null;
  amount: number;
  net_amount: number;
  fee: number;
  currency: string;
  status: string;
  transfer_type: string;
  bank_account_info: any;
  confirmed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface PartnerPayout {
  id: string;
  settlement_id: string;
  partner_id: string;
  amount: number;
  status: string;
  payout_method: string;
  provider_reference: string | null;
  executed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface PayoutJob {
  id: string;
  settlement_id: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_attempt_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export function usePartnerTransfers() {
  const { currentPartner } = usePartnerContext();
  const partnerId = currentPartner?.id;

  // Fetch partner payouts
  const { data: payouts, isLoading: isLoadingPayouts, refetch: refetchPayouts } = useQuery({
    queryKey: ['partner-payouts', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      
      const { data, error } = await supabase
        .from('partner_payouts')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as PartnerPayout[];
    },
    enabled: !!partnerId,
  });

  // Fetch payout jobs for this partner
  const { data: payoutJobs, isLoading: isLoadingJobs, refetch: refetchJobs } = useQuery({
    queryKey: ['partner-payout-jobs', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      
      // Get settlements for this partner first
      const { data: settlements, error: settlementsError } = await supabase
        .from('settlements')
        .select('id')
        .eq('partner_id', partnerId);
      
      if (settlementsError) throw settlementsError;
      if (!settlements?.length) return [];
      
      const settlementIds = settlements.map(s => s.id);
      
      const { data, error } = await supabase
        .from('payout_jobs')
        .select('*')
        .in('settlement_id', settlementIds)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as PayoutJob[];
    },
    enabled: !!partnerId,
  });

  // Fetch provider transfers
  const { data: transfers, isLoading: isLoadingTransfers, refetch: refetchTransfers } = useQuery({
    queryKey: ['partner-provider-transfers', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      
      const { data, error } = await supabase
        .from('provider_transfers')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as ProviderTransfer[];
    },
    enabled: !!partnerId,
  });

  const refetchAll = () => {
    refetchPayouts();
    refetchJobs();
    refetchTransfers();
  };

  return {
    payouts: payouts || [],
    payoutJobs: payoutJobs || [],
    transfers: transfers || [],
    isLoading: isLoadingPayouts || isLoadingJobs || isLoadingTransfers,
    refetch: refetchAll,
  };
}
