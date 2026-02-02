import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { ServiceCall, ServiceCallStatus, ServiceCallType } from '@/types/digitalService';
import { useEffect } from 'react';

export function useServiceCalls(status?: ServiceCallStatus | ServiceCallStatus[]) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('service-calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_calls',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['service-calls'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ['service-calls', tenantId, status],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('service_calls')
        .select(`
          *,
          customer:customer_registrations(id, full_name, phone),
          table:tables(id, number, name),
          comanda:comandas(id, comanda_number)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ServiceCall[];
    },
    enabled: !!tenantId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useCreateServiceCall() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      comandaId?: string;
      tableId?: string;
      callType: ServiceCallType;
      customerId?: string;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      const { data, error } = await supabase
        .from('service_calls')
        .insert({
          tenant_id: tenantId,
          comanda_id: input.comandaId,
          table_id: input.tableId,
          call_type: input.callType,
          customer_id: input.customerId,
          notes: input.notes,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-calls'] });
      toast({ title: 'Chamado criado!', description: 'O garçom será notificado.' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar chamado',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAcknowledgeServiceCall() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ callId, waiterId }: { callId: string; waiterId?: string }) => {
      const now = new Date().toISOString();
      
      // Get creation time to calculate response time
      const { data: call, error: fetchError } = await supabase
        .from('service_calls')
        .select('created_at')
        .eq('id', callId)
        .single();

      if (fetchError) throw fetchError;

      const createdAt = new Date(call.created_at);
      const responseTimeSeconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);

      const { error } = await supabase
        .from('service_calls')
        .update({
          status: 'acknowledged',
          acknowledged_at: now,
          assigned_waiter_id: waiterId,
          response_time_seconds: responseTimeSeconds,
        })
        .eq('id', callId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-calls'] });
      toast({ title: 'Chamado recebido!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao aceitar chamado',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useResolveServiceCall() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ callId, notes }: { callId: string; notes?: string }) => {
      const { error } = await supabase
        .from('service_calls')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          notes,
        })
        .eq('id', callId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-calls'] });
      toast({ title: 'Chamado resolvido!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao resolver chamado',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useEscalateServiceCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const { data: call, error: fetchError } = await supabase
        .from('service_calls')
        .select('escalation_level')
        .eq('id', callId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('service_calls')
        .update({
          status: 'escalated',
          escalated_at: new Date().toISOString(),
          escalation_level: (call.escalation_level || 0) + 1,
          assigned_waiter_id: null, // Reassign
        })
        .eq('id', callId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-calls'] });
      toast({ title: 'Chamado escalado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao escalar chamado',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
