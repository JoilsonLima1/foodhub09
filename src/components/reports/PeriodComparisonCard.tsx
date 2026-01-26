import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodData {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
}

interface PeriodComparisonProps {
  current: PeriodData;
  previous: PeriodData;
  revenueChange: number;
  ordersChange: number;
  ticketChange: number;
  periodLabel: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const formatPercent = (value: number) => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

function ChangeIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center text-success text-sm font-medium">
        <ArrowUpRight className="h-4 w-4" />
        {formatPercent(value)}
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="flex items-center text-destructive text-sm font-medium">
        <ArrowDownRight className="h-4 w-4" />
        {formatPercent(value)}
      </span>
    );
  }
  return (
    <span className="flex items-center text-muted-foreground text-sm font-medium">
      <Minus className="h-4 w-4" />
      0%
    </span>
  );
}

export function PeriodComparisonCard({
  current,
  previous,
  revenueChange,
  ordersChange,
  ticketChange,
  periodLabel,
}: PeriodComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Comparativo de Períodos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {periodLabel} atual vs período anterior
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Revenue Comparison */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Faturamento</span>
              <ChangeIndicator value={revenueChange} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Atual:</span>
                <span className="font-bold text-lg">{formatCurrency(current.totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Anterior:</span>
                <span className="text-sm text-muted-foreground">{formatCurrency(previous.totalRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Orders Comparison */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pedidos</span>
              <ChangeIndicator value={ordersChange} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Atual:</span>
                <span className="font-bold text-lg">{current.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Anterior:</span>
                <span className="text-sm text-muted-foreground">{previous.totalOrders}</span>
              </div>
            </div>
          </div>

          {/* Ticket Comparison */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Ticket Médio</span>
              <ChangeIndicator value={ticketChange} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Atual:</span>
                <span className="font-bold text-lg">{formatCurrency(current.averageTicket)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Anterior:</span>
                <span className="text-sm text-muted-foreground">{formatCurrency(previous.averageTicket)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
