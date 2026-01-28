import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCategoryContext } from '@/contexts/BusinessCategoryContext';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Search,
  RefreshCw,
  ChefHat,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { OrderCard } from '@/components/orders/OrderCard';
import { useOrders, type OrderWithDetails } from '@/hooks/useOrders';
import { useOrderSound } from '@/hooks/useOrderSound';
import { toast } from '@/hooks/use-toast';
import type { OrderStatus } from '@/types/database';

export default function Orders() {
  const { tenantId, user } = useAuth();
  const { t } = useBusinessCategoryContext();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading, refetch } = useOrders('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playNotificationSound } = useOrderSound();
  const previousOrderCountRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);

  // Setup realtime subscription with sound alerts
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('New order received:', payload);
          
          // Play sound for new orders
          if (soundEnabled && !isFirstLoadRef.current) {
            playNotificationSound();
            toast({
              title: '🔔 Novo pedido!',
              description: `Pedido #${payload.new.order_number} recebido`,
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient, soundEnabled, playNotificationSound]);

  // Track first load to avoid sound on initial page load
  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      if (isFirstLoadRef.current) {
        previousOrderCountRef.current = orders.length;
        isFirstLoadRef.current = false;
      }
    }
  }, [orders, isLoading]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Create status history entry
      await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: newStatus,
          changed_by: user?.id,
          notes: `Status alterado para ${newStatus}`,
        });

      toast({
        title: 'Status atualizado!',
        description: `Pedido movido para ${newStatus}`,
      });

      refetch();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !searchTerm || 
      order.order_number.toString().includes(searchTerm) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group orders by status for Kanban view
  const ordersByStatus = {
    paid: filteredOrders.filter(o => o.status === 'paid'),
    preparing: filteredOrders.filter(o => o.status === 'preparing'),
    ready: filteredOrders.filter(o => o.status === 'ready'),
    delivered: filteredOrders.filter(o => o.status === 'delivered' || o.status === 'out_for_delivery'),
  };

  const totalToday = orders.reduce((sum, o) => sum + o.total, 0);
  const ordersCount = orders.length;

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhum restaurante configurado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {t('order')}s do Dia
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-green-500" />
              Tempo Real
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            {ordersCount} {ordersCount === 1 ? t('order').toLowerCase() : t('order').toLowerCase() + 's'} • Total: {formatCurrency(totalToday)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-primary" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="sound-toggle" className="text-sm">Som</Label>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou cliente..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="preparing">Preparando</SelectItem>
                <SelectItem value="ready">Pronto</SelectItem>
                <SelectItem value="out_for_delivery">Saiu para Entrega</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders View */}
      <Tabs defaultValue="kanban" className="w-full">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4">
                  <div className="h-8 bg-muted rounded animate-pulse" />
                  <div className="h-32 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Paid Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="font-semibold">Pago</span>
                  <Badge variant="secondary">{ordersByStatus.paid.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[200px] bg-muted/30 rounded-lg p-2">
                  {ordersByStatus.paid.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                  {ordersByStatus.paid.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Nenhum pedido
                    </p>
                  )}
                </div>
              </div>

              {/* Preparing Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="font-semibold">Preparando</span>
                  <Badge variant="secondary">{ordersByStatus.preparing.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[200px] bg-muted/30 rounded-lg p-2">
                  {ordersByStatus.preparing.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                  {ordersByStatus.preparing.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Nenhum pedido
                    </p>
                  )}
                </div>
              </div>

              {/* Ready Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-semibold">Pronto</span>
                  <Badge variant="secondary">{ordersByStatus.ready.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[200px] bg-muted/30 rounded-lg p-2">
                  {ordersByStatus.ready.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                  {ordersByStatus.ready.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Nenhum pedido
                    </p>
                  )}
                </div>
              </div>

              {/* Delivered Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-600" />
                  <span className="font-semibold">Finalizados</span>
                  <Badge variant="secondary">{ordersByStatus.delivered.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[200px] bg-muted/30 rounded-lg p-2 max-h-[600px] overflow-y-auto">
                  {ordersByStatus.delivered.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                  {ordersByStatus.delivered.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Nenhum pedido
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-24" />
                </Card>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum {t('order').toLowerCase()} encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Tente ajustar os filtros'
                    : `Os ${t('order').toLowerCase()}s de hoje aparecerão aqui`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
