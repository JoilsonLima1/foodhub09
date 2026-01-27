import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp } from 'lucide-react';
import { useHourlyReport } from '@/hooks/useHourlyReport';
import { Skeleton } from '@/components/ui/skeleton';

interface HourlyChartProps {
  daysBack: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function HourlyChart({ daysBack }: HourlyChartProps) {
  const { data, peakHour, isLoading } = useHourlyReport(daysBack);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[300px] w-full" />
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
              <Clock className="h-5 w-5" />
              Vendas por Hora
            </CardTitle>
            <CardDescription>Distribuição do faturamento ao longo do dia</CardDescription>
          </div>
          {peakHour && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Pico: {peakHour.hourLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="hourLabel"
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) => `R$${value}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="font-medium">{label}</div>
                        <div className="text-primary font-bold text-lg">
                          {formatCurrency(payload[0].value as number)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payload[0].payload.orderCount} pedidos
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ticket médio: {formatCurrency(payload[0].payload.averageTicket)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="totalRevenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
