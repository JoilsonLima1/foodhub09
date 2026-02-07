/**
 * BusinessKPIsPanel - Dashboard de métricas de negócio
 * 
 * Exibe KPIs diários do SaaS:
 * - MRR, ARR, Churn
 * - Trials, Conversões
 * - Inadimplência
 * - Parceiros
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Calendar,
  Percent,
  Target,
  Handshake,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BusinessKPI {
  id: string;
  date: string;
  total_tenants: number;
  active_tenants: number;
  new_tenants: number;
  churned_tenants: number;
  mrr: number;
  arr: number;
  new_mrr: number;
  churned_mrr: number;
  expansion_mrr: number;
  trials_active: number;
  trial_to_paid_rate: number;
  past_due_count: number;
  past_due_amount: number;
  total_orders: number;
  total_gmv: number;
  addon_attach_rate: number;
  addon_revenue: number;
  avg_ltv: number;
  avg_arpu: number;
  total_partners: number;
  active_partners: number;
  partner_revenue: number;
  net_revenue_retention: number;
  gross_revenue_retention: number;
}

export function BusinessKPIsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState(30);

  // Fetch KPIs
  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['business-kpis', dateRange],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), dateRange), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('business_kpis_daily')
        .select('*')
        .gte('date', startDate)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as BusinessKPI[];
    },
  });

  // Calculate today's KPIs
  const calculateKPIs = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('calculate_daily_kpis', {
        p_date: format(new Date(), 'yyyy-MM-dd'),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-kpis'] });
      toast({ title: 'KPIs calculados', description: 'Métricas atualizadas com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Get latest KPI
  const latestKPI = kpis[kpis.length - 1];
  const previousKPI = kpis[kpis.length - 2];

  // Calculate trends
  const calcTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const mrrTrend = latestKPI && previousKPI 
    ? calcTrend(latestKPI.mrr || 0, previousKPI.mrr || 0) 
    : 0;

  const tenantsTrend = latestKPI && previousKPI 
    ? calcTrend(latestKPI.active_tenants || 0, previousKPI.active_tenants || 0) 
    : 0;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Métricas de Negócio</h2>
          <p className="text-sm text-muted-foreground">
            KPIs e indicadores de performance do SaaS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={dateRange === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(days)}
              >
                {days}d
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calculateKPIs.mutate()}
            disabled={calculateKPIs.isPending}
          >
            {calculateKPIs.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(latestKPI?.mrr || 0)}
            </div>
            <div className="flex items-center text-xs">
              {mrrTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={mrrTrend >= 0 ? 'text-green-500' : 'text-red-500'}>
                {formatPercent(Math.abs(mrrTrend))}
              </span>
              <span className="text-muted-foreground ml-1">vs anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(latestKPI?.arr || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              MRR × 12
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tenants Ativos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestKPI?.active_tenants || 0}
            </div>
            <div className="flex items-center text-xs">
              {tenantsTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={tenantsTrend >= 0 ? 'text-green-500' : 'text-red-500'}>
                {formatPercent(Math.abs(tenantsTrend))}
              </span>
              <span className="text-muted-foreground ml-1">vs anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trials Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestKPI?.trials_active || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa conversão: {formatPercent(latestKPI?.trial_to_paid_rate || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {latestKPI?.past_due_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(latestKPI?.past_due_amount || 0)} em atraso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Parceiros</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestKPI?.active_partners || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {latestKPI?.total_partners || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(latestKPI?.avg_arpu || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita média por usuário
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Add-on Attach</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(latestKPI?.addon_attach_rate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(latestKPI?.addon_revenue || 0)} em add-ons
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="trials">Trials</TabsTrigger>
          <TabsTrigger value="delinquency">Inadimplência</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Evolução do MRR</CardTitle>
              <CardDescription>
                Receita recorrente mensal ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'MRR']}
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy', { locale: ptBR })}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mrr" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Tenants</CardTitle>
              <CardDescription>
                Total e ativos ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy', { locale: ptBR })}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_tenants" 
                      stroke="hsl(var(--muted-foreground))" 
                      name="Total"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="active_tenants" 
                      stroke="hsl(var(--primary))" 
                      name="Ativos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trials">
          <Card>
            <CardHeader>
              <CardTitle>Trials Ativos</CardTitle>
              <CardDescription>
                Trials em andamento por dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kpis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy', { locale: ptBR })}
                    />
                    <Bar dataKey="trials_active" fill="hsl(var(--primary))" name="Trials" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delinquency">
          <Card>
            <CardHeader>
              <CardTitle>Inadimplência</CardTitle>
              <CardDescription>
                Faturas em atraso ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Em atraso']}
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy', { locale: ptBR })}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="past_due_amount" 
                      stroke="hsl(var(--destructive))" 
                      fill="hsl(var(--destructive) / 0.2)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty state */}
      {kpis.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhum KPI registrado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Clique em "Atualizar" para calcular os KPIs de hoje ou aguarde o cron job diário.
            </p>
            <Button onClick={() => calculateKPIs.mutate()} disabled={calculateKPIs.isPending}>
              {calculateKPIs.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Calcular KPIs
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
