import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayOfWeekData {
  dayIndex: number;
  dayName: string;
  dayShort: string;
  totalRevenue: number;
  orderCount: number;
  averageTicket: number;
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function useDayOfWeekReport(daysBack: number = 30) {
  const { tenantId } = useAuth();
  const [data, setData] = useState<DayOfWeekData[]>([]);
  const [bestDay, setBestDay] = useState<DayOfWeekData | null>(null);
  const [worstDay, setWorstDay] = useState<DayOfWeekData | null>(null);
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

      // Aggregate by day of week
      const dayMap: Record<number, { revenue: number; orders: number }> = {};
      
      // Initialize all days
      for (let i = 0; i < 7; i++) {
        dayMap[i] = { revenue: 0, orders: 0 };
      }

      payments?.forEach((payment) => {
        if (payment.paid_at) {
          const dayIndex = getDay(new Date(payment.paid_at));
          dayMap[dayIndex].revenue += Number(payment.amount);
          dayMap[dayIndex].orders += 1;
        }
      });

      const result: DayOfWeekData[] = Object.entries(dayMap).map(([index, data]) => {
        const dayIndex = parseInt(index);
        return {
          dayIndex,
          dayName: DAY_NAMES[dayIndex],
          dayShort: DAY_SHORT[dayIndex],
          totalRevenue: data.revenue,
          orderCount: data.orders,
          averageTicket: data.orders > 0 ? data.revenue / data.orders : 0,
        };
      });

      // Sort by day index for display (starting Monday)
      const sorted = [...result].sort((a, b) => {
        const orderA = a.dayIndex === 0 ? 7 : a.dayIndex;
        const orderB = b.dayIndex === 0 ? 7 : b.dayIndex;
        return orderA - orderB;
      });

      setData(sorted);

      // Find best and worst days (by revenue)
      const withRevenue = result.filter(d => d.totalRevenue > 0);
      if (withRevenue.length > 0) {
        const best = withRevenue.reduce((max, d) => d.totalRevenue > max.totalRevenue ? d : max);
        const worst = withRevenue.reduce((min, d) => d.totalRevenue < min.totalRevenue ? d : min);
        setBestDay(best);
        setWorstDay(worst);
      }
    } catch (error) {
      console.error('Error fetching day of week report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, daysBack]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { data, bestDay, worstDay, isLoading, refetch: fetchReport };
}
