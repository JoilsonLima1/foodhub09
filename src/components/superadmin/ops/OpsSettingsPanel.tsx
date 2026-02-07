import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Archive, Trash2, Loader2 } from 'lucide-react';
import { useLogRotation } from '@/hooks/useOpsBackoffice';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function OpsSettingsPanel() {
  const { rotateLogs } = useLogRotation();
  const [retentionDays, setRetentionDays] = useState(30);
  const [archiveDays, setArchiveDays] = useState(90);

  const handleRotateLogs = () => {
    rotateLogs.mutate({ retentionDays, archiveDays });
  };

  return (
    <div className="space-y-6">
      {/* Log Rotation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Rotação de Logs
          </CardTitle>
          <CardDescription>
            Configure a política de retenção e arquivamento de logs operacionais e de auditoria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="retentionDays">Dias de Retenção (Hot Table)</Label>
              <Input
                id="retentionDays"
                type="number"
                min={7}
                max={365}
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-muted-foreground">
                Logs mais antigos serão movidos para o arquivo
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="archiveDays">Dias de Arquivamento</Label>
              <Input
                id="archiveDays"
                type="number"
                min={30}
                max={730}
                value={archiveDays}
                onChange={(e) => setArchiveDays(parseInt(e.target.value) || 90)}
              />
              <p className="text-xs text-muted-foreground">
                Logs arquivados mais antigos serão deletados permanentemente
              </p>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Resumo da Política</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Logs com menos de <strong>{retentionDays} dias</strong>: mantidos na tabela principal (busca rápida)</li>
              <li>• Logs entre <strong>{retentionDays}</strong> e <strong>{archiveDays} dias</strong>: movidos para arquivo</li>
              <li>• Logs com mais de <strong>{archiveDays} dias</strong>: deletados permanentemente</li>
            </ul>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" className="w-full">
                <Archive className="h-4 w-4 mr-2" />
                Executar Rotação de Logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Rotação de Logs</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá:
                  <ul className="list-disc list-inside mt-2">
                    <li>Mover logs operacionais e de auditoria antigos para tabelas de arquivo</li>
                    <li>Deletar logs arquivados que excedem o período de retenção</li>
                  </ul>
                  <p className="mt-2 font-medium">Esta ação é segura e pode ser executada regularmente.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRotateLogs} disabled={rotateLogs.isPending}>
                  {rotateLogs.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Archive className="h-4 w-4 mr-2" />
                  )}
                  Executar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Sistema
          </CardTitle>
          <CardDescription>
            Informações e configurações globais do backoffice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Versão do Sistema</h4>
              <p className="text-2xl font-bold mt-1">v8.0.0</p>
              <p className="text-xs text-muted-foreground">Phase 8 - Backoffice Ops</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Tabelas de Arquivo</h4>
              <ul className="text-sm mt-1 space-y-1">
                <li>• operational_logs_archive</li>
                <li>• financial_audit_log_archive</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">RPCs Disponíveis</h4>
              <ul className="text-sm mt-1 space-y-1">
                <li>• reconcile_provider_payments_v2</li>
                <li>• generate_ops_recommendations</li>
                <li>• apply_ops_recommendation</li>
                <li>• rotate_logs</li>
                <li>• upsert_dispute_from_event</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
