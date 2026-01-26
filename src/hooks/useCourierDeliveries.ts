import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { usePushNotifications } from './usePushNotifications';
import type { Database } from '@/integrations/supabase/types';

type DeliveryStatus = Database['public']['Enums']['delivery_status'];

interface DeliveryWithOrder {
  id: string;
  status: DeliveryStatus;
  courier_id: string | null;
  created_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  delivery_notes: string | null;
  order: {
    id: string;
    order_number: number;
    customer_name: string | null;
    customer_phone: string | null;
    delivery_address: string | null;
    delivery_neighborhood: string | null;
    delivery_city: string | null;
    total: number;
    notes: string | null;
  };
}

interface CourierStats {
  total: number;
  pending: number;
  inRoute: number;
  completed: number;
}

export function useCourierDeliveries() {
  const { user, tenantId } = useAuth();
  const { notifyNewDelivery } = usePushNotifications();
  const [deliveries, setDeliveries] = useState<DeliveryWithOrder[]>([]);
  const [stats, setStats] = useState<CourierStats>({ total: 0, pending: 0, inRoute: 0, completed: 0 });
  const [courierId, setCourierId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const previousDeliveryIdsRef = useRef<Set<string>>(new Set());

  // Buscar o courier_id vinculado ao usuário
  const fetchCourierId = useCallback(async () => {
    if (!user || !tenantId) return null;

    const { data } = await supabase
      .from('couriers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    return data?.id || null;
  }, [user, tenantId]);

  const fetchDeliveries = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const cId = await fetchCourierId();
      setCourierId(cId);

      if (!cId) {
        setDeliveries([]);
        setStats({ total: 0, pending: 0, inRoute: 0, completed: 0 });
        return;
      }

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          status,
          courier_id,
          created_at,
          picked_up_at,
          delivered_at,
          delivery_notes,
          order:orders!inner(
            id,
            order_number,
            customer_name,
            customer_phone,
            delivery_address,
            delivery_neighborhood,
            delivery_city,
            total,
            notes
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('courier_id', cId)
        .gte('created_at', startOfToday)
        .lte('created_at', endOfToday)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedDeliveries = (data || []).map(d => ({
        ...d,
        order: Array.isArray(d.order) ? d.order[0] : d.order,
      })) as DeliveryWithOrder[];

      setDeliveries(typedDeliveries);

      // Calcular estatísticas
      const pending = typedDeliveries.filter(d => ['pending', 'assigned', 'picked_up'].includes(d.status)).length;
      const inRoute = typedDeliveries.filter(d => d.status === 'in_route').length;
      const completed = typedDeliveries.filter(d => d.status === 'delivered').length;

      setStats({
        total: typedDeliveries.length,
        pending,
        inRoute,
        completed,
      });
    } catch (error) {
      console.error('Erro ao buscar entregas:', error);
      toast.error('Erro ao carregar entregas');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, fetchCourierId]);

  const updateDeliveryStatus = useCallback(async (deliveryId: string, newStatus: DeliveryStatus) => {
    try {
      const updateData: { status: DeliveryStatus; picked_up_at?: string; delivered_at?: string } = {
        status: newStatus,
      };

      if (newStatus === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId);

      if (error) throw error;

      const statusLabels: Record<DeliveryStatus, string> = {
        pending: 'Pendente',
        assigned: 'Atribuída',
        picked_up: 'Coletada',
        in_route: 'Em Rota',
        delivered: 'Entregue',
        failed: 'Falhou',
      };

      toast.success(`Status atualizado: ${statusLabels[newStatus]}`);
      fetchDeliveries();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  }, [fetchDeliveries]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Realtime updates with push notifications
  useEffect(() => {
    if (!tenantId || !courierId) return;

    const channel = supabase
      .channel('courier-deliveries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deliveries',
          filter: `tenant_id=eq.${tenantId}`,
        },
        async (payload) => {
          const newDelivery = payload.new as { id: string; courier_id: string | null; order_id: string };
          
          // Verificar se é uma nova entrega para este courier
          if (newDelivery.courier_id === courierId && !previousDeliveryIdsRef.current.has(newDelivery.id)) {
            // Buscar detalhes do pedido para a notificação
            const { data: order } = await supabase
              .from('orders')
              .select('order_number, customer_name, delivery_address')
              .eq('id', newDelivery.order_id)
              .single();

            if (order) {
              notifyNewDelivery(order.order_number, order.customer_name, order.delivery_address);
              toast.info(`Nova entrega atribuída: Pedido #${order.order_number}`);
            }
            
            fetchDeliveries();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const updatedDelivery = payload.new as { courier_id: string | null };
          
          // Verificar se a entrega foi atribuída a este courier
          if (updatedDelivery.courier_id === courierId) {
            fetchDeliveries();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, courierId, fetchDeliveries, notifyNewDelivery]);

  // Atualizar referência de IDs anteriores
  useEffect(() => {
    previousDeliveryIdsRef.current = new Set(deliveries.map(d => d.id));
  }, [deliveries]);

  return {
    deliveries,
    stats,
    courierId,
    isLoading,
    updateDeliveryStatus,
    refetch: fetchDeliveries,
  };
}
