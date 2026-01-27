import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, getHours } from 'date-fns';

interface HourlyData {
  hour: number;
  hourLabel: string;
  totalRevenue: number;
  orderCount: number;
  averageTicket: number;
}

export function useHourlyReport(daysBack: number = 30) {
  const { tenantId } = useAuth();
  const [data, setData] = useState<HourlyData[]>([]);
  const [peakHour, setPeakHour] = useState<HourlyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (!tenantId) return;

    try {
      setIsLoading(true);
      const startDate = subDays(new Date(), daysBack);

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', startDate.toISOString());

      // Aggregate by hour
      const hourMap: Record<number, { revenue: number; orders: number }> = {};
      
      // Initialize all hours
      for (let i = 0; i < 24; i++) {
        hourMap[i] = { revenue: 0, orders: 0 };
      }

      payments?.forEach((payment) => {
        if (payment.paid_at) {
          const hour = getHours(new Date(payment.paid_at));
          hourMap[hour].revenue += Number(payment.amount);
          hourMap[hour].orders += 1;
        }
      });

      const result: HourlyData[] = Object.entries(hourMap).map(([index, data]) => {
        const hour = parseInt(index);
        return {
          hour,
          hourLabel: `${hour.toString().padStart(2, '0')}h`,
          totalRevenue: data.revenue,
          orderCount: data.orders,
          averageTicket: data.orders > 0 ? data.revenue / data.orders : 0,
        };
      });

      // Sort by hour
      const sorted = result.sort((a, b) => a.hour - b.hour);
      setData(sorted);

      // Find peak hour
      const withRevenue = result.filter(d => d.totalRevenue > 0);
      if (withRevenue.length > 0) {
        const peak = withRevenue.reduce((max, d) => d.totalRevenue > max.totalRevenue ? d : max);
        setPeakHour(peak);
      }
    } catch (error) {
      console.error('Error fetching hourly report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, daysBack]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { data, peakHour, isLoading, refetch: fetchReport };
}
