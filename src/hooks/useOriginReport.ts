import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays } from 'date-fns';

interface OriginData {
  origin: string;
  label: string;
  totalRevenue: number;
  orderCount: number;
  percentage: number;
}

const ORIGIN_LABELS: Record<string, string> = {
  pos: 'PDV',
  online: 'Online',
  ifood: 'iFood',
  table: 'Mesa',
  whatsapp: 'WhatsApp',
};

export function useOriginReport(daysBack: number = 30) {
  const { tenantId } = useAuth();
  const [data, setData] = useState<OriginData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (!tenantId) return;

    try {
      setIsLoading(true);
      const startDate = subDays(new Date(), daysBack);

      const { data: payments } = await supabase
        .from('payments')
        .select(`
          amount,
          order:orders!inner (
            origin,
            tenant_id
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', startDate.toISOString());

      // Aggregate by origin
      const originMap: Record<string, { revenue: number; orders: number }> = {};

      payments?.forEach((payment) => {
        const origin = (payment.order as any)?.origin || 'online';
        if (!originMap[origin]) {
          originMap[origin] = { revenue: 0, orders: 0 };
        }
        originMap[origin].revenue += Number(payment.amount);
        originMap[origin].orders += 1;
      });

      const totalRevenue = Object.values(originMap).reduce((sum, d) => sum + d.revenue, 0);

      const result: OriginData[] = Object.entries(originMap).map(([origin, data]) => ({
        origin,
        label: ORIGIN_LABELS[origin] || origin,
        totalRevenue: data.revenue,
        orderCount: data.orders,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }));

      // Sort by revenue
      const sorted = result.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setData(sorted);
    } catch (error) {
      console.error('Error fetching origin report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, daysBack]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { data, isLoading, refetch: fetchReport };
}
