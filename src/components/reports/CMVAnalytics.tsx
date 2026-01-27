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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Percent } from 'lucide-react';

interface ProductCost {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CMVAnalyticsProps {
  products: ProductCost[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const formatPercent = (value: number) =>
  `${value.toFixed(1)}%`;

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function CMVAnalytics({ products, totalRevenue, totalCost, totalProfit, overallMargin }: CMVAnalyticsProps) {
  // Calculate margin distribution
  const marginDistribution = {
    excellent: products.filter(p => p.margin >= 50).length,
    good: products.filter(p => p.margin >= 30 && p.margin < 50).length,
    regular: products.filter(p => p.margin >= 15 && p.margin < 30).length,
    low: products.filter(p => p.margin < 15).length,
  };

  // Top 5 products by margin
  const topByMargin = [...products]
    .filter(p => p.cost > 0)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  // Worst 5 products by margin
  const worstByMargin = [...products]
    .filter(p => p.cost > 0)
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 5);

  // Products without recipes
  const productsWithoutRecipe = products.filter(p => p.cost === 0);

  // Profit breakdown data
  const profitBreakdownData = products
    .filter(p => p.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10)
    .map((p, index) => ({
      name: p.productName.length > 15 ? p.productName.substring(0, 15) + '...' : p.productName,
      profit: p.profit,
      fill: COLORS[index % COLORS.length],
    }));

  // Cost structure data
  const costStructureData = [
    { name: 'Custo de Insumos', value: totalCost, fill: 'hsl(var(--destructive))' },
    { name: 'Lucro Bruto', value: totalProfit, fill: 'hsl(var(--chart-2))' },
  ];

  const chartConfig = {
    profit: { label: 'Lucro', color: 'hsl(var(--chart-2))' },
    margin: { label: 'Margem', color: 'hsl(var(--chart-1))' },
    cost: { label: 'Custo', color: 'hsl(var(--destructive))' },
  };

  return (
    <div className="space-y-6">
      {/* Margin Distribution Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Margem Excelente (≥50%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{marginDistribution.excellent}</div>
            <p className="text-xs text-muted-foreground">produtos</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-500" />
              Margem Boa (30-50%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{marginDistribution.good}</div>
            <p className="text-xs text-muted-foreground">produtos</p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4 text-orange-500" />
              Margem Regular (15-30%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{marginDistribution.regular}</div>
            <p className="text-xs text-muted-foreground">produtos</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Margem Baixa (&lt;15%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{marginDistribution.low}</div>
            <p className="text-xs text-muted-foreground">produtos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cost Structure Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estrutura de Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={costStructureData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {costStructureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span>CMV: {formatCurrency(totalCost)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-2" />
                <span>Lucro: {formatCurrency(totalProfit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Products by Profit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Produtos por Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={profitBreakdownData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                  {profitBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top and Worst Margins */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Margins */}
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Melhores Margens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topByMargin.map((product, index) => (
                <div key={product.productId || index} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Vendas: {formatCurrency(product.revenue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(product.margin, 100)} className="w-16 h-2" />
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      {formatPercent(product.margin)}
                    </Badge>
                  </div>
                </div>
              ))}
              {topByMargin.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Sem dados disponíveis
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Worst Margins */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Margens Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {worstByMargin.map((product, index) => (
                <div key={product.productId || index} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Custo: {formatCurrency(product.cost)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(product.margin, 100)} className="w-16 h-2" />
                    <Badge variant="destructive">
                      {formatPercent(product.margin)}
                    </Badge>
                  </div>
                </div>
              ))}
              {worstByMargin.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Sem dados disponíveis
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Without Recipe Alert */}
      {productsWithoutRecipe.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Produtos Sem Ficha Técnica ({productsWithoutRecipe.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Estes produtos não possuem receita cadastrada, portanto o CMV não pode ser calculado:
            </p>
            <div className="flex flex-wrap gap-2">
              {productsWithoutRecipe.slice(0, 20).map((product, index) => (
                <Badge key={product.productId || index} variant="outline">
                  {product.productName}
                </Badge>
              ))}
              {productsWithoutRecipe.length > 20 && (
                <Badge variant="secondary">
                  +{productsWithoutRecipe.length - 20} mais
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Margin Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análise de Rentabilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Margem Média Ponderada</p>
              <p className="text-2xl font-bold">{formatPercent(overallMargin)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {overallMargin >= 30 ? '✓ Dentro da meta' : '⚠ Abaixo da meta de 30%'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Ticket Médio de Custo</p>
              <p className="text-2xl font-bold">
                {products.length > 0 ? formatCurrency(totalCost / products.length) : formatCurrency(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">por produto vendido</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Eficiência Operacional</p>
              <p className="text-2xl font-bold">
                {totalRevenue > 0 ? formatPercent((1 - totalCost / totalRevenue) * 100) : '0%'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">receita retida após custos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
