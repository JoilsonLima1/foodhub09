import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import { useDayOfWeekReport } from '@/hooks/useDayOfWeekReport';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

interface Props {
  daysBack?: number;
}

export function DayOfWeekChart({ daysBack = 30 }: Props) {
  const { data, bestDay, worstDay, isLoading } = useDayOfWeekReport(daysBack);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.totalRevenue));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Desempenho por Dia da Semana
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          {bestDay && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              <TrendingUp className="h-3 w-3 mr-1" />
              Melhor: {bestDay.dayName} ({formatCurrency(bestDay.totalRevenue)})
            </Badge>
          )}
          {worstDay && worstDay.dayIndex !== bestDay?.dayIndex && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <TrendingDown className="h-3 w-3 mr-1" />
              Menor: {worstDay.dayName} ({formatCurrency(worstDay.totalRevenue)})
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.every(d => d.totalRevenue === 0) ? (
          <div className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma venda registrada nos últimos {daysBack} dias</p>
          </div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="dayShort"
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm">
                          <div className="font-medium">{data.dayName}</div>
                          <div className="text-primary font-bold mt-1">
                            {formatCurrency(data.totalRevenue)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {data.orderCount} pedidos
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Ticket médio: {formatCurrency(data.averageTicket)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.dayIndex === bestDay?.dayIndex
                          ? 'hsl(var(--success))'
                          : entry.totalRevenue === maxRevenue * 0
                          ? 'hsl(var(--muted))'
                          : 'hsl(var(--primary))'
                      }
                      fillOpacity={entry.totalRevenue / maxRevenue || 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">Dia</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Receita</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Pedidos</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Ticket Médio</th>
              </tr>
            </thead>
            <tbody>
              {data.map((day) => (
                <tr
                  key={day.dayIndex}
                  className={`border-b ${
                    day.dayIndex === bestDay?.dayIndex ? 'bg-success/5' : ''
                  }`}
                >
                  <td className="py-2 font-medium">{day.dayName}</td>
                  <td className="text-right py-2">{formatCurrency(day.totalRevenue)}</td>
                  <td className="text-right py-2">{day.orderCount}</td>
                  <td className="text-right py-2">{formatCurrency(day.averageTicket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
