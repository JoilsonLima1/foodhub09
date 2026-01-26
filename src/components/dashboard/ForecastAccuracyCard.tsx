import { useForecastAccuracy } from '@/hooks/useForecastAccuracy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

export function ForecastAccuracyCard() {
  const { stats, isLoading, error } = useForecastAccuracy();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'hsl(var(--success))';
    if (accuracy >= 70) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 90) return { label: 'Excelente', variant: 'default' as const };
    if (accuracy >= 70) return { label: 'Boa', variant: 'secondary' as const };
    return { label: 'Baixa', variant: 'destructive' as const };
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            Precisão da Previsão
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            Precisão da Previsão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalPredictions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            Precisão da Previsão (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Target className="h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">Sem dados de comparação</p>
            <p className="text-sm text-center mt-1">
              A precisão será calculada quando os dias previstos passarem
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = stats.data.slice(0, 7).map((d) => ({
    name: d.dayOfWeek,
    date: new Date(d.targetDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    previsto: d.predictedAmount,
    real: d.actualAmount,
    precisao: d.accuracyPercentage,
  })).reverse();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Precisão da Previsão (IA)</CardTitle>
        </div>
        <Badge variant={getAccuracyBadge(stats.averageAccuracy).variant}>
          {stats.averageAccuracy.toFixed(0)}% precisão
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo de precisão */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {stats.averageAccuracy.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Precisão Média</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {stats.totalPredictions}
            </p>
            <p className="text-xs text-muted-foreground">Previsões</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">
              {stats.accurateCount}
            </p>
            <p className="text-xs text-muted-foreground">Acertos (≥80%)</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Precisão geral</span>
            <span>{stats.averageAccuracy.toFixed(0)}%</span>
          </div>
          <Progress 
            value={stats.averageAccuracy} 
            className="h-2"
          />
        </div>

        {/* Gráfico comparativo */}
        {chartData.length > 0 && (
          <div className="h-[200px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  width={50}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'previsto' ? 'Previsto' : 'Real',
                  ]}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${item.name} - ${item.date} (${item.precisao?.toFixed(0)}% precisão)` : '';
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="previsto" 
                  fill="hsl(var(--primary))" 
                  opacity={0.5}
                  radius={[4, 4, 0, 0]}
                  name="Previsto"
                />
                <Bar 
                  dataKey="real" 
                  radius={[4, 4, 0, 0]}
                  name="Real"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getAccuracyColor(entry.precisao)} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legenda */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/50" />
            <span>Previsto</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success" />
            <span>Real (≥90%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning" />
            <span>Real (70-89%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive" />
            <span>Real (&lt;70%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
