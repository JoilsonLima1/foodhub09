import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Comanda, ComandaStatus } from '@/types/digitalService';

export function useComandas(status?: ComandaStatus | ComandaStatus[]) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['comandas', tenantId, status],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('comandas')
        .select(`
          *,
          titular_customer:customer_registrations(*),
          table:tables(id, number, name)
        `)
        .eq('tenant_id', tenantId)
        .order('opened_at', { ascending: false });

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Comanda[];
    },
    enabled: !!tenantId,
  });
}

export function useComanda(comandaId: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['comanda', comandaId],
    queryFn: async () => {
      if (!comandaId) return null;

      const { data, error } = await supabase
        .from('comandas')
        .select(`
          *,
          titular_customer:customer_registrations!titular_customer_id(*),
          table:tables(id, number, name)
        `)
        .eq('id', comandaId)
        .single();

      if (error) throw error;
      
      // Fetch participants separately
      const { data: participants } = await supabase
        .from('comanda_participants')
        .select(`
          *,
          customer:customer_registrations!customer_id(*)
        `)
        .eq('comanda_id', comandaId);
      
      // Fetch orders separately
      const { data: orders } = await supabase
        .from('comanda_orders')
        .select('*')
        .eq('comanda_id', comandaId);
      
      return {
        ...data,
        participants: participants || [],
        orders: orders || [],
      } as Comanda;
    },
    enabled: !!comandaId && !!tenantId,
  });
}

export function useOpenComanda() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      tableId?: string;
      customerId?: string;
      waiterId?: string;
      expectedGuests?: number;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      const { data, error } = await supabase
        .from('comandas')
        .insert({
          tenant_id: tenantId,
          table_id: input.tableId,
          titular_customer_id: input.customerId,
          initial_waiter_id: input.waiterId,
          current_waiter_id: input.waiterId,
          expected_guests: input.expectedGuests || 1,
          notes: input.notes,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Log history
      await supabase.rpc('log_comanda_action', {
        p_comanda_id: data.id,
        p_action: 'Comanda aberta',
        p_actor_type: 'system',
        p_actor_id: user?.id,
        p_details: { table_id: input.tableId, waiter_id: input.waiterId },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      toast({ title: 'Comanda aberta!', description: 'Nova comanda criada com sucesso.' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao abrir comanda',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateComandaStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ comandaId, status, notes }: {
      comandaId: string;
      status: ComandaStatus;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      
      if (status === 'closed' || status === 'cancelled') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('comandas')
        .update(updateData)
        .eq('id', comandaId);

      if (error) throw error;

      // Log history
      await supabase.rpc('log_comanda_action', {
        p_comanda_id: comandaId,
        p_action: `Status alterado para ${status}`,
        p_actor_type: 'admin',
        p_actor_id: user?.id,
        p_details: { new_status: status, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['comanda'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCloseComanda() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (comandaId: string) => {
      // Check if fully paid
      const { data: comanda, error: fetchError } = await supabase
        .from('comandas')
        .select('pending_amount')
        .eq('id', comandaId)
        .single();

      if (fetchError) throw fetchError;
      if (comanda.pending_amount > 0) {
        throw new Error('Comanda possui valor pendente. Finalize o pagamento antes de fechar.');
      }

      const { error } = await supabase
        .from('comandas')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', comandaId);

      if (error) throw error;

      await supabase.rpc('log_comanda_action', {
        p_comanda_id: comandaId,
        p_action: 'Comanda fechada',
        p_actor_type: 'admin',
        p_actor_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      toast({ title: 'Comanda fechada com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao fechar comanda',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
