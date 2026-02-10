import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Copy, RefreshCw, Key, CheckCircle2, XCircle, Clock, Loader2, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  ok: CheckCircle2,
  pending: Clock,
  retry: RefreshCw,
  failed: XCircle,
};

const WEBHOOK_URLS: Record<string, string> = {
  stripe: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`,
  asaas: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`,
  stone: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stone-webhook`,
};

interface GatewayWebhookPanelProps {
  provider: 'stripe' | 'asaas' | 'stone';
  providerAccountId?: string | null;
}

export function GatewayWebhookPanel({ provider, providerAccountId }: GatewayWebhookPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const webhookUrl = WEBHOOK_URLS[provider] || '';

  // Fetch webhook config for this provider account
  const { data: webhookConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['gateway-webhook-config', providerAccountId],
    enabled: !!providerAccountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_provider_webhooks')
        .select('*')
        .eq('provider_account_id', providerAccountId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent events
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['gateway-webhook-events', providerAccountId],
    enabled: !!providerAccountId,
    queryFn: async () => {
      let query = supabase
        .from('payment_provider_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (providerAccountId) {
        query = query.eq('provider_account_id', providerAccountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Generate/rotate webhook secret
  const generateSecret = useMutation({
    mutationFn: async () => {
      const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
      const secretHash = `${secret.slice(0, 8)}...${secret.slice(-4)}`;

      if (webhookConfig) {
        const { error } = await supabase
          .from('payment_provider_webhooks')
          .update({
            webhook_secret_hash: secretHash,
            webhook_url: webhookUrl,
            enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', webhookConfig.id);
        if (error) throw error;
      } else if (providerAccountId) {
        const { error } = await supabase
          .from('payment_provider_webhooks')
          .insert({
            provider_account_id: providerAccountId,
            webhook_secret_hash: secretHash,
            webhook_url: webhookUrl,
            enabled: true,
          });
        if (error) throw error;
      }

      return secret;
    },
    onSuccess: (secret) => {
      queryClient.invalidateQueries({ queryKey: ['gateway-webhook-config'] });
      // Show the full secret once for copying
      toast({
        title: 'Webhook Secret gerado!',
        description: `Copie agora: ${secret}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao gerar secret', description: err.message, variant: 'destructive' });
    },
  });

  // Reprocess a failed event
  const reprocessEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('payment_provider_events')
        .update({
          process_status: 'pending',
          retry_count: 0,
          error_message: null,
          processed_at: null,
        })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-webhook-events'] });
      toast({ title: 'Evento marcado para reprocessamento' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const filteredEvents = events?.filter(e =>
    !search ||
    e.event_type.toLowerCase().includes(search.toLowerCase()) ||
    e.provider_event_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoint de Webhook</CardTitle>
          <CardDescription>Configure esta URL no painel do provedor para receber eventos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Secret */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Secret</CardTitle>
          <CardDescription>Secret usado para validar a assinatura dos eventos recebidos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {webhookConfig?.webhook_secret_hash ? (
            <div className="flex items-center gap-2">
              <Input
                value={showSecret ? (webhookConfig.webhook_secret_hash || '') : '••••••••••••••••'}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookConfig.webhook_secret_hash || '')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum secret configurado.</p>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSecret.mutate()}
              disabled={generateSecret.isPending || !providerAccountId}
            >
              {generateSecret.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              {webhookConfig?.webhook_secret_hash ? 'Rotacionar Secret' : 'Gerar Secret'}
            </Button>

            {webhookConfig?.enabled !== undefined && (
              <Badge variant={webhookConfig.enabled ? 'default' : 'secondary'}>
                {webhookConfig.enabled ? 'Habilitado' : 'Desabilitado'}
              </Badge>
            )}
          </div>

          {webhookConfig?.last_received_at && (
            <p className="text-xs text-muted-foreground">
              Último evento: {format(new Date(webhookConfig.last_received_at), 'dd/MM/yyyy HH:mm:ss')}
            </p>
          )}
          {webhookConfig && (
            <p className="text-xs text-muted-foreground">
              Total recebidos: {webhookConfig.total_received} · Falhas: {webhookConfig.total_failed}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Eventos Recebidos</CardTitle>
            <Input
              placeholder="Filtrar por tipo ou ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !filteredEvents?.length ? (
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map(event => {
                  const StatusIcon = STATUS_ICONS[event.process_status] || Clock;
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                      <TableCell className="font-mono text-xs">{event.provider_event_id || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={event.process_status === 'ok' ? 'default' : event.process_status === 'failed' ? 'destructive' : 'secondary'}
                          className="flex items-center gap-1 w-fit"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {event.process_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.retry_count}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-48 truncate">
                        {event.error_message || '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(event.created_at), 'dd/MM/yy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {(event.process_status === 'failed' || event.process_status === 'retry') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reprocessEvent.mutate(event.id)}
                            disabled={reprocessEvent.isPending}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reprocessar
                          </Button>
                        )}
                      </TableCell>
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
