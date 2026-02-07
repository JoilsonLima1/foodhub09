import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Search, Loader2 } from 'lucide-react';
import { usePaymentEventsSearch } from '@/hooks/useOpsBackoffice';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface PaymentEvent {
  id: string;
  provider: string;
  provider_event_id: string;
  provider_payment_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  tenant_id: string | null;
  partner_id: string | null;
  created_at: string;
}

interface TransactionEffect {
  id: string;
  source_event_id: string;
  target: string;
  target_record_id: string | null;
  direction: string;
  amount: number;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function OpsPaymentsPanel() {
  const { searchPaymentEvent } = usePaymentEventsSearch();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [effects, setEffects] = useState<TransactionEffect[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({ title: 'Digite um ID de pagamento', variant: 'destructive' });
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchPaymentEvent(searchQuery.trim());
      setEvents(result.events as PaymentEvent[]);
      setEffects(result.effects as unknown as TransactionEffect[]);
      setHasSearched(true);
      
      if (result.events.length === 0) {
        toast({ title: 'Nenhum evento encontrado para este ID' });
      }
    } catch (error) {
      toast({ 
        title: 'Erro na busca', 
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive' 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getEventTypeBadge = (eventType: string) => {
    if (eventType.includes('CONFIRMED') || eventType.includes('RECEIVED')) {
      return <Badge variant="default">{eventType}</Badge>;
    }
    if (eventType.includes('REFUND') || eventType.includes('CHARGEBACK')) {
      return <Badge variant="destructive">{eventType}</Badge>;
    }
    if (eventType.includes('PENDING') || eventType.includes('CREATED')) {
      return <Badge variant="secondary">{eventType}</Badge>;
    }
    return <Badge variant="outline">{eventType}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Busca de Pagamentos
        </CardTitle>
        <CardDescription>
          Pesquise eventos e efeitos por ID do pagamento do provider
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite o provider_payment_id (ex: pay_xxx)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Buscar'
            )}
          </Button>
        </div>

        {/* Results */}
        {hasSearched && (
          <>
            {/* Payment Events */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Eventos de Pagamento ({events.length})</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Tipo de Evento</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Payload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          Nenhum evento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Badge variant="outline">{event.provider}</Badge>
                          </TableCell>
                          <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                          <TableCell>
                            {event.tenant_id ? (
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {event.tenant_id.substring(0, 8)}...
                              </code>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {event.partner_id ? (
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {event.partner_id.substring(0, 8)}...
                              </code>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <details className="cursor-pointer">
                              <summary className="text-xs text-muted-foreground">Ver payload</summary>
                              <pre className="text-xs mt-1 max-w-[300px] overflow-auto bg-muted p-2 rounded">
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            </details>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Transaction Effects */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Efeitos de Transação ({effects.length})</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Direção</TableHead>
                      <TableHead>Alvo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Razão</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          Nenhum efeito encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      effects.map((effect) => (
                        <TableRow key={effect.id}>
                          <TableCell>
                            <Badge variant={effect.direction === 'credit' ? 'default' : 'secondary'}>
                              {effect.direction}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{effect.target}</span>
                              {effect.target_record_id && (
                                <code className="text-xs text-muted-foreground">
                                  {effect.target_record_id.substring(0, 8)}...
                                </code>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${effect.amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {formatCurrency(effect.amount)}
                          </TableCell>
                          <TableCell className="text-sm">{effect.reason || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(effect.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
