import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface PaymentGateway {
  id: string;
  name: string;
  provider: string;
  api_key_masked: string | null;
  is_active: boolean;
  is_default: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type CreateGatewayInput = {
  name: string;
  provider: string;
  api_key_masked?: string;
  is_active?: boolean;
  is_default?: boolean;
  config?: Record<string, unknown>;
};

type UpdateGatewayInput = {
  id: string;
  name?: string;
  provider?: string;
  api_key_masked?: string;
  is_active?: boolean;
  is_default?: boolean;
  config?: Record<string, unknown>;
};

export function usePaymentGateways() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gateways, isLoading, error } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PaymentGateway[];
    },
  });

  const createGateway = useMutation({
    mutationFn: async (gateway: CreateGatewayInput) => {
      const insertData = {
        name: gateway.name,
        provider: gateway.provider,
        api_key_masked: gateway.api_key_masked || null,
        is_active: gateway.is_active ?? false,
        is_default: gateway.is_default ?? false,
        config: (gateway.config || {}) as Json,
      };

      const { data, error } = await supabase
        .from('payment_gateways')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateways'] });
      toast({
        title: 'Gateway criado',
        description: 'O gateway de pagamento foi adicionado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar gateway',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateGateway = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateGatewayInput) => {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.provider !== undefined) updateData.provider = updates.provider;
      if (updates.api_key_masked !== undefined) updateData.api_key_masked = updates.api_key_masked;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.is_default !== undefined) updateData.is_default = updates.is_default;
      if (updates.config !== undefined) updateData.config = updates.config as Json;

      const { data, error } = await supabase
        .from('payment_gateways')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateways'] });
      toast({
        title: 'Gateway atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar gateway',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteGateway = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_gateways')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateways'] });
      toast({
        title: 'Gateway removido',
        description: 'O gateway foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover gateway',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    gateways,
    isLoading,
    error,
    createGateway,
    updateGateway,
    deleteGateway,
  };
}
