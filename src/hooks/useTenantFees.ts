import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TenantFeeInfo {
  enabled: boolean;
  platform_fee: number;
  percent_applied: number;
  fixed_applied: number;
  tenant_plan: string | null;
  has_override: boolean;
  monetization_disabled: boolean;
}

export interface LedgerEntry {
  id: string;
  tenant_id: string;
  transaction_id: string;
  order_id: string | null;
  entry_type: 'gateway_fee' | 'platform_fee' | 'merchant_net' | 'refund' | 'chargeback';
  amount: number;
  currency: string;
  payment_method: string | null;
  gateway_provider: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Hook for tenant (lojista) to view their fees - READ ONLY
 */
export function useTenantFees() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // Fetch tenant's ledger entries
  const { data: ledgerEntries, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['tenant-ledger', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as LedgerEntry[];
    },
    enabled: !!tenantId,
  });

  // Fetch tenant's fee override (if any)
  const { data: feeOverride, isLoading: isLoadingOverride } = useQuery({
    queryKey: ['tenant-fee-override', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenant_fee_overrides')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Calculate fee for a specific amount and payment method
  const calculateFee = async (amount: number, paymentMethod: string): Promise<TenantFeeInfo | null> => {
    if (!tenantId) return null;

    const { data, error } = await supabase.rpc('calculate_platform_fee', {
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('Error calculating fee:', error);
      return null;
    }

    return data as unknown as TenantFeeInfo;
  };

  // Calculate summary statistics
  const summary = {
    totalTransactions: ledgerEntries?.length || 0,
    totalPlatformFees: ledgerEntries
      ?.filter(e => e.entry_type === 'platform_fee')
      .reduce((sum, e) => sum + e.amount, 0) || 0,
    totalGatewayFees: ledgerEntries
      ?.filter(e => e.entry_type === 'gateway_fee')
      .reduce((sum, e) => sum + e.amount, 0) || 0,
    totalNetReceived: ledgerEntries
      ?.filter(e => e.entry_type === 'merchant_net')
      .reduce((sum, e) => sum + e.amount, 0) || 0,
  };

  return {
    ledgerEntries,
    feeOverride,
    summary,
    calculateFee,
    hasOverride: !!feeOverride,
    isMonetizationDisabled: feeOverride?.enabled === false,
    isLoading: isLoadingLedger || isLoadingOverride,
  };
}
