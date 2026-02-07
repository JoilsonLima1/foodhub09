/**
 * OpsMetricsPanel - SLO/SLI Dashboard for Super Admins
 * 
 * Displays operational metrics, feature flags, queue status, and housekeeping controls.
 */

import { useState } from 'react';
import { useOpsMetrics } from '@/hooks/useOpsMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Flag,
  Loader2,
  Play,
  RefreshCw,
  Server,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OpsMetricsPanel() {
  const {
    metrics,
    summary,
    featureFlags,
    queueStats,
    isLoading,
    toggleFlag,
    runHousekeeping,
    computeMetrics,
    processQueue,
  } = useOpsMetrics();

  const [isRunningHousekeeping, setIsRunningHousekeeping] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const handleHousekeeping = async () => {
    setIsRunningHousekeeping(true);
    await runHousekeeping.mutateAsync();
    setIsRunningHousekeeping(false);
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    await processQueue.mutateAsync(20);
    setIsProcessingQueue(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eventos (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.events_last_24h || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.events_last_hour || 0} na última hora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summary?.critical_alerts_open || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.total_alerts_open || 0} total abertos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disputas Abertas</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {summary?.disputes_open || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.reconciliation_mismatches || 0} mismatches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payouts Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.payouts_pending || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.payouts_failed || 0} falhas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags & Queue Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="h-4 w-4" />
              Feature Flags
            </CardTitle>
            <CardDescription>Controle de funcionalidades do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {featureFlags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">{flag.flag_key}</Label>
                  <p className="text-xs text-muted-foreground">{flag.description}</p>
                </div>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={(checked) =>
                    toggleFlag.mutate({ flagKey: flag.flag_key, enabled: checked })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" />
              Apply Queue
            </CardTitle>
            <CardDescription>Status da fila de processamento async</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Aguardando</p>
                <p className="text-xl font-bold">{queueStats?.queued || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Processando</p>
                <p className="text-xl font-bold text-blue-500">{queueStats?.processing || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Falhas</p>
                <p className="text-xl font-bold text-orange-500">{queueStats?.failed || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Dead Letter</p>
                <p className="text-xl font-bold text-destructive">{queueStats?.dead_letter || 0}</p>
              </div>
            </div>
            <Button
              onClick={handleProcessQueue}
              disabled={isProcessingQueue}
              className="w-full"
              variant="outline"
            >
              {isProcessingQueue ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Processar Fila (20 itens)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Housekeeping Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Manutenção do Sistema
          </CardTitle>
          <CardDescription>
            Rotação de logs, arquivamento do ledger e cálculo de métricas
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={handleHousekeeping} disabled={isRunningHousekeeping}>
            {isRunningHousekeeping ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Executar Housekeeping
          </Button>
          <Button
            variant="outline"
            onClick={() => computeMetrics.mutate(format(new Date(), 'yyyy-MM-dd'))}
            disabled={computeMetrics.isPending}
          >
            {computeMetrics.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Recalcular Métricas Hoje
          </Button>
        </CardContent>
      </Card>

      {/* Daily Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Métricas Diárias (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Eventos</TableHead>
                <TableHead className="text-right">OK</TableHead>
                <TableHead className="text-right">Erros</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma métrica calculada ainda. Execute o housekeeping para gerar.
                  </TableCell>
                </TableRow>
              ) : (
                metrics.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {format(new Date(m.metric_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.provider || 'all'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.events_received}</TableCell>
                    <TableCell className="text-right text-green-600">{m.events_applied_ok}</TableCell>
                    <TableCell className="text-right text-destructive">{m.events_apply_error}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(m.total_volume_processed)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(m.platform_revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
