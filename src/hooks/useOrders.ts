import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderStatus, OrderOrigin, PaymentMethod } from '@/types/database';

export interface OrderWithDetails {
  id: string;
  order_number: number;
  status: OrderStatus;
  origin: OrderOrigin;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  is_delivery: boolean;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  items: {
    id: string;
    product_name: string;
    variation_name: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string | null;
  }[];
  payments: {
    id: string;
    payment_method: PaymentMethod;
    amount: number;
    status: string;
  }[];
}

export function useOrders(dateFilter?: 'today' | 'week' | 'month') {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['orders', tenantId, dateFilter],
    queryFn: async (): Promise<OrderWithDetails[]> => {
      if (!tenantId) return [];

      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          origin,
          customer_name,
          customer_phone,
          subtotal,
          delivery_fee,
          discount,
          total,
          is_delivery,
          delivery_address,
          notes,
          created_at,
          order_items (
            id,
            product_name,
            variation_name,
            quantity,
            unit_price,
            total_price,
            notes
          ),
          payments (
            id,
            payment_method,
            amount,
            status
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(order => ({
        ...order,
        items: order.order_items || [],
        payments: order.payments || [],
      })) as OrderWithDetails[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });
}
