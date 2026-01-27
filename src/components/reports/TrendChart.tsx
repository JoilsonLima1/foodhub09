import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useTrendReport } from '@/hooks/useTrendReport';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendChartProps {
  weeks?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function TrendChart({ weeks = 8 }: TrendChartProps) {
  const { data, overallGrowth, isLoading } = useTrendReport(weeks);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Sem dados suficientes para análise de tendência</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tendência Semanal
            </CardTitle>
            <CardDescription>Evolução do faturamento nas últimas {weeks} semanas</CardDescription>
          </div>
          {overallGrowth !== null && (
            <Badge 
              variant={overallGrowth >= 0 ? "default" : "destructive"} 
              className="flex items-center gap-1"
            >
              {overallGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {overallGrowth >= 0 ? '+' : ''}{overallGrowth.toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="weekLabel"
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) => `R$${value}`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) => `${value}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="font-medium">Semana de {label}</div>
                        <div className="text-primary font-bold text-lg">
                          {formatCurrency(data.totalRevenue)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {data.orderCount} pedidos
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Ticket: {formatCurrency(data.averageTicket)}
                        </div>
                        {data.growthRate !== null && (
                          <div className={`text-sm ${data.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.growthRate >= 0 ? '↑' : '↓'} {Math.abs(data.growthRate).toFixed(1)}% vs semana anterior
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="totalRevenue"
                name="Faturamento"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orderCount"
                name="Pedidos"
                stroke="hsl(var(--chart-2, 173 58% 39%))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2, 173 58% 39%))', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
