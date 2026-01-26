import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface SalesByPaymentMethod {
  method: string;
  label: string;
  total: number;
  count: number;
}

interface DailySales {
  date: string;
  total: number;
  count: number;
}

interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  byPaymentMethod: SalesByPaymentMethod[];
  dailySales: DailySales[];
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Crédito',
  debit_card: 'Débito',
  voucher: 'Voucher',
  mixed: 'Misto',
};

export function useSalesReport(days: number = 7) {
  const { tenantId } = useAuth();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), days - 1));

      // Fetch payments with orders for the period
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          paid_at,
          status,
          order:orders!inner (
            id,
            total,
            status,
            created_at
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('paid_at', startDate.toISOString())
        .lte('paid_at', endDate.toISOString());

      if (error) throw error;

      // Calculate totals by payment method
      const methodTotals: Record<string, { total: number; count: number }> = {};
      
      payments?.forEach((payment) => {
        const method = payment.payment_method;
        if (!methodTotals[method]) {
          methodTotals[method] = { total: 0, count: 0 };
        }
        methodTotals[method].total += Number(payment.amount);
        methodTotals[method].count += 1;
      });

      const byPaymentMethod: SalesByPaymentMethod[] = Object.entries(methodTotals).map(
        ([method, data]) => ({
          method,
          label: PAYMENT_METHOD_LABELS[method] || method,
          total: data.total,
          count: data.count,
        })
      );

      // Calculate daily sales
      const dailyTotals: Record<string, { total: number; count: number }> = {};
      
      // Initialize all days in the range
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        dailyTotals[date] = { total: 0, count: 0 };
      }

      payments?.forEach((payment) => {
        if (payment.paid_at) {
          const date = format(new Date(payment.paid_at), 'yyyy-MM-dd');
          if (dailyTotals[date]) {
            dailyTotals[date].total += Number(payment.amount);
            dailyTotals[date].count += 1;
          }
        }
      });

      const dailySales: DailySales[] = Object.entries(dailyTotals).map(
        ([date, data]) => ({
          date: format(new Date(date), 'dd/MM'),
          total: data.total,
          count: data.count,
        })
      );

      // Calculate overall totals
      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalOrders = payments?.length || 0;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setReport({
        totalRevenue,
        totalOrders,
        averageTicket,
        byPaymentMethod,
        dailySales,
      });
    } catch (error) {
      console.error('Error fetching sales report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [tenantId, days]);

  return { report, isLoading, refetch: fetchReport };
}
