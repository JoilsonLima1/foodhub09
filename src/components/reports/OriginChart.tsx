import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Store, Smartphone, Utensils, MessageCircle, Globe } from 'lucide-react';
import { useOriginReport } from '@/hooks/useOriginReport';
import { Skeleton } from '@/components/ui/skeleton';

interface OriginChartProps {
  daysBack: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 173 58% 39%))',
  'hsl(var(--chart-3, 197 37% 24%))',
  'hsl(var(--chart-4, 43 74% 66%))',
  'hsl(var(--chart-5, 27 87% 67%))',
];

const ORIGIN_ICONS: Record<string, React.ReactNode> = {
  pos: <Store className="h-4 w-4" />,
  online: <Globe className="h-4 w-4" />,
  ifood: <Smartphone className="h-4 w-4" />,
  table: <Utensils className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function OriginChart({ daysBack }: OriginChartProps) {
  const { data, isLoading } = useOriginReport(daysBack);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma venda registrada no período</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Origem das Vendas
        </CardTitle>
        <CardDescription>Distribuição do faturamento por canal</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="totalRevenue"
                  nameKey="label"
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.origin} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm">
                          <div className="font-medium flex items-center gap-2">
                            {ORIGIN_ICONS[data.origin]}
                            {data.label}
                          </div>
                          <div className="text-primary font-bold">
                            {formatCurrency(data.totalRevenue)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {data.percentage.toFixed(1)}% do total
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {data.map((origin, index) => (
              <div
                key={origin.origin}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex items-center gap-2">
                    {ORIGIN_ICONS[origin.origin]}
                    <span className="font-medium">{origin.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {origin.orderCount} pedidos
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(origin.totalRevenue)}</div>
                  <div className="text-xs text-muted-foreground">
                    {origin.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
