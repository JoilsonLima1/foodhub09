import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { useBusinessCategoryContext } from '@/contexts/BusinessCategoryContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  LayoutDashboard,
  Building2,
} from 'lucide-react';
import { ORDER_STATUS_LABELS, ORDER_ORIGIN_LABELS } from '@/lib/constants';
import type { OrderStatus, OrderOrigin } from '@/types/database';
import { KPIDashboard } from '@/components/dashboard/KPIDashboard';
import { SalesGoalsCard } from '@/components/dashboard/SalesGoalsCard';
import { SalesForecastCard } from '@/components/dashboard/SalesForecastCard';
import { ForecastAccuracyCard } from '@/components/dashboard/ForecastAccuracyCard';
import { YesterdayComparisonCard } from '@/components/dashboard/YesterdayComparisonCard';
import { TopProductsTodayCard } from '@/components/dashboard/TopProductsTodayCard';
import { LowStockAlertCard } from '@/components/dashboard/LowStockAlertCard';
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
  const { activeStore, activeStoreId, isLoading: isLoadingStore } = useActiveStore();
  const { t } = useBusinessCategoryContext();
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentOrders = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        // Use orders_safe view for PII masking based on user roles
        const { data: recent } = await supabase
          .from('orders_safe')
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

  // Only show "no restaurant" message if user truly has no tenant
  // This should rarely happen as bootstrap-user creates the HQ store
  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name || 'Usuário'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao FoodHub09. Aguarde a configuração inicial...
          </p>
        </div>
        
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configuração em andamento</h3>
            <p className="text-muted-foreground">
              Seu estabelecimento está sendo configurado. 
              Se este problema persistir, entre em contato com o suporte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}! 
            {activeStore && (
              <>
                <span className="mx-1">•</span>
                <Building2 className="h-3 w-3" />
                <span>{activeStore.name}</span>
                {activeStore.is_headquarters && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">Matriz</Badge>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* KPI Dashboard */}
      <KPIDashboard />

      {/* Quick Insights Row */}
      <div className="grid gap-3 md:grid-cols-3">
        <YesterdayComparisonCard />
        <TopProductsTodayCard />
        <LowStockAlertCard />
      </div>

      {/* Sales Goals */}
      <SalesGoalsCard />

      {/* Sales Forecast and Accuracy */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SalesForecastCard />
        <ForecastAccuracyCard />
      </div>

      {/* Recent Orders - Compact */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-medium">{t('order')}s Recentes</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {recentOrders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ShoppingCart className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
              <p className="text-xs">Nenhum {t('order').toLowerCase()} ainda</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">
                        #{order.order_number}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium">
                        {order.customer_name || 'Cliente anônimo'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {ORDER_ORIGIN_LABELS[order.origin]} • {formatTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold">{formatCurrency(order.total)}</p>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getStatusColor(order.status))}>
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
