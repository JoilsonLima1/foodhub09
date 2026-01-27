import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendDataPoint {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CMVTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function CMVTrendChart({ data, title = 'Evolução do CMV' }: CMVTrendChartProps) {
  // Calculate trend
  const getTrend = () => {
    if (data.length < 2) return { direction: 'stable', change: 0 };
    
    const lastMargin = data[data.length - 1].margin;
    const previousMargin = data[data.length - 2].margin;
    const change = lastMargin - previousMargin;
    
    if (change > 2) return { direction: 'up', change };
    if (change < -2) return { direction: 'down', change };
    return { direction: 'stable', change };
  };

  const trend = getTrend();

  const chartConfig = {
    revenue: { label: 'Receita', color: 'hsl(var(--chart-1))' },
    cost: { label: 'Custo', color: 'hsl(var(--destructive))' },
    profit: { label: 'Lucro', color: 'hsl(var(--chart-2))' },
    margin: { label: 'Margem', color: 'hsl(var(--chart-3))' },
  };

  const TrendIcon = () => {
    if (trend.direction === 'up') {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    }
    if (trend.direction === 'down') {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Dados insuficientes para exibir tendência
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2 text-sm">
          <TrendIcon />
          <span className={
            trend.direction === 'up' ? 'text-green-500' :
            trend.direction === 'down' ? 'text-red-500' :
            'text-muted-foreground'
          }>
            {trend.change > 0 ? '+' : ''}{formatPercent(trend.change)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12 }} 
              className="text-muted-foreground"
            />
            <YAxis 
              yAxisId="left"
              tickFormatter={(v) => formatCurrency(v)} 
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              domain={[0, 100]}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value, name) => {
                if (name === 'margin') return formatPercent(Number(value));
                return formatCurrency(Number(value));
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              name="Receita"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fill="url(#colorCost)"
              name="Custo"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="profit"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              fill="url(#colorProfit)"
              name="Lucro"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="margin"
              stroke="hsl(var(--chart-3))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2 }}
              name="Margem %"
            />
          </AreaChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-1" />
            <span>Receita</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Custo (CMV)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            <span>Lucro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-chart-3" />
            <span>Margem %</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
