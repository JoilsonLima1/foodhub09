import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { OrderStatus } from '@/types/database';

export interface TrackedOrder {
  id: string;
  order_number: number;
  status: OrderStatus;
  origin: string;
  is_delivery: boolean;
  total: number;
  created_at: string;
  updated_at: string;
  estimated_time_minutes: number | null;
  tenant_name: string;
  tenant_logo_url: string | null;
}

export interface OrderHistoryEntry {
  id: string;
  status: OrderStatus;
  created_at: string;
  notes: string | null;
}

export function useOrderTracking(orderNumber: number | null, tenantId?: string) {
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['order-tracking', orderNumber, tenantId],
    queryFn: async (): Promise<TrackedOrder | null> => {
      if (!orderNumber) return null;

      const { data, error } = await supabase
        .rpc('get_public_order_tracking', {
          p_order_number: orderNumber,
          p_tenant_id: tenantId || null,
        });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      return data[0] as TrackedOrder;
    },
    enabled: !!orderNumber,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const historyQuery = useQuery({
    queryKey: ['order-history', orderQuery.data?.id],
    queryFn: async (): Promise<OrderHistoryEntry[]> => {
      if (!orderQuery.data?.id) return [];

      const { data, error } = await supabase
        .rpc('get_public_order_history', {
          p_order_id: orderQuery.data.id,
        });

      if (error) throw error;
      return (data || []) as OrderHistoryEntry[];
    },
    enabled: !!orderQuery.data?.id,
    refetchInterval: 30000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!orderQuery.data?.id) return;

    const channel = supabase
      .channel(`order-tracking-${orderQuery.data.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderQuery.data.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order-tracking', orderNumber] });
          queryClient.invalidateQueries({ queryKey: ['order-history', orderQuery.data?.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${orderQuery.data.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order-history', orderQuery.data?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderQuery.data?.id, orderNumber, queryClient]);

  return {
    order: orderQuery.data,
    history: historyQuery.data || [],
    isLoading: orderQuery.isLoading,
    isError: orderQuery.isError,
    error: orderQuery.error,
    refetch: orderQuery.refetch,
  };
}

// Hook to subscribe to push notifications for an order
export function useOrderPushSubscription() {
  return useMutation({
    mutationFn: async ({
      orderId,
      subscription,
    }: {
      orderId: string;
      subscription: PushSubscription;
    }) => {
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Invalid subscription keys');
      }

      const { error } = await supabase.from('customer_push_subscriptions').insert({
        order_id: orderId,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
        auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
      });

      if (error) throw error;
    },
  });
}
