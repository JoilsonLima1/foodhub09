import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle } from 'lucide-react';

interface ProductCost {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CMVReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  products: ProductCost[];
}

interface CMVReportViewProps {
  report: CMVReport;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);

export function CMVReportView({ report }: CMVReportViewProps) {
  const getMarginColor = (margin: number) => {
    if (margin >= 50) return 'text-green-500';
    if (margin >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMarginBadge = (margin: number) => {
    if (margin >= 50) return { variant: 'default' as const, label: 'Excelente' };
    if (margin >= 30) return { variant: 'secondary' as const, label: 'Bom' };
    if (margin >= 15) return { variant: 'outline' as const, label: 'Regular' };
    return { variant: 'destructive' as const, label: 'Baixa' };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(report.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Custo (CMV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(report.totalCost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Lucro Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(report.totalProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Margem Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMarginColor(report.overallMargin)}`}>
              {formatPercent(report.overallMargin)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>CMV por Produto</CardTitle>
        </CardHeader>
        <CardContent>
          {report.products.length === 0 ? (
            <div className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum produto vendido no período selecionado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.products.map((product) => {
                  const badge = getMarginBadge(product.margin);
                  return (
                    <TableRow key={product.productId || product.productName}>
                      <TableCell>
                        <div className="font-medium">{product.productName}</div>
                        {product.cost === 0 && (
                          <span className="text-xs text-muted-foreground">
                            Sem ficha técnica
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.quantitySold}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(product.cost)}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${product.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(product.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress 
                            value={Math.min(product.margin, 100)} 
                            className="w-16 h-2"
                          />
                          <Badge variant={badge.variant} className="w-20 justify-center">
                            {formatPercent(product.margin)}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
