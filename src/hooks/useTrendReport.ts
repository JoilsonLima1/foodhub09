import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeeklyTrend {
  weekStart: string;
  weekLabel: string;
  totalRevenue: number;
  orderCount: number;
  averageTicket: number;
  growthRate: number | null;
}

export function useTrendReport(weeks: number = 8) {
  const { tenantId } = useAuth();
  const [data, setData] = useState<WeeklyTrend[]>([]);
  const [overallGrowth, setOverallGrowth] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (!tenantId) return;

    try {
      setIsLoading(true);
      const startDate = subDays(new Date(), weeks * 7);

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', startDate.toISOString());

      // Group by week
      const weekMap: Record<string, { revenue: number; orders: number; weekStart: Date }> = {};

      payments?.forEach((payment) => {
        if (payment.paid_at) {
          const date = new Date(payment.paid_at);
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          
          if (!weekMap[weekKey]) {
            weekMap[weekKey] = { revenue: 0, orders: 0, weekStart };
          }
          weekMap[weekKey].revenue += Number(payment.amount);
          weekMap[weekKey].orders += 1;
        }
      });

      // Convert to array and sort by date
      const entries = Object.entries(weekMap)
        .map(([key, data]) => ({
          weekStart: key,
          weekStartDate: data.weekStart,
          totalRevenue: data.revenue,
          orderCount: data.orders,
          averageTicket: data.orders > 0 ? data.revenue / data.orders : 0,
        }))
        .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());

      // Calculate growth rates
      const result: WeeklyTrend[] = entries.map((entry, index) => {
        const prevWeek = index > 0 ? entries[index - 1] : null;
        let growthRate: number | null = null;
        
        if (prevWeek && prevWeek.totalRevenue > 0) {
          growthRate = ((entry.totalRevenue - prevWeek.totalRevenue) / prevWeek.totalRevenue) * 100;
        }

        return {
          weekStart: entry.weekStart,
          weekLabel: format(entry.weekStartDate, "dd/MM", { locale: ptBR }),
          totalRevenue: entry.totalRevenue,
          orderCount: entry.orderCount,
          averageTicket: entry.averageTicket,
          growthRate,
        };
      });

      setData(result);

      // Calculate overall growth (first vs last week)
      if (result.length >= 2) {
        const firstWeek = result[0];
        const lastWeek = result[result.length - 1];
        if (firstWeek.totalRevenue > 0) {
          const growth = ((lastWeek.totalRevenue - firstWeek.totalRevenue) / firstWeek.totalRevenue) * 100;
          setOverallGrowth(growth);
        }
      }
    } catch (error) {
      console.error('Error fetching trend report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, weeks]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { data, overallGrowth, isLoading, refetch: fetchReport };
}
