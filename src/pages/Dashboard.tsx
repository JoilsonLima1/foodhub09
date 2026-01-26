import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Package,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { ORDER_STATUS_LABELS, ORDER_ORIGIN_LABELS } from '@/lib/constants';
import type { OrderStatus, OrderOrigin } from '@/types/database';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  weeklyGrowth: number;
}

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
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    weeklyGrowth: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch today's orders
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('total, status')
          .eq('tenant_id', tenantId)
          .gte('created_at', today.toISOString());

        if (todayOrders) {
          const completedOrders = todayOrders.filter(o => 
            ['paid', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(o.status)
          );
          setStats(prev => ({
            ...prev,
            todaySales: completedOrders.reduce((sum, o) => sum + Number(o.total), 0),
            todayOrders: todayOrders.length,
          }));
        }

        // Fetch pending orders
        const { count: pendingCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['pending_payment', 'paid', 'confirmed', 'preparing']);

        setStats(prev => ({
          ...prev,
          pendingOrders: pendingCount || 0,
        }));

        // Fetch low stock items
        const { data: lowStock } = await supabase
          .from('ingredients')
          .select('id')
          .eq('tenant_id', tenantId);

        if (lowStock) {
          const lowStockCount = lowStock.filter((item: any) => 
            item.current_stock <= item.min_stock
          ).length;
          setStats(prev => ({
            ...prev,
            lowStockItems: lowStockCount,
          }));
        }

        // Fetch recent orders
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
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
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
            Bem-vindo ao FoodHub. Configure seu restaurante para começar.
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
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {profile?.full_name || 'Usuário'}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o resumo do seu negócio hoje.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todaySales)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-success" />
              {stats.todayOrders} pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Hoje
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Novos pedidos recebidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando processamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estoque Baixo
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Itens abaixo do mínimo
            </p>
          </CardContent>
        </Card>
      </div>

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
