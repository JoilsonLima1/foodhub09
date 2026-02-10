import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStoneEvents } from '@/hooks/useStoneProviderAccounts';
import { Loader2, Copy, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stone-webhook`;

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  ok: CheckCircle2,
  pending: Clock,
  retry: RefreshCw,
  failed: XCircle,
};

export function StoneWebhooksPanel() {
  const { data: events, isLoading } = useStoneEvents();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: 'URL copiada!' });
  };

  const filtered = events?.filter(e =>
    !search || e.event_type.toLowerCase().includes(search.toLowerCase()) || e.provider_event_id?.includes(search)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Endpoint de Webhook Stone</CardTitle>
          <CardDescription>Configure esta URL no painel Stone para receber eventos automaticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" onClick={copyUrl}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Eventos: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_CANCELED, PAYMENT_REFUNDED, CHARGEBACK_CREATED
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Eventos Recebidos</CardTitle>
            <Input
              placeholder="Filtrar por tipo ou ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !filtered?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento recebido ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Provider Event ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(event => {
                  const StatusIcon = STATUS_ICONS[event.process_status] || Clock;
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                      <TableCell className="font-mono text-xs">{event.provider_event_id || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={event.process_status === 'ok' ? 'default' : event.process_status === 'failed' ? 'destructive' : 'secondary'} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {event.process_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.retry_count}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-48 truncate">{event.error_message || '—'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(event.created_at), 'dd/MM/yy HH:mm:ss')}</TableCell>
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
