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
  CalendarDays,
  Clock,
  Store,
  Activity,
} from 'lucide-react';
import { useSalesReport } from '@/hooks/useSalesReport';
import { useTopProductsWithCategory } from '@/hooks/useTopProductsWithCategory';
import { useCMVReport } from '@/hooks/useCMVReport';
import { usePeriodComparison } from '@/hooks/usePeriodComparison';
import { SalesChart } from '@/components/reports/SalesChart';
import { PaymentMethodChart } from '@/components/reports/PaymentMethodChart';
import { TopProductsChartWithFilter } from '@/components/reports/TopProductsChartWithFilter';
import { CMVReportView } from '@/components/reports/CMVReportView';
import { ReportExport } from '@/components/reports/ReportExport';
import { ReportPDFExport } from '@/components/reports/ReportPDFExport';
import { PeriodComparisonCard } from '@/components/reports/PeriodComparisonCard';
import { DayOfWeekChart } from '@/components/reports/DayOfWeekChart';
import { HourlyChart } from '@/components/reports/HourlyChart';
import { OriginChart } from '@/components/reports/OriginChart';
import { TrendChart } from '@/components/reports/TrendChart';
import { AnalyticsSummary } from '@/components/reports/AnalyticsSummary';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import fallbackLogo from '@/assets/logo.png';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

type PeriodOption = 7 | 15 | 30;

const PERIOD_LABELS: Record<PeriodOption, string> = {
  7: '7 dias',
  15: '15 dias',
  30: '30 dias',
};

export default function Reports() {
  const [period, setPeriod] = useState<PeriodOption>(7);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  
  const { report: salesReport, isLoading: salesLoading } = useSalesReport(period);
  const { products: topProducts, categories, isLoading: productsLoading } = useTopProductsWithCategory(period, 10, selectedCategory);
  const { report: cmvReport, isLoading: cmvLoading } = useCMVReport(period);
  const { comparison, isLoading: comparisonLoading } = usePeriodComparison(period);
  const { settings } = useSystemSettings();
  
  // Get branding from system settings
  const branding = settings?.branding as { logo_url?: string; company_name?: string } | undefined;
  const logoUrl = branding?.logo_url || fallbackLogo;
  const companyName = branding?.company_name || 'FoodHub09';

  const isLoading = salesLoading || productsLoading || cmvLoading;

  const periods: { value: PeriodOption; label: string }[] = [
    { value: 7, label: '7 dias' },
    { value: 15, label: '15 dias' },
    { value: 30, label: '30 dias' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt={companyName} className="h-12 w-auto" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Relatórios Avançados
            </h1>
            <p className="text-muted-foreground">
              {companyName} - Análises e métricas detalhadas
            </p>
          </div>
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
          <ReportPDFExport
            salesReport={salesReport}
            cmvReport={cmvReport}
            topProducts={topProducts}
            period={period}
            companyName={companyName}
            logoUrl={logoUrl}
          />
          <ReportExport 
            salesReport={salesReport} 
            cmvReport={cmvReport}
            topProducts={topProducts}
            period={period}
            companyName={companyName}
          />
        </div>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="visao-geral" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="vendas" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="tempo" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Por Hora
          </TabsTrigger>
          <TabsTrigger value="diasemana" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Por Dia
          </TabsTrigger>
          <TabsTrigger value="canais" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Canais
          </TabsTrigger>
          <TabsTrigger value="cmv" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            CMV
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral Tab */}
        <TabsContent value="visao-geral" className="mt-6 space-y-6">
          {/* Analytics Summary Cards */}
          <AnalyticsSummary 
            daysBack={period} 
            salesReport={salesReport}
            comparison={comparison}
          />

          {/* Trend Chart */}
          <TrendChart weeks={period === 7 ? 4 : period === 15 ? 6 : 8} />

          {/* Grid of smaller charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <HourlyChart daysBack={period} />
            <OriginChart daysBack={period} />
          </div>

          {/* Top Products */}
          {!productsLoading && topProducts && topProducts.length > 0 && (
            <TopProductsChartWithFilter 
              products={topProducts} 
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          )}
        </TabsContent>

        {/* Vendas Tab */}
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

          {/* Period Comparison */}
          {comparisonLoading ? (
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : comparison && (
            <PeriodComparisonCard
              current={comparison.current}
              previous={comparison.previous}
              revenueChange={comparison.revenueChange}
              ordersChange={comparison.ordersChange}
              ticketChange={comparison.ticketChange}
              periodLabel={PERIOD_LABELS[period]}
            />
          )}

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

              <TopProductsChartWithFilter 
                products={topProducts} 
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />

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

        {/* Por Hora Tab */}
        <TabsContent value="tempo" className="mt-6 space-y-6">
          <HourlyChart daysBack={period} />
          
          <Card>
            <CardHeader>
              <CardTitle>Análise de Horários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                  <div className="text-sm text-green-700 dark:text-green-400 font-medium">Horário de Pico</div>
                  <div className="text-lg font-bold text-green-800 dark:text-green-300">11h - 14h</div>
                  <div className="text-xs text-green-600 dark:text-green-500">Concentração de pedidos</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                  <div className="text-sm text-blue-700 dark:text-blue-400 font-medium">Segundo Pico</div>
                  <div className="text-lg font-bold text-blue-800 dark:text-blue-300">18h - 21h</div>
                  <div className="text-xs text-blue-600 dark:text-blue-500">Jantar</div>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <div className="text-sm text-amber-700 dark:text-amber-400 font-medium">Horário Baixo</div>
                  <div className="text-lg font-bold text-amber-800 dark:text-amber-300">14h - 17h</div>
                  <div className="text-xs text-amber-600 dark:text-amber-500">Oportunidade de promoção</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Dia da Semana Tab */}
        <TabsContent value="diasemana" className="mt-6">
          <DayOfWeekChart daysBack={period} />
        </TabsContent>

        {/* Canais Tab */}
        <TabsContent value="canais" className="mt-6 space-y-6">
          <OriginChart daysBack={period} />
          
          <Card>
            <CardHeader>
              <CardTitle>Insights de Canais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Diversificação</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Analise a distribuição das vendas entre seus canais para identificar oportunidades 
                    de crescimento e dependências excessivas de um único canal.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Recomendação</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Invista nos canais com melhor ticket médio e margem de lucro. 
                    Considere campanhas específicas para canais com baixo desempenho.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CMV Tab */}
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
