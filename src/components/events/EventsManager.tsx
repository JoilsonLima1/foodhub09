import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Calendar, Ticket, QrCode, Users, DollarSign } from 'lucide-react';
import { useEvents, useCreateEvent, useEventTickets, useSellTicket, useValidateTicket } from '@/hooks/useEvents';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TICKET_STATUS_LABELS, type TicketStatus } from '@/types/digitalService';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export function EventsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [validateCode, setValidateCode] = useState('');

  const { data: events, isLoading } = useEvents();
  const { data: tickets } = useEventTickets(selectedEventId || undefined);
  const createEvent = useCreateEvent();
  const validateTicket = useValidateTicket();

  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    ticket_price: 0,
    couvert_price: 0,
    total_capacity: 100,
    requires_full_registration: true,
    allow_refunds: false,
  });

  const handleCreateEvent = () => {
    createEvent.mutate(newEvent, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        setNewEvent({
          name: '',
          description: '',
          event_date: '',
          start_time: '',
          end_time: '',
          ticket_price: 0,
          couvert_price: 0,
          total_capacity: 100,
          requires_full_registration: true,
          allow_refunds: false,
        });
      },
    });
  };

  const handleValidateTicket = () => {
    if (validateCode) {
      validateTicket.mutate(validateCode, {
        onSuccess: () => setValidateCode(''),
      });
    }
  };

  const filteredEvents = events?.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTicketStatusVariant = (status: TicketStatus) => {
    switch (status) {
      case 'sold':
        return 'default';
      case 'used':
        return 'secondary';
      case 'cancelled':
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Eventos e Ingressos</h2>
          <p className="text-muted-foreground">
            Gerencie eventos, ingressos e couvert
          </p>
        </div>

        <div className="flex gap-2">
          {/* Validate Ticket Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <QrCode className="h-4 w-4 mr-2" />
                Validar Ingresso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Validar Ingresso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Código do Ingresso</Label>
                  <Input
                    placeholder="TKT-XXXXX-XXXX"
                    value={validateCode}
                    onChange={(e) => setValidateCode(e.target.value.toUpperCase())}
                  />
                </div>
                <Button
                  onClick={handleValidateTicket}
                  disabled={!validateCode || validateTicket.isPending}
                  className="w-full"
                >
                  {validateTicket.isPending ? 'Validando...' : 'Validar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Event Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Evento</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Nome do Evento</Label>
                    <Input
                      value={newEvent.name}
                      onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                      placeholder="Ex: Festa de Ano Novo"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Detalhes do evento..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Capacidade</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newEvent.total_capacity}
                      onChange={(e) => setNewEvent({ ...newEvent, total_capacity: parseInt(e.target.value) || 100 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Horário Início</Label>
                    <Input
                      type="time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Horário Fim</Label>
                    <Input
                      type="time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preço do Ingresso (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={newEvent.ticket_price}
                      onChange={(e) => setNewEvent({ ...newEvent, ticket_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Couvert Artístico (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={newEvent.couvert_price}
                      onChange={(e) => setNewEvent({ ...newEvent, couvert_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex items-center justify-between col-span-2">
                    <div className="space-y-0.5">
                      <Label>Exigir cadastro completo</Label>
                      <p className="text-sm text-muted-foreground">CPF e documento obrigatórios</p>
                    </div>
                    <Switch
                      checked={newEvent.requires_full_registration}
                      onCheckedChange={(checked) => setNewEvent({ ...newEvent, requires_full_registration: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between col-span-2">
                    <div className="space-y-0.5">
                      <Label>Permitir reembolso</Label>
                      <p className="text-sm text-muted-foreground">Cliente pode cancelar e receber de volta</p>
                    </div>
                    <Switch
                      checked={newEvent.allow_refunds}
                      onCheckedChange={(checked) => setNewEvent({ ...newEvent, allow_refunds: checked })}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreateEvent}
                  disabled={!newEvent.name || !newEvent.event_date || createEvent.isPending}
                  className="w-full"
                >
                  {createEvent.isPending ? 'Criando...' : 'Criar Evento'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar eventos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : !filteredEvents?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            Nenhum evento encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              {event.image_url && (
                <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${event.image_url})` }} />
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                  <Badge variant={event.is_active ? 'default' : 'secondary'}>
                    {event.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <CardDescription>
                  {formatDate(event.event_date)}
                  {event.start_time && ` às ${event.start_time}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    <span>{formatCurrency(event.ticket_price)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{event.tickets_sold}/{event.total_capacity || '∞'}</span>
                  </div>
                </div>

                {event.tickets_available !== null && event.tickets_available <= 10 && event.tickets_available > 0 && (
                  <Badge variant="secondary" className="w-full justify-center">
                    Apenas {event.tickets_available} ingressos restantes!
                  </Badge>
                )}

                {event.tickets_available === 0 && (
                  <Badge variant="destructive" className="w-full justify-center">
                    Esgotado
                  </Badge>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    Ver Ingressos
                  </Button>
                  <Button className="flex-1">
                    Vender
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tickets Dialog */}
      {selectedEventId && (
        <Dialog open={!!selectedEventId} onOpenChange={() => setSelectedEventId(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Ingressos do Evento</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets?.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono">{ticket.ticket_code}</TableCell>
                      <TableCell className="capitalize">{ticket.ticket_type}</TableCell>
                      <TableCell>{ticket.customer?.full_name || 'Anônimo'}</TableCell>
                      <TableCell>{formatCurrency(ticket.price_paid)}</TableCell>
                      <TableCell>
                        <Badge variant={getTicketStatusVariant(ticket.status)}>
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(ticket.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
