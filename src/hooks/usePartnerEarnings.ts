/**
 * usePartnerEarnings - Hook for partner earnings and revenue tracking
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';

export interface PartnerEarning {
  id: string;
  partner_id: string;
  tenant_id: string;
  transaction_id: string;
  order_id: string | null;
  gross_amount: number;
  gateway_fee: number;
  platform_fee: number;
  partner_fee: number;
  merchant_net: number;
  payment_method: string | null;
  currency: string;
  status: 'pending' | 'settled' | 'refunded' | 'disputed';
  settled_at: string | null;
  created_at: string;
  // New optional fields for Phase 5 finalization
  external_payment_id?: string | null;
  settlement_mode?: 'split' | 'invoice' | 'manual' | null;
  reversed_at?: string | null;
  reversal_reason?: string | null;
  original_earning_id?: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
}

export interface EarningsSummary {
  totalTransactions: number;
  totalGrossAmount: number;
  totalPartnerEarnings: number;
  totalPlatformFees: number;
  totalMerchantNet: number;
  pendingEarnings: number;
  settledEarnings: number;
  refundedAmount: number;
  netEarnings: number; // After refunds
}

export interface EarningsFilters {
  tenant_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  payment_method?: string;
}

export function usePartnerEarnings(filters?: EarningsFilters) {
  const { currentPartner } = usePartnerContext();

  const { data: earnings = [], isLoading, refetch } = useQuery({
    queryKey: ['partner-earnings', currentPartner?.id, filters],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      let query = supabase
        .from('partner_earnings')
        .select(`
          *,
          tenant:tenants!tenant_id (id, name)
        `)
        .eq('partner_id', currentPartner.id)
        .order('created_at', { ascending: false });

      if (filters?.tenant_id) {
        query = query.eq('tenant_id', filters.tenant_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.payment_method) {
        query = query.eq('payment_method', filters.payment_method);
      }
      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query.limit(200);

      if (error) throw error;
      return (data || []) as PartnerEarning[];
    },
    enabled: !!currentPartner?.id,
  });

  // Calculate summary stats (exclude reversal entries from positive counts)
  const positiveEarnings = earnings.filter(e => !e.original_earning_id && !e.reversed_at);
  const reversalEntries = earnings.filter(e => e.original_earning_id || e.reversed_at);
  
  const summary: EarningsSummary = {
    totalTransactions: positiveEarnings.length,
    totalGrossAmount: positiveEarnings.reduce((sum, e) => sum + (e.gross_amount || 0), 0),
    totalPartnerEarnings: positiveEarnings.reduce((sum, e) => sum + (e.partner_fee || 0), 0),
    totalPlatformFees: positiveEarnings.reduce((sum, e) => sum + (e.platform_fee || 0), 0),
    totalMerchantNet: positiveEarnings.reduce((sum, e) => sum + (e.merchant_net || 0), 0),
    pendingEarnings: positiveEarnings
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + (e.partner_fee || 0), 0),
    settledEarnings: positiveEarnings
      .filter(e => e.status === 'settled')
      .reduce((sum, e) => sum + (e.partner_fee || 0), 0),
    refundedAmount: Math.abs(reversalEntries.reduce((sum, e) => sum + (e.partner_fee || 0), 0)),
    // Net earnings = total - refunds (reversals have negative amounts)
    netEarnings: earnings.reduce((sum, e) => sum + (e.partner_fee || 0), 0),
  };

  return {
    earnings,
    summary,
    isLoading,
    refetch,
  };
}

// Hook for monthly summary
export function usePartnerEarningsSummary() {
  const { currentPartner } = usePartnerContext();

  return useQuery({
    queryKey: ['partner-earnings-summary', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      // Get last 6 months of data grouped by month
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from('partner_earnings')
        .select('gross_amount, partner_fee, platform_fee, created_at, status')
        .eq('partner_id', currentPartner.id)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, {
        month: string;
        transactions: number;
        gross: number;
        earnings: number;
        platformFees: number;
      }> = {};

      (data || []).forEach(item => {
        const monthKey = new Date(item.created_at).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            transactions: 0,
            gross: 0,
            earnings: 0,
            platformFees: 0,
          };
        }
        monthlyData[monthKey].transactions++;
        monthlyData[monthKey].gross += item.gross_amount || 0;
        monthlyData[monthKey].earnings += item.partner_fee || 0;
        monthlyData[monthKey].platformFees += item.platform_fee || 0;
      });

      return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    },
    enabled: !!currentPartner?.id,
  });
}
