import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  ChefHat,
  CheckCircle,
  Bell,
  Timer,
} from 'lucide-react';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import type { OrderStatus } from '@/types/database';

interface KitchenOrder {
  id: string;
  order_number: number;
  customer_name: string | null;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  order_items: {
    id: string;
    product_name: string;
    variation_name: string | null;
    quantity: number;
    notes: string | null;
  }[];
}

const KITCHEN_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready'];

export default function Kitchen() {
  const { tenantId } = useAuth();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    if (!tenantId) return;

    try {
      // Use orders_safe view for PII masking (kitchen role gets masked customer data)
      const { data, error } = await supabase
        .from('orders_safe')
        .select(`
          id,
          order_number,
          customer_name,
          status,
          notes,
          created_at,
          order_items (
            id,
            product_name,
            variation_name,
            quantity,
            notes
          )
        `)
        .eq('tenant_id', tenantId)
        .in('status', KITCHEN_STATUSES)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(data as KitchenOrder[]);
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Add to status history
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}min`;
  };

  const getColumnOrders = (status: OrderStatus) => 
    orders.filter(order => order.status === status);

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<string, string> = {
      confirmed: 'border-info bg-info/5',
      preparing: 'border-warning bg-warning/5',
      ready: 'border-success bg-success/5',
    };
    return colors[status] || '';
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const flow: Record<string, OrderStatus> = {
      confirmed: 'preparing',
      preparing: 'ready',
    };
    return flow[currentStatus] || null;
  };

  const getNextStatusLabel = (currentStatus: OrderStatus) => {
    const labels: Record<string, string> = {
      confirmed: 'Iniciar Preparo',
      preparing: 'Marcar Pronto',
    };
    return labels[currentStatus] || '';
  };

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhum restaurante configurado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            Cozinha
          </h1>
          <p className="text-muted-foreground">
            Painel de produção em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          {orders.length} pedido(s) ativos
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full overflow-hidden">
        {KITCHEN_STATUSES.map((status) => (
          <div key={status} className="flex flex-col h-full">
            <div className={`rounded-t-lg px-4 py-3 border-b-2 ${getStatusColor(status)}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{ORDER_STATUS_LABELS[status]}</h2>
                <Badge variant="secondary">
                  {getColumnOrders(status).length}
                </Badge>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 bg-muted/30 rounded-b-lg space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="h-32" />
                    </Card>
                  ))}
                </div>
              ) : getColumnOrders(status).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum pedido</p>
                </div>
              ) : (
                getColumnOrders(status).map((order) => (
                  <Card key={order.id} className="kanban-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">#{order.order_number}</span>
                        <Badge variant="outline" className="text-xs">
                          <Timer className="h-3 w-3 mr-1" />
                          {getTimeAgo(order.created_at)}
                        </Badge>
                      </div>
                    </div>

                    {order.customer_name && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {order.customer_name}
                      </p>
                    )}

                    {/* Items */}
                    <div className="space-y-2 mb-3">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.quantity}x</span>
                            <span>{item.product_name}</span>
                            {item.variation_name && (
                              <span className="text-muted-foreground">
                                ({item.variation_name})
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-xs text-warning ml-6 mt-0.5">
                              Obs: {item.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="text-sm bg-warning/10 text-warning rounded px-2 py-1 mb-3">
                        📝 {order.notes}
                      </div>
                    )}

                    {/* Action Button */}
                    {getNextStatus(status) && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => updateOrderStatus(order.id, getNextStatus(status)!)}
                      >
                        {getNextStatusLabel(status)}
                      </Button>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
