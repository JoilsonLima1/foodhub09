import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  ChefHat,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIFoodIntegration } from '@/hooks/useIFoodIntegration';

interface IFoodOrder {
  id: string;
  ifood_order_id: string;
  ifood_short_id: string | null;
  status: string;
  customer_name: string | null;
  total: number | null;
  created_at: string;
  items: unknown;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PLACED: { label: 'Novo', color: 'bg-blue-500', icon: Package },
  CONFIRMED: { label: 'Confirmado', color: 'bg-yellow-500', icon: Clock },
  PREPARATION_STARTED: { label: 'Preparando', color: 'bg-orange-500', icon: ChefHat },
  READY_TO_PICKUP: { label: 'Pronto', color: 'bg-purple-500', icon: Package },
  DISPATCHED: { label: 'Despachado', color: 'bg-indigo-500', icon: Truck },
  CONCLUDED: { label: 'Concluído', color: 'bg-green-500', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500', icon: XCircle },
};

export function IFoodOrdersPanel() {
  const { updateOrderStatus } = useIFoodIntegration();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['ifood-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ifood_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as IFoodOrder[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const handleStatusUpdate = async (ifoodOrderId: string, newStatus: string) => {
    setUpdatingOrderId(ifoodOrderId);
    try {
      await updateOrderStatus.mutateAsync({ ifood_order_id: ifoodOrderId, status: newStatus });
      refetch();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getNextStatus = (currentStatus: string): { status: string; label: string } | null => {
    const flow: Record<string, { status: string; label: string }> = {
      PLACED: { status: 'CONFIRMED', label: 'Confirmar' },
      CONFIRMED: { status: 'PREPARATION_STARTED', label: 'Iniciar Preparo' },
      PREPARATION_STARTED: { status: 'READY_TO_PICKUP', label: 'Pronto p/ Coleta' },
      READY_TO_PICKUP: { status: 'DISPATCHED', label: 'Despachar' },
    };
    return flow[currentStatus] || null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos iFood</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="text-red-600 font-bold">iF</span>
          Pedidos iFood
          {orders && orders.length > 0 && (
            <Badge variant="secondary">{orders.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {!orders || orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum pedido iFood recente</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {orders.map((order) => {
                const config = statusConfig[order.status] || statusConfig.PLACED;
                const StatusIcon = config.icon;
                const nextAction = getNextStatus(order.status);
                const items = order.items as Array<{ name: string; quantity: number }> | null;

                return (
                  <Card key={order.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">
                            #{order.ifood_short_id || order.ifood_order_id.slice(-6)}
                          </span>
                          <Badge className={`${config.color} text-white text-xs`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground truncate">
                          {order.customer_name || 'Cliente'}
                        </p>
                        
                        {items && items.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {items.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                            {items.length > 2 && ` +${items.length - 2}`}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(order.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                          <span className="font-medium text-foreground">
                            R$ {(order.total || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        {nextAction && (
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-7"
                            disabled={updatingOrderId === order.ifood_order_id}
                            onClick={() => handleStatusUpdate(order.ifood_order_id, nextAction.status)}
                          >
                            {nextAction.label}
                          </Button>
                        )}
                        {order.status === 'PLACED' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-7"
                            disabled={updatingOrderId === order.ifood_order_id}
                            onClick={() => handleStatusUpdate(order.ifood_order_id, 'CANCELLED')}
                          >
                            Recusar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
