import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface PeriodData {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
}

interface PeriodComparison {
  current: PeriodData;
  previous: PeriodData;
  revenueChange: number;
  ordersChange: number;
  ticketChange: number;
}

export function usePeriodComparison(days: number = 7) {
  const { tenantId } = useAuth();
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComparison = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const now = new Date();
      
      // Current period
      const currentEnd = endOfDay(now);
      const currentStart = startOfDay(subDays(now, days - 1));
      
      // Previous period
      const previousEnd = endOfDay(subDays(now, days));
      const previousStart = startOfDay(subDays(now, days * 2 - 1));

      // Fetch current period payments
      const { data: currentPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', currentStart.toISOString())
        .lte('paid_at', currentEnd.toISOString());

      // Fetch previous period payments
      const { data: previousPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', previousStart.toISOString())
        .lte('paid_at', previousEnd.toISOString());

      const currentRevenue = currentPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const currentOrders = currentPayments?.length || 0;
      const currentTicket = currentOrders > 0 ? currentRevenue / currentOrders : 0;

      const previousRevenue = previousPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const previousOrders = previousPayments?.length || 0;
      const previousTicket = previousOrders > 0 ? previousRevenue / previousOrders : 0;

      // Calculate percentage changes
      const revenueChange = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : currentRevenue > 0 ? 100 : 0;

      const ordersChange = previousOrders > 0 
        ? ((currentOrders - previousOrders) / previousOrders) * 100 
        : currentOrders > 0 ? 100 : 0;

      const ticketChange = previousTicket > 0 
        ? ((currentTicket - previousTicket) / previousTicket) * 100 
        : currentTicket > 0 ? 100 : 0;

      setComparison({
        current: {
          totalRevenue: currentRevenue,
          totalOrders: currentOrders,
          averageTicket: currentTicket,
        },
        previous: {
          totalRevenue: previousRevenue,
          totalOrders: previousOrders,
          averageTicket: previousTicket,
        },
        revenueChange,
        ordersChange,
        ticketChange,
      });
    } catch (error) {
      console.error('Error fetching period comparison:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [tenantId, days]);

  return { comparison, isLoading, refetch: fetchComparison };
}
