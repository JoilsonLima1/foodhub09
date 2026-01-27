import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Subscriber {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    subscription_status: string | null;
  };
  subscription_plans?: {
    id: string;
    name: string;
    monthly_price: number;
  };
}

export function useSubscribers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscribers, isLoading, error } = useQuery({
    queryKey: ['subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          tenant:tenants(id, name, email, phone, subscription_status),
          subscription_plans(id, name, monthly_price)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Subscriber[];
    },
  });

  const updateSubscriber = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      toast({
        title: 'Assinatura atualizada',
        description: 'O status foi alterado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSubscriber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      toast({
        title: 'Assinatura removida',
        description: 'O registro foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const stats = {
    total: subscribers?.length || 0,
    active: subscribers?.filter(s => s.status === 'active').length || 0,
    trialing: subscribers?.filter(s => s.status === 'trialing').length || 0,
    canceled: subscribers?.filter(s => s.status === 'canceled').length || 0,
    monthlyRevenue: subscribers
      ?.filter(s => s.status === 'active')
      .reduce((acc, s) => acc + (s.subscription_plans?.monthly_price || 0), 0) || 0,
  };

  return {
    subscribers,
    isLoading,
    error,
    updateSubscriber,
    deleteSubscriber,
    stats,
  };
}
