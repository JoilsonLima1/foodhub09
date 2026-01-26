import { useSalesForecast } from '@/hooks/useSalesForecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Brain,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function SalesForecastCard() {
  const {
    forecast,
    trend,
    analysis,
    weeklyPrediction,
    historicalAverage,
    isSimpleForecast,
    isLoading,
    error,
    refetch,
  } = useSalesForecast();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getTrendIcon = () => {
    switch (trend) {
      case 'growing':
        return <TrendingUp className="h-5 w-5 text-success" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-destructive" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case 'growing':
        return { label: 'Em Crescimento', variant: 'default' as const };
      case 'declining':
        return { label: 'Em Queda', variant: 'destructive' as const };
      default:
        return { label: 'Estável', variant: 'secondary' as const };
    }
  };

  const chartData = forecast.map((f) => ({
    name: f.dayOfWeek,
    date: f.date,
    valor: f.predictedAmount,
    confianca: Math.round(f.confidence * 100),
  }));

  if (error && !forecast.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5" />
            Previsão de Vendas (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-muted-foreground py-4">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Previsão de Vendas (IA)</CardTitle>
          {isSimpleForecast && (
            <Badge variant="outline" className="text-xs">
              Baseado em médias
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refetch}
          disabled={isLoading}
          title="Atualizar previsão"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !forecast.length ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Previsão 7 dias</p>
                <p className="text-2xl font-bold">{formatCurrency(weeklyPrediction)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tendência</p>
                <div className="flex items-center gap-2">
                  {getTrendIcon()}
                  <Badge variant={getTrendLabel().variant}>{getTrendLabel().label}</Badge>
                </div>
              </div>
            </div>

            {/* Gráfico */}
            {chartData.length > 0 && (
              <div className="h-[180px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      width={50}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Previsão']}
                      labelFormatter={(label, payload) => {
                        if (payload?.[0]?.payload?.date) {
                          return `${label} - ${new Date(payload[0].payload.date).toLocaleDateString('pt-BR')}`;
                        }
                        return label;
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorValor)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Análise da IA */}
            {analysis && (
              <div className="bg-muted/30 rounded-lg p-3 mt-3">
                <p className="text-sm text-muted-foreground">{analysis}</p>
              </div>
            )}

            {/* Média histórica */}
            {historicalAverage > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Média diária histórica: {formatCurrency(historicalAverage)}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
