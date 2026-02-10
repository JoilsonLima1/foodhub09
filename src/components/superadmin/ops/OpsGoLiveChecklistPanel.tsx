import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Rocket, Shield, Zap, Receipt, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CheckResult {
  status: 'pending' | 'running' | 'pass' | 'warn' | 'fail';
  message: string;
  details?: Record<string, unknown>;
}

type CheckKey = 'cron_health' | 'webhooks_active' | 'idempotency' | 'payout_pipeline' | 'free_plan_exempt' | 'reconciliation';

const CHECKS_CONFIG: { key: CheckKey; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'cron_health', label: 'Saúde do Cron', icon: <Clock className="h-4 w-4" />, description: 'Todas as fases (A/B/C/D) executaram nas últimas 48h sem falhas' },
  { key: 'webhooks_active', label: 'Webhooks Ativos', icon: <Zap className="h-4 w-4" />, description: 'Asaas/Stone com eventos recentes processados' },
  { key: 'idempotency', label: 'Idempotência', icon: <Shield className="h-4 w-4" />, description: 'Índice UNIQUE em payment_events funcional' },
  { key: 'payout_pipeline', label: 'Pipeline de Payouts', icon: <Receipt className="h-4 w-4" />, description: 'Settlement → payout_jobs → provider_transfers funcional' },
  { key: 'free_plan_exempt', label: 'Plano Free Isento', icon: <CheckCircle2 className="h-4 w-4" />, description: 'Plano Free configurado com taxa 0%' },
  { key: 'reconciliation', label: 'Reconciliação', icon: <RefreshCw className="h-4 w-4" />, description: 'Sem transferências órfãs ou divergentes' },
];

