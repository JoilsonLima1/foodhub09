import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2, Activity } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PHASE_LABELS: Record<string, string> = {
  A_invoice_gen: 'Geração de Faturas',
  B_dunning: 'Escalonamento Dunning',
  C_trials: 'Monitoramento Trials',
  D_delinquency: 'Suspensão Inadimplência',
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; variant: 'default' | 'destructive' | 'secondary' }> = {
  success: { icon: CheckCircle2, variant: 'default' },
  error: { icon: XCircle, variant: 'destructive' },
  running: { icon: Loader2, variant: 'secondary' },
};

export function OpsCronStatusPanel() {
  const { data: cronRuns, isLoading, refetch } = useQuery({
    queryKey: ['cron-runs-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Group runs by correlation_id for cycle view
  const cycles = cronRuns?.reduce((acc, run) => {
    const key = run.correlation_id;
    if (!acc[key]) {
      acc[key] = { correlation_id: key, period: run.period, runs: [], started: run.started_at };
    }
    acc[key].runs.push(run);
    return acc;
  }, {} as Record<string, { correlation_id: string; period: string; runs: typeof cronRuns; started: string }>) || {};

  const cycleList = Object.values(cycles).sort((a, b) => 
    new Date(b.started).getTime() - new Date(a.started).getTime()
  ).slice(0, 10);

  const lastRun = cronRuns?.[0];
  const lastSuccess = cronRuns?.find(r => r.status === 'success');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última Execução</CardTitle>
          </CardHeader>
          <CardContent>
            {lastRun ? (
              <>
                <p className="text-lg font-bold">
                  {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true, locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(lastRun.created_at), 'dd/MM/yyyy HH:mm:ss')}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma execução registrada</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
          </CardHeader>
          <CardContent>
            {lastRun && (
              <div className="flex items-center gap-2">
                <Badge variant={lastRun.status === 'success' ? 'default' : 'destructive'}>
                  {lastRun.status === 'success' ? 'Operacional' : 'Com Erros'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Período: {lastRun.period}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{cronRuns?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Últimas 50 execuções de fases</p>
          </CardContent>
        </Card>
      </div>

      {/* Cycle History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Histórico de Ciclos do Cron
              </CardTitle>
              <CardDescription>
                Cada ciclo executa 4 fases: Faturamento → Dunning → Trials → Inadimplência
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !cycleList.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma execução do cron registrada ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {cycleList.map((cycle) => {
                const allSuccess = cycle.runs.every(r => r.status === 'success');
                const hasError = cycle.runs.some(r => r.status === 'error');
                
                return (
                  <Card key={cycle.correlation_id} className="border">
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={allSuccess ? 'default' : hasError ? 'destructive' : 'secondary'}>
                            {allSuccess ? 'Completo' : hasError ? 'Erro' : 'Parcial'}
                          </Badge>
                          <span className="text-sm font-medium">Período: {cycle.period}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(cycle.started), 'dd/MM/yyyy HH:mm:ss')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fase</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Resultados</TableHead>
                            <TableHead>Erro</TableHead>
                            <TableHead>Duração</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cycle.runs
                            .sort((a, b) => a.phase.localeCompare(b.phase))
                            .map((run) => {
                              const config = STATUS_CONFIG[run.status] || STATUS_CONFIG.running;
                              const StatusIcon = config.icon;
                              const duration = run.finished_at && run.started_at
                                ? Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()))
                                : null;

                              return (
                                <TableRow key={run.id}>
                                  <TableCell className="font-medium text-sm">
                                    {PHASE_LABELS[run.phase] || run.phase}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                                      <StatusIcon className={`h-3 w-3 ${run.status === 'running' ? 'animate-spin' : ''}`} />
                                      {run.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs font-mono">
                                    {run.results ? (
                                      <span>{JSON.stringify(run.results)}</span>
                                    ) : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs text-destructive max-w-48 truncate">
                                    {run.error_message || '—'}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {duration !== null ? `${duration}ms` : '—'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
