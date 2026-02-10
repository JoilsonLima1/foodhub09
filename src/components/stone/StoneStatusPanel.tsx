import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStoneProviderAccounts, useStoneEvents } from '@/hooks/useStoneProviderAccounts';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Plug, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  tenantId: string | null;
}

export function StoneStatusPanel({ tenantId }: Props) {
  const { accounts, isLoading, testConnection } = useStoneProviderAccounts(
    tenantId ? { scope_type: 'tenant', scope_id: tenantId } : undefined
  );
  const { data: events, isLoading: eventsLoading } = useStoneEvents(
    tenantId ? { tenant_id: tenantId } : undefined
  );

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!accounts?.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma integração Stone configurada</h3>
          <p className="text-muted-foreground">Use a aba "Configuração" para configurar sua integração Stone.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map(account => {
          const statusIcon = account.status === 'active' ? CheckCircle2 : account.status === 'error' ? XCircle : AlertCircle;
          const StatusIcon = statusIcon;
          return (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{account.display_name || 'Stone'}</CardTitle>
                  <Badge variant={account.status === 'active' ? 'default' : account.status === 'error' ? 'destructive' : 'secondary'}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {account.status === 'active' ? 'Conectada' : account.status === 'error' ? 'Erro' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="capitalize">{account.integration_type.replace('stone_', '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ambiente:</span>
                  <Badge variant={account.environment === 'production' ? 'default' : 'outline'} className="text-xs">
                    {account.environment === 'production' ? 'Produção' : 'Sandbox'}
                  </Badge>
                </div>
                {account.last_tested_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Último teste:</span>
                    <span className="text-xs">{format(new Date(account.last_tested_at), 'dd/MM HH:mm')}</span>
                  </div>
                )}
                {account.last_error && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded p-2">{account.last_error}</p>
                )}
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => testConnection.mutate(account.id)}>
                  <Plug className="h-3 w-3 mr-2" /> Testar Conexão
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logs Recentes (Webhooks)</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !events?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento recebido.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.slice(0, 10).map(event => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                    <TableCell>
                      <Badge variant={event.process_status === 'ok' ? 'default' : 'secondary'} className="text-xs">
                        {event.process_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(event.created_at), 'dd/MM HH:mm:ss')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
