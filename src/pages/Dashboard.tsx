import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  LayoutDashboard,
} from 'lucide-react';
import { ORDER_STATUS_LABELS, ORDER_ORIGIN_LABELS } from '@/lib/constants';
import type { OrderStatus, OrderOrigin } from '@/types/database';
import { KPIDashboard } from '@/components/dashboard/KPIDashboard';
import { SalesGoalsCard } from '@/components/dashboard/SalesGoalsCard';

interface RecentOrder {
  id: string;
  order_number: number;
  customer_name: string | null;
  total: number;
  status: OrderStatus;
  origin: OrderOrigin;
  created_at: string;
}

export default function Dashboard() {
  const { profile, tenantId } = useAuth();
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentOrders = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: recent } = await supabase
          .from('orders')
          .select('id, order_number, customer_name, total, status, origin, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recent) {
          setRecentOrders(recent as RecentOrder[]);
        }
      } catch (error) {
        console.error('Error fetching recent orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentOrders();

    // Listen for real-time order updates
    if (tenantId) {
      const channel = supabase
        .channel('dashboard-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `tenant_id=eq.${tenantId}`,
          },
          () => {
            fetchRecentOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tenantId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      pending_payment: 'bg-warning/10 text-warning border-warning/20',
      paid: 'bg-info/10 text-info border-info/20',
      confirmed: 'bg-info/10 text-info border-info/20',
      preparing: 'bg-warning/10 text-warning border-warning/20',
      ready: 'bg-success/10 text-success border-success/20',
      out_for_delivery: 'bg-info/10 text-info border-info/20',
      delivered: 'bg-success/10 text-success border-success/20',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return colors[status] || '';
  };

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name || 'Usuário'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao FoodHub09. Configure seu restaurante para começar.
          </p>
        </div>
        
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum restaurante configurado</h3>
            <p className="text-muted-foreground">
              Você ainda não está vinculado a nenhum restaurante. 
              Entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Olá, {profile?.full_name || 'Usuário'}! Aqui está o resumo do seu negócio em tempo real.
        </p>
      </div>

      {/* KPI Dashboard */}
      <KPIDashboard />

      {/* Sales Goals */}
      <SalesGoalsCard />

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum pedido ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        #{order.order_number}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {order.customer_name || 'Cliente anônimo'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ORDER_ORIGIN_LABELS[order.origin]} • {formatTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
