import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays, format, startOfHour, subHours } from 'date-fns';

interface HourlySales {
  hour: string;
  revenue: number;
  orders: number;
}

interface RealtimeKPIs {
  todaySales: number;
  todayOrders: number;
  averageTicket: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  outForDeliveryOrders: number;
  hourlySales: HourlySales[];
  lastOrderTime: string | null;
  peakHour: string | null;
  conversionRate: number;
}

export function useRealtimeKPIs() {
  const { tenantId } = useAuth();
  const [kpis, setKpis] = useState<RealtimeKPIs>({
    todaySales: 0,
    todayOrders: 0,
    averageTicket: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    outForDeliveryOrders: 0,
    hourlySales: [],
    lastOrderTime: null,
    peakHour: null,
    conversionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchKPIs = useCallback(async () => {
    if (!tenantId) return;

    try {
      const today = startOfDay(new Date());
      const now = new Date();

      // Fetch today's orders
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', today.toISOString());

      // Fetch today's payments
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', today.toISOString());

      // Calculate hourly sales
      const hourlyMap: Record<string, { revenue: number; orders: number }> = {};
      
      // Initialize hours from 6am to current hour
      for (let h = 6; h <= now.getHours(); h++) {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;
        hourlyMap[hourStr] = { revenue: 0, orders: 0 };
      }

      todayPayments?.forEach((payment) => {
        if (payment.paid_at) {
          const hour = format(new Date(payment.paid_at), 'HH:00');
          if (hourlyMap[hour]) {
            hourlyMap[hour].revenue += Number(payment.amount);
            hourlyMap[hour].orders += 1;
          }
        }
      });

      const hourlySales: HourlySales[] = Object.entries(hourlyMap)
        .map(([hour, data]) => ({
          hour,
          revenue: data.revenue,
          orders: data.orders,
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      // Find peak hour
      const peakHourData = hourlySales.reduce((max, curr) => 
        curr.revenue > max.revenue ? curr : max, 
        { hour: '', revenue: 0, orders: 0 }
      );

      // Count orders by status
      const statusCounts = {
        pendingOrders: 0,
        preparingOrders: 0,
        readyOrders: 0,
        outForDeliveryOrders: 0,
      };

      todayOrders?.forEach((order) => {
        switch (order.status) {
          case 'pending_payment':
          case 'paid':
          case 'confirmed':
            statusCounts.pendingOrders++;
            break;
          case 'preparing':
            statusCounts.preparingOrders++;
            break;
          case 'ready':
            statusCounts.readyOrders++;
            break;
          case 'out_for_delivery':
            statusCounts.outForDeliveryOrders++;
            break;
        }
      });

      // Calculate totals
      const totalRevenue = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalOrders = todayPayments?.length || 0;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Last order time
      const lastOrder = todayOrders?.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // Conversion rate (paid orders / total orders)
      const paidOrders = todayOrders?.filter(o => 
        !['pending_payment', 'cancelled'].includes(o.status)
      ).length || 0;
      const conversionRate = todayOrders && todayOrders.length > 0 
        ? (paidOrders / todayOrders.length) * 100 
        : 0;

      setKpis({
        todaySales: totalRevenue,
        todayOrders: totalOrders,
        averageTicket,
        ...statusCounts,
        hourlySales,
        lastOrderTime: lastOrder ? format(new Date(lastOrder.created_at), 'HH:mm') : null,
        peakHour: peakHourData.revenue > 0 ? peakHourData.hour : null,
        conversionRate,
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchKPIs();

    // Refresh every 30 seconds
    const interval = setInterval(fetchKPIs, 30000);

    return () => clearInterval(interval);
  }, [fetchKPIs]);

  // Listen for real-time updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('kpi-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchKPIs();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchKPIs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchKPIs]);

  return { kpis, isLoading, refetch: fetchKPIs };
}
