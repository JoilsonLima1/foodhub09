import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Mail, 
  RotateCcw,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Skull,
  Send,
  RefreshCw,
  Loader2,
  Eye,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useNotificationOutbox,
  useNotificationDeliveries,
  useBillingNotificationEmitter,
  type NotificationOutboxItem,
} from '@/hooks/useNotifications';

const STATUS_CONFIG = {
  queued: { icon: Clock, label: 'Na fila', variant: 'secondary' as const },
  sending: { icon: Send, label: 'Enviando', variant: 'default' as const },
  sent: { icon: CheckCircle2, label: 'Enviado', variant: 'default' as const },
  failed: { icon: XCircle, label: 'Falhou', variant: 'destructive' as const },
  dead: { icon: Skull, label: 'Dead Letter', variant: 'destructive' as const },
};

function OutboxStats({ stats }: { stats: Record<string, number> }) {
  return (
    <div className="grid gap-4 md:grid-cols-5 mb-6">
      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const Icon = config.icon;
        return (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats[status] || 0}</div>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DeliveryDetailsDialog({ outboxId, open, onOpenChange }: { outboxId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { deliveries, isLoading } = useNotificationDeliveries(outboxId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes de Entrega</DialogTitle>
          <DialogDescription>Histórico de tentativas de envio</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : deliveries.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>Nenhum registro de entrega encontrado.</AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message ID</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.provider}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === 'delivered' ? 'default' : 'secondary'}>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[150px]">{d.provider_message_id || '-'}</TableCell>
                  <TableCell>{format(new Date(d.created_at), 'dd/MM HH:mm', { locale: ptBR })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OutboxTable({ 
  items, 
  onRequeue, 
  isRequeuing 
}: { 
  items: NotificationOutboxItem[]; 
  onRequeue: (id: string) => void;
  isRequeuing: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Destinatário</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tentativas</TableHead>
            <TableHead>Criado</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhuma notificação encontrada
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const statusConfig = STATUS_CONFIG[item.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.template_key}</div>
                    <div className="text-xs text-muted-foreground font-mono">{item.correlation_id.slice(0, 8)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.channel}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{item.to_address}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.attempts}/{item.max_attempts}</TableCell>
                  <TableCell>{format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {item.status === 'dead' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onRequeue(item.id)}
                          disabled={isRequeuing}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <DeliveryDetailsDialog 
        outboxId={selectedId || ''} 
        open={!!selectedId} 
        onOpenChange={(o) => !o && setSelectedId(null)} 
      />
    </>
  );
}

export function OpsNotificationsPanel() {
  const [statusFilter, setStatusFilter] = useState<NotificationOutboxItem['status'] | undefined>(undefined);
  const { outbox, stats, isLoading, refetch, requeueDead, processOutbox } = useNotificationOutbox({ status: statusFilter, limit: 200 });
  const { emitBillingNotifications } = useBillingNotificationEmitter();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <OutboxStats stats={stats} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Fila de Notificações
              </CardTitle>
              <CardDescription>Monitoramento e gestão de envios</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => processOutbox.mutate(50)}
                disabled={processOutbox.isPending}
              >
                {processOutbox.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Processar Fila
              </Button>
              <Button 
                variant="outline" 
                onClick={() => emitBillingNotifications.mutate({})}
                disabled={emitBillingNotifications.isPending}
              >
                {emitBillingNotifications.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Emitir Billing
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="queued">Na Fila</TabsTrigger>
              <TabsTrigger value="sent">Enviados</TabsTrigger>
              <TabsTrigger value="failed">Falhas</TabsTrigger>
              <TabsTrigger value="dead">Dead Letters</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter || 'all'} className="mt-4">
              {stats.dead > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dead Letters</AlertTitle>
                  <AlertDescription>
                    Existem {stats.dead} notificações que falharam permanentemente. Revise e reenvie se necessário.
                  </AlertDescription>
                </Alert>
              )}
              <OutboxTable 
                items={outbox} 
                onRequeue={(id) => requeueDead.mutate(id)}
                isRequeuing={requeueDead.isPending}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
