import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Event, Ticket, TicketStatus } from '@/types/digitalService';

export function useEvents() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['events', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!tenantId,
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      return data as Event;
    },
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Event>) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      const { data, error } = await supabase
        .from('events')
        .insert({
          tenant_id: tenantId,
          name: input.name!,
          description: input.description,
          image_url: input.image_url,
          event_date: input.event_date!,
          start_time: input.start_time,
          end_time: input.end_time,
          ticket_price: input.ticket_price!,
          couvert_price: input.couvert_price || 0,
          total_capacity: input.total_capacity,
          tickets_available: input.total_capacity,
          requires_full_registration: input.requires_full_registration ?? true,
          allow_refunds: input.allow_refunds ?? false,
          refund_deadline_hours: input.refund_deadline_hours ?? 24,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Evento criado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar evento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<Event> }) => {
      const { error } = await supabase
        .from('events')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event'] });
      toast({ title: 'Evento atualizado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar evento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Evento excluído!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir evento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Tickets
export function useEventTickets(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-tickets', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customer_registrations(id, full_name, phone, cpf)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Ticket[];
    },
    enabled: !!eventId,
  });
}

export function useSellTicket() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      customerId?: string;
      ticketType: 'entry' | 'couvert' | 'vip';
      pricePaid: number;
      paymentId?: string;
    }) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      // Generate unique ticket code
      const ticketCode = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          tenant_id: tenantId,
          event_id: input.eventId,
          customer_id: input.customerId,
          ticket_code: ticketCode,
          ticket_type: input.ticketType,
          price_paid: input.pricePaid,
          payment_id: input.paymentId,
          status: 'sold',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      toast({ title: 'Ingresso vendido!', description: `Código: ${data.ticket_code}` });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao vender ingresso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useValidateTicket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketCode: string) => {
      // Find ticket
      const { data: ticket, error: findError } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_code', ticketCode)
        .single();

      if (findError) throw new Error('Ingresso não encontrado');

      if (ticket.status === 'used') {
        throw new Error('Ingresso já utilizado');
      }

      if (ticket.status === 'cancelled' || ticket.status === 'expired') {
        throw new Error('Ingresso inválido');
      }

      // Mark as used
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'used',
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
        })
        .eq('id', ticket.id);

      if (error) throw error;
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      toast({ title: 'Ingresso validado!', description: 'Entrada liberada.' });
    },
    onError: (error) => {
      toast({
        title: 'Erro na validação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRefundTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, refundAmount }: { ticketId: string; refundAmount: number }) => {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'cancelled',
          refunded_at: new Date().toISOString(),
          refund_amount: refundAmount,
        })
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Ingresso reembolsado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro no reembolso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
