import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';

interface CategoryData {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  productCount: number;
}

interface CMVCategoryBreakdownProps {
  categories: CategoryData[];
  totalRevenue: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
];

export function CMVCategoryBreakdown({ categories, totalRevenue }: CMVCategoryBreakdownProps) {
  const chartConfig = {
    revenue: { label: 'Receita', color: 'hsl(var(--chart-1))' },
    profit: { label: 'Lucro', color: 'hsl(var(--chart-2))' },
    margin: { label: 'Margem', color: 'hsl(var(--chart-3))' },
  };

  // Sort by revenue
  const sortedCategories = [...categories].sort((a, b) => b.revenue - a.revenue);

  // Prepare pie chart data
  const pieData = sortedCategories.map((cat, index) => ({
    name: cat.category,
    value: cat.revenue,
    fill: COLORS[index % COLORS.length],
  }));

  // Bar chart data
  const barData = sortedCategories.map((cat, index) => ({
    name: cat.category.length > 12 ? cat.category.substring(0, 12) + '...' : cat.category,
    fullName: cat.category,
    revenue: cat.revenue,
    profit: cat.profit,
    margin: cat.margin,
    fill: COLORS[index % COLORS.length],
  }));

  const getMarginIcon = (margin: number) => {
    if (margin >= 50) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (margin >= 30) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return 'text-green-500';
    if (margin >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            CMV por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhuma categoria com vendas no período
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={true}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lucro por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value, name, props) => {
                    if (name === 'margin') return formatPercent(Number(value));
                    return formatCurrency(Number(value));
                  }}
                />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhamento por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedCategories.map((cat, index) => {
              const revenueShare = (cat.revenue / totalRevenue) * 100;
              
              return (
                <div 
                  key={cat.category}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <h4 className="font-medium">{cat.category}</h4>
                        <p className="text-xs text-muted-foreground">
                          {cat.productCount} {cat.productCount === 1 ? 'produto' : 'produtos'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getMarginIcon(cat.margin)}
                      <span className={`font-semibold ${getMarginColor(cat.margin)}`}>
                        {formatPercent(cat.margin)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="font-medium">{formatCurrency(cat.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Custo (CMV)</p>
                      <p className="font-medium text-destructive">{formatCurrency(cat.cost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lucro</p>
                      <p className={`font-medium ${cat.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(cat.profit)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Progress value={revenueShare} className="flex-1 h-2" />
                    <Badge variant="outline" className="text-xs">
                      {formatPercent(revenueShare)} da receita
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
