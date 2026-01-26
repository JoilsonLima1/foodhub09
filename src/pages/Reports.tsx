import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Calculator,
} from 'lucide-react';
import { useSalesReport } from '@/hooks/useSalesReport';
import { useTopProducts } from '@/hooks/useTopProducts';
import { useCMVReport } from '@/hooks/useCMVReport';
import { SalesChart } from '@/components/reports/SalesChart';
import { PaymentMethodChart } from '@/components/reports/PaymentMethodChart';
import { TopProductsChart } from '@/components/reports/TopProductsChart';
import { CMVReportView } from '@/components/reports/CMVReportView';
import { ReportExport } from '@/components/reports/ReportExport';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

type PeriodOption = 7 | 15 | 30;

export default function Reports() {
  const [period, setPeriod] = useState<PeriodOption>(7);
  const { report: salesReport, isLoading: salesLoading } = useSalesReport(period);
  const { products: topProducts, isLoading: productsLoading } = useTopProducts(period, 10);
  const { report: cmvReport, isLoading: cmvLoading } = useCMVReport(period);

  const isLoading = salesLoading || productsLoading || cmvLoading;

  const periods: { value: PeriodOption; label: string }[] = [
    { value: 7, label: '7 dias' },
    { value: 15, label: '15 dias' },
    { value: 30, label: '30 dias' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Análises e métricas do seu negócio
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              {p.label}
            </Button>
          ))}
          <ReportExport 
            salesReport={salesReport} 
            cmvReport={cmvReport}
            topProducts={topProducts}
            period={period}
          />
        </div>
      </div>

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList>
          <TabsTrigger value="vendas" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="cmv" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            CMV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Faturamento Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(salesReport?.totalRevenue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Total de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {salesReport?.totalOrders || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ticket Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">
                    {formatCurrency(salesReport?.averageTicket || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {salesReport && salesReport.dailySales.length > 0 && (
                  <SalesChart data={salesReport.dailySales} />
                )}
                {salesReport && salesReport.byPaymentMethod.length > 0 ? (
                  <PaymentMethodChart data={salesReport.byPaymentMethod} />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Nenhum pagamento registrado no período
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <TopProductsChart data={topProducts} />

              {/* Payment Methods Summary Table */}
              {salesReport && salesReport.byPaymentMethod.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo por Forma de Pagamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {salesReport.byPaymentMethod
                        .sort((a, b) => b.total - a.total)
                        .map((method) => (
                          <div
                            key={method.method}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{method.label}</span>
                              <span className="text-sm text-muted-foreground">
                                {method.count} {method.count === 1 ? 'pedido' : 'pedidos'}
                              </span>
                            </div>
                            <div className="text-lg font-semibold">
                              {formatCurrency(method.total)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!isLoading && (!salesReport || salesReport.dailySales.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sem dados no período</h3>
                <p className="text-muted-foreground">
                  Nenhuma venda registrada nos últimos {period} dias.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cmv" className="mt-6">
          {cmvLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>
          ) : cmvReport ? (
            <CMVReportView report={cmvReport} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sem dados de CMV</h3>
                <p className="text-muted-foreground">
                  Nenhuma venda ou ficha técnica encontrada no período.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
