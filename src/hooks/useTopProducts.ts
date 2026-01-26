import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export function useTopProducts(days: number = 7, limit: number = 10) {
  const { tenantId } = useAuth();
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTopProducts = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), days - 1));

      // Fetch order items with orders to filter by date
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          product_name,
          quantity,
          total_price,
          order:orders!inner (
            id,
            status,
            created_at,
            tenant_id
          )
        `)
        .eq('order.tenant_id', tenantId)
        .gte('order.created_at', startDate.toISOString())
        .lte('order.created_at', endDate.toISOString())
        .in('order.status', ['paid', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']);

      if (error) throw error;

      // Aggregate by product
      const productTotals: Record<string, TopProduct> = {};

      orderItems?.forEach((item) => {
        const key = item.product_id || item.product_name;
        if (!productTotals[key]) {
          productTotals[key] = {
            productId: item.product_id || '',
            productName: item.product_name,
            quantity: 0,
            revenue: 0,
          };
        }
        productTotals[key].quantity += item.quantity;
        productTotals[key].revenue += Number(item.total_price);
      });

      // Sort by quantity and take top N
      const sorted = Object.values(productTotals)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);

      setProducts(sorted);
    } catch (error) {
      console.error('Error fetching top products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopProducts();
  }, [tenantId, days, limit]);

  return { products, isLoading, refetch: fetchTopProducts };
}
