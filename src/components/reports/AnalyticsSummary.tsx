import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Clock, 
  Calendar,
  Target,
  Zap,
} from 'lucide-react';
import { useDayOfWeekReport } from '@/hooks/useDayOfWeekReport';
import { useHourlyReport } from '@/hooks/useHourlyReport';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsSummaryProps {
  daysBack: number;
  salesReport?: {
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
  } | null;
  comparison?: {
    revenueChange: number;
    ordersChange: number;
    ticketChange: number;
  } | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function AnalyticsSummary({ daysBack, salesReport, comparison }: AnalyticsSummaryProps) {
  const { bestDay, worstDay, isLoading: dayLoading } = useDayOfWeekReport(daysBack);
  const { peakHour, isLoading: hourLoading } = useHourlyReport(daysBack);

  if (dayLoading || hourLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const insights = [
    {
      title: 'Melhor Dia',
      icon: Calendar,
      value: bestDay?.dayName || '-',
      subtitle: bestDay ? formatCurrency(bestDay.totalRevenue) : '-',
      badge: bestDay ? `${bestDay.orderCount} pedidos` : undefined,
      color: 'text-green-600',
    },
    {
      title: 'Horário de Pico',
      icon: Clock,
      value: peakHour?.hourLabel || '-',
      subtitle: peakHour ? formatCurrency(peakHour.totalRevenue) : '-',
      badge: peakHour ? `${peakHour.orderCount} pedidos` : undefined,
      color: 'text-blue-600',
    },
    {
      title: 'Crescimento',
      icon: comparison && comparison.revenueChange >= 0 ? TrendingUp : TrendingDown,
      value: comparison ? `${comparison.revenueChange >= 0 ? '+' : ''}${comparison.revenueChange.toFixed(1)}%` : '-',
      subtitle: 'vs período anterior',
      badge: comparison && comparison.revenueChange >= 0 ? 'Positivo' : 'Negativo',
      color: comparison && comparison.revenueChange >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Ticket Médio',
      icon: Target,
      value: salesReport ? formatCurrency(salesReport.averageTicket) : '-',
      subtitle: comparison ? `${comparison.ticketChange >= 0 ? '+' : ''}${comparison.ticketChange.toFixed(1)}%` : '-',
      badge: salesReport ? `${salesReport.totalOrders} pedidos` : undefined,
      color: 'text-primary',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight) => (
        <Card key={insight.title} className="border-l-4 border-l-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {insight.title}
            </CardTitle>
            <insight.icon className={`h-4 w-4 ${insight.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${insight.color}`}>
              {insight.value}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{insight.subtitle}</p>
              {insight.badge && (
                <Badge variant="secondary" className="text-xs">
                  {insight.badge}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
