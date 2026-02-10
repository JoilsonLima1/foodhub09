import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AddonModuleCategory = 'integrations' | 'operations' | 'marketing' | 'hardware' | 'logistics';
export type AddonSubscriptionStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
export type ImplementationStatus = 'ready' | 'beta' | 'coming_soon' | 'development';

export interface AddonModule {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: AddonModuleCategory;
  icon: string;
  monthly_price: number;
  setup_fee: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  features: string[];
  requirements: string | null;
  implementation_status: ImplementationStatus;
  created_at: string;
  updated_at: string;
}

export interface TenantAddonSubscription {
  id: string;
  tenant_id: string;
  addon_module_id: string;
  status: AddonSubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  price_paid: number;
  is_free: boolean;
  source: 'manual' | 'plan_included' | 'purchase';
  addon_module?: AddonModule;
  tenant?: {
    id: string;
    name: string;
  };
}

/**
 * Hook to manage addon modules catalog (Super Admin)
 */
export function useAddonModules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modules = [], isLoading, error } = useQuery({
    queryKey: ['addon-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_modules')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as AddonModule[];
    },
  });

  const createModule = useMutation({
    mutationFn: async (module: Omit<AddonModule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('addon_modules')
        .insert(module)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-modules'] });
      toast({
        title: 'Módulo criado',
        description: 'O módulo foi adicionado ao catálogo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateModule = useMutation({
    mutationFn: async (module: Partial<AddonModule> & { id: string }) => {
      const { id, ...updates } = module;
      const { data, error } = await supabase
        .from('addon_modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-modules'] });
      toast({
        title: 'Módulo atualizado',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('addon_modules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-modules'] });
      toast({
        title: 'Módulo removido',
        description: 'O módulo foi removido do catálogo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    modules,
    isLoading,
    error,
    createModule,
    updateModule,
    deleteModule,
  };
}

/**
 * Hook to manage tenant addon subscriptions (Super Admin)
 */
export function useTenantAddonSubscriptions(tenantId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading, error } = useQuery({
    queryKey: ['tenant-addon-subscriptions', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('tenant_addon_subscriptions')
        .select(`
          *,
          addon_module:addon_modules(*),
          tenant:tenants(id, name)
        `)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TenantAddonSubscription[];
    },
  });

  const assignModule = useMutation({
    mutationFn: async (params: {
      tenant_id: string;
      addon_module_id: string;
      status?: AddonSubscriptionStatus;
      trial_ends_at?: string;
      expires_at?: string;
      notes?: string;
      is_free?: boolean;
      price_paid?: number;
      source?: 'manual' | 'plan_included' | 'purchase';
    }) => {
      const { data, error } = await supabase
        .from('tenant_addon_subscriptions')
        .insert({
          tenant_id: params.tenant_id,
          addon_module_id: params.addon_module_id,
          status: params.status || 'active',
          trial_ends_at: params.trial_ends_at,
          expires_at: params.expires_at,
          notes: params.notes,
          is_free: params.is_free || false,
          price_paid: params.price_paid || 0,
          source: params.source || 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-addon-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-addon-subscriptions'] });
      toast({
        title: 'Módulo atribuído',
        description: 'O módulo foi atribuído ao tenant.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atribuir módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async (params: {
      id: string;
      status?: AddonSubscriptionStatus;
      expires_at?: string | null;
      notes?: string;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from('tenant_addon_subscriptions')
        .update({
          ...updates,
          cancelled_at: updates.status === 'cancelled' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-addon-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-addon-subscriptions'] });
      toast({
        title: 'Assinatura atualizada',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar assinatura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeSubscription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_addon_subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-addon-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-addon-subscriptions'] });
      toast({
        title: 'Módulo removido',
        description: 'O módulo foi removido do tenant.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover módulo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    subscriptions,
    isLoading,
    error,
    assignModule,
    updateSubscription,
    removeSubscription,
  };
}

/**
 * Hook to get current tenant's addon subscriptions
 */
export function useMyAddonSubscriptions() {
  const { data: subscriptions, isLoading, error, refetch } = useQuery({
    queryKey: ['my-addon-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_addon_subscriptions')
        .select(`
          *,
          addon_module:addon_modules(*)
        `)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TenantAddonSubscription[];
    },
  });

  const hasAddon = (slug: string): boolean => {
    if (!subscriptions) return false;
    return subscriptions.some(
      (sub) => 
        sub.addon_module?.slug === slug && 
        ['active', 'trial'].includes(sub.status) &&
        (!sub.expires_at || new Date(sub.expires_at) > new Date())
    );
  };

  return {
    subscriptions,
    isLoading,
    error,
    hasAddon,
    refetch,
  };
}

// Category labels for display
export const ADDON_CATEGORY_LABELS: Record<AddonModuleCategory, string> = {
  integrations: 'Integrações',
  operations: 'Operações',
  marketing: 'Marketing',
  hardware: 'Hardware',
  logistics: 'Logística',
};

// Status labels for display
export const ADDON_STATUS_LABELS: Record<AddonSubscriptionStatus, string> = {
  active: 'Ativo',
  trial: 'Teste',
  suspended: 'Suspenso',
  cancelled: 'Cancelado',
};
