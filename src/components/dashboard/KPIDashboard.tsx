import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  Zap,
  Timer,
  Target,
  Activity,
  ChefHat,
  Truck,
  CheckCircle,
} from 'lucide-react';
import { useRealtimeKPIs } from '@/hooks/useRealtimeKPIs';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function KPIDashboard() {
  const { kpis, isLoading } = useRealtimeKPIs();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(kpis.todaySales)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.todayOrders} pedidos pagos
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.averageTicket)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor médio por pedido
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
            <Target className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pedidos concluídos
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Horário de Pico
            </CardTitle>
            <Zap className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.peakHour || '--:--'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.lastOrderTime ? `Último pedido: ${kpis.lastOrderTime}` : 'Aguardando pedidos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pipeline de Pedidos em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.pendingOrders}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-info/10 border border-info/20">
              <div className="h-10 w-10 rounded-full bg-info/20 flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.preparingOrders}</p>
                <p className="text-sm text-muted-foreground">Preparando</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.readyOrders}</p>
                <p className="text-sm text-muted-foreground">Prontos</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.outForDeliveryOrders}</p>
                <p className="text-sm text-muted-foreground">Em Entrega</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Vendas por Hora (Hoje)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kpis.hourlySales.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma venda registrada hoje ainda</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={kpis.hourlySales}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="hour"
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        currency: 'BRL',
                      }).format(value)
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="font-medium">{label}</div>
                            <div className="text-primary font-bold">
                              {formatCurrency(payload[0].value as number)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payload[0].payload.orders} pedidos
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