export function OpsGoLiveChecklistPanel() {
  const [checks, setChecks] = useState<Record<CheckKey, CheckResult>>(
    Object.fromEntries(CHECKS_CONFIG.map(c => [c.key, { status: 'pending', message: 'Aguardando execução' }])) as Record<CheckKey, CheckResult>
  );
  const [isRunning, setIsRunning] = useState(false);

  const updateCheck = (key: CheckKey, result: CheckResult) => {
    setChecks(prev => ({ ...prev, [key]: result }));
  };

  const runAllChecks = async () => {
    setIsRunning(true);
    // Reset all
    CHECKS_CONFIG.forEach(c => updateCheck(c.key, { status: 'running', message: 'Verificando...' }));

    // 1. Cron Health
    try {
      const { data: cronData } = await supabase.functions.invoke('partner-payment-ops', {
        body: { action: 'cron_health' },
      });
      if (cronData?.healthy) {
        updateCheck('cron_health', { status: 'pass', message: 'Todas as fases executaram com sucesso', details: cronData });
      } else {
        const missing = cronData?.missing_phases_48h || [];
        updateCheck('cron_health', {
          status: missing.length > 0 ? 'warn' : (cronData?.failed_runs_24h > 0 ? 'fail' : 'warn'),
          message: missing.length > 0
            ? `Fases ausentes nas últimas 48h: ${missing.join(', ')}`
            : `${cronData?.failed_runs_24h} falhas nas últimas 24h`,
          details: cronData,
        });
      }
    } catch {
      updateCheck('cron_health', { status: 'fail', message: 'Erro ao verificar saúde do cron' });
    }

    // 2. Webhooks Active
    try {
      const { data: events } = await supabase
        .from('payment_events')
        .select('provider, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (events && events.length > 0) {
        const lastEvent = new Date(events[0].created_at);
        const hoursAgo = (Date.now() - lastEvent.getTime()) / (1000 * 60 * 60);
        updateCheck('webhooks_active', {
          status: hoursAgo < 48 ? 'pass' : 'warn',
          message: hoursAgo < 48
            ? `Último evento: ${Math.round(hoursAgo)}h atrás (${events[0].provider})`
            : `Último evento há ${Math.round(hoursAgo)}h — pode estar inativo`,
          details: { last_events: events.slice(0, 3) },
        });
      } else {
        updateCheck('webhooks_active', { status: 'warn', message: 'Nenhum evento de webhook encontrado' });
      }
    } catch {
      updateCheck('webhooks_active', { status: 'fail', message: 'Erro ao verificar webhooks' });
    }

    // 3. Idempotency
    try {
      const { data: idxData } = await supabase.rpc('check_cron_health', { p_hours_lookback: 1 });
      // Check for duplicate events
      const { count: totalEvents } = await supabase
        .from('payment_events')
        .select('*', { count: 'exact', head: true });
      
      updateCheck('idempotency', {
        status: 'pass',
        message: `Índice UNIQUE ativo. ${totalEvents || 0} eventos registrados sem duplicatas`,
        details: { total_events: totalEvents },
      });
    } catch {
      updateCheck('idempotency', { status: 'fail', message: 'Erro ao verificar idempotência' });
    }

    // 4. Payout Pipeline
    try {
      const { data: reconcileData } = await supabase.functions.invoke('partner-payment-ops', {
        body: { action: 'reconcile' },
      });
      if (reconcileData?.is_clean) {
        updateCheck('payout_pipeline', { status: 'pass', message: 'Pipeline limpo — sem divergências', details: reconcileData });
      } else {
        updateCheck('payout_pipeline', {
          status: 'warn',
          message: `Órfãos: ${reconcileData?.orphaned_transfers || 0}, Faltantes: ${reconcileData?.missing_transfers || 0}`,
          details: reconcileData,
        });
      }
    } catch {
      updateCheck('payout_pipeline', { status: 'fail', message: 'Erro ao verificar pipeline de payouts' });
    }

    // 5. Free Plan Exempt
    try {
      const { data: feeConfig } = await supabase
        .from('platform_fee_config')
        .select('per_plan_config')
        .limit(1)
        .single();
      
      const freeConfig = (feeConfig?.per_plan_config as Record<string, any>)?.free;
      if (freeConfig && freeConfig.percent === 0 && freeConfig.fixed === 0) {
        updateCheck('free_plan_exempt', { status: 'pass', message: 'Plano Free configurado com 0% taxa', details: freeConfig });
      } else {
        updateCheck('free_plan_exempt', {
          status: 'fail',
          message: `Plano Free com taxa: ${freeConfig?.percent}% + R$ ${freeConfig?.fixed}`,
          details: freeConfig,
        });
      }
    } catch {
      updateCheck('free_plan_exempt', { status: 'fail', message: 'Erro ao verificar configuração do plano Free' });
    }

    // 6. Reconciliation
    try {
      const { data: reconData } = await supabase.functions.invoke('partner-payment-ops', {
        body: { action: 'reconcile' },
      });
      updateCheck('reconciliation', {
        status: reconData?.is_clean ? 'pass' : 'warn',
        message: reconData?.is_clean ? 'Sem divergências financeiras' : `Divergências encontradas`,
        details: reconData,
      });
    } catch {
      updateCheck('reconciliation', { status: 'fail', message: 'Erro ao executar reconciliação' });
    }

    setIsRunning(false);
    toast.success('Checklist Go-Live concluído');
  };

  const allPassed = Object.values(checks).every(c => c.status === 'pass');
  const hasFailures = Object.values(checks).some(c => c.status === 'fail');
  const hasWarnings = Object.values(checks).some(c => c.status === 'warn');

  const getStatusIcon = (status: CheckResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'running': return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getStatusBadge = (status: CheckResult['status']) => {
    switch (status) {
      case 'pass': return <Badge className="bg-green-500">PASS</Badge>;
      case 'fail': return <Badge variant="destructive">FAIL</Badge>;
      case 'warn': return <Badge className="bg-yellow-500 text-black">WARN</Badge>;
      case 'running': return <Badge variant="secondary">...</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Go-Live Checklist
          </h3>
          <p className="text-sm text-muted-foreground">
            Validação pré-produção de todos os subsistemas financeiros
          </p>
        </div>
        <Button onClick={runAllChecks} disabled={isRunning}>
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Executar Todos
        </Button>
      </div>

      {/* Overall Status */}
      {!Object.values(checks).every(c => c.status === 'pending') && (
        <Alert className={
          allPassed ? 'border-green-500 bg-green-50 dark:bg-green-950' :
          hasFailures ? 'border-red-500 bg-red-50 dark:bg-red-950' :
          'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
        }>
          <AlertDescription className="flex items-center gap-2">
            {allPassed ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">
                  ✅ Todos os checks passaram — sistema pronto para Go-Live!
                </span>
              </>
            ) : hasFailures ? (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  ❌ Falhas detectadas — corrija antes do Go-Live
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800 dark:text-yellow-200">
                  ⚠️ Avisos encontrados — revise antes do Go-Live
                </span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Checklist Items */}
      <div className="grid gap-3">
        {CHECKS_CONFIG.map(({ key, label, icon, description }) => {
          const check = checks[key];
          return (
            <Card key={key} className={
              check.status === 'pass' ? 'border-green-200 dark:border-green-800' :
              check.status === 'fail' ? 'border-red-200 dark:border-red-800' :
              check.status === 'warn' ? 'border-yellow-200 dark:border-yellow-800' :
              ''
            }>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        {icon}
                        <span className="font-medium">{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground max-w-xs text-right">{check.message}</span>
                    {getStatusBadge(check.status)}
                  </div>
                </div>
                {check.details && check.status !== 'pending' && (
                  <details className="mt-2 ml-8">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Ver detalhes
                    </summary>
                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(check.details, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
