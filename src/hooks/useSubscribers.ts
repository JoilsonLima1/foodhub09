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
      // First try to get from subscriptions table
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          tenant:tenants(id, name, email, phone, subscription_status),
          subscription_plans(id, name, monthly_price)
        `)
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      // If we have subscriptions, use them
      if (subscriptionsData && subscriptionsData.length > 0) {
        return subscriptionsData as Subscriber[];
      }

      // Fallback: Get subscription data directly from tenants table
      // This handles the case where subscription data is stored on the tenant
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          email,
          phone,
          subscription_status,
          subscription_plan_id,
          subscription_current_period_start,
          subscription_current_period_end,
          trial_ends_at,
          created_at,
          updated_at,
          subscription_plans:subscription_plan_id(id, name, monthly_price)
        `)
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Transform tenants data to match Subscriber interface
      return (tenantsData || []).map((tenant: any) => ({
        id: tenant.id, // Use tenant id as the subscriber id
        tenant_id: tenant.id,
        plan_id: tenant.subscription_plan_id,
        status: tenant.subscription_status || 'trialing',
        stripe_subscription_id: null,
        stripe_customer_id: null,
        current_period_start: tenant.subscription_current_period_start,
        current_period_end: tenant.subscription_current_period_end,
        trial_ends_at: tenant.trial_ends_at,
        canceled_at: null,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          subscription_status: tenant.subscription_status,
        },
        subscription_plans: tenant.subscription_plans,
      })) as Subscriber[];
    },
  });

  const updateSubscriber = useMutation({
    mutationFn: async ({ id, status, plan_id }: { id: string; status: string; plan_id?: string }) => {
      // Check if we're updating a subscription record or a tenant directly
      const { data: subscriptionExists } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (subscriptionExists) {
        // Update in subscriptions table
        const updateData: any = { status };
        if (plan_id !== undefined) {
          updateData.plan_id = plan_id;
        }
        
        const { data, error } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Update in tenants table directly
        const updateData: any = { subscription_status: status };
        if (plan_id !== undefined) {
          updateData.subscription_plan_id = plan_id;
        }
        
        const { data, error } = await supabase
          .from('tenants')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
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
      // Check if we're deleting from subscriptions or tenants
      const { data: subscriptionExists } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (subscriptionExists) {
        const { error } = await supabase
          .from('subscriptions')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // For tenants, we just reset the subscription status
        const { error } = await supabase
          .from('tenants')
          .update({ 
            subscription_status: 'inactive',
            subscription_plan_id: null,
            subscription_current_period_start: null,
            subscription_current_period_end: null,
          })
          .eq('id', id);

        if (error) throw error;
      }
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
