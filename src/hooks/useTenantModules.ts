import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlanAddonModules } from './usePlanAddonModules';
import type { AddonModule } from './useAddonModules';

export interface TenantModuleDetailed {
  id: string;
  tenant_id: string;
  addon_module_id: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  source: 'plan_included' | 'purchase' | 'manual';
  is_free: boolean;
  price_paid: number;
  started_at: string;
  expires_at: string | null;
  next_billing_date: string | null;
  billing_mode: 'bundle' | 'separate' | null;
  purchased_at: string | null;
  asaas_payment_id: string | null;
  asaas_subscription_id: string | null;
  stripe_subscription_id: string | null;
  addon_module?: AddonModule;
}

export interface ModulesBreakdown {
  /** Modules included in the tenant's current plan (brinde), even if not provisioned yet */
  planIncludedModules: AddonModule[];
  includedModules: TenantModuleDetailed[];
  purchasedModules: TenantModuleDetailed[];
  availableModules: AddonModule[];
  totalMonthly: number;
  planPrice: number;
  modulesTotal: number;
}

/**
 * Hook to fetch tenant's modules with categorization
 */
export function useTenantModules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { allPlanAddons } = usePlanAddonModules();

  const { data: tenantModules, isLoading: isLoadingModules, error: modulesError, refetch } = useQuery({
    queryKey: ['tenant-modules-detailed'],
    queryFn: async () => {
      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      // Get tenant's modules with addon details
      const { data, error } = await supabase
        .from('tenant_addon_subscriptions')
        .select(`
          *,
          addon_module:addon_modules(*)
        `)
        .eq('tenant_id', profile.tenant_id)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TenantModuleDetailed[];
    },
    staleTime: 1000 * 30,
  });

  const { data: allModules, isLoading: isLoadingAllModules } = useQuery({
    queryKey: ['all-addon-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_modules')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as AddonModule[];
    },
  });

  const { data: tenantInfo, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['tenant-plan-info'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select(`
          id,
          subscription_plan_id,
          subscription_status,
          subscription_plans:subscription_plan_id(
            id,
            name,
            monthly_price
          )
        `)
        .eq('id', profile.tenant_id)
        .single();

      if (error) throw error;
      return tenant;
    },
  });

  // Trigger module sync from plan
  const syncModulesFromPlan = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase.rpc('sync_tenant_modules_from_plan', {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['my-addon-subscriptions'] });
      toast({
        title: 'Módulos sincronizados',
        description: 'Os módulos do plano foram atualizados.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao sincronizar módulos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate breakdown
  const getModulesBreakdown = (): ModulesBreakdown => {
    const includedModules = tenantModules?.filter(m => m.source === 'plan_included') || [];
    const purchasedModules = tenantModules?.filter(m => m.source === 'purchase') || [];
    
    // Get IDs of modules already active for this tenant
    const activeModuleIds = new Set(tenantModules?.map(m => m.addon_module_id) || []);
    
    // Get IDs of modules included in current plan
    const planId = tenantInfo?.subscription_plan_id;
    const planIncludedIds = new Set(
      allPlanAddons?.filter(pa => pa.plan_id === planId).map(pa => pa.addon_module_id) || []
    );

    // Plan included module details (brinde) from catalog
    const planIncludedModules = allModules?.filter(m => planIncludedIds.has(m.id)) || [];

    // Modules that support quota-based purchasing (can buy multiple units)
    const quotaBasedModuleSlugs = ['multi_store'];
    
    // Available = all active modules that are not already subscribed AND not included in plan
    // Exception: quota-based modules remain available for re-purchase even if already owned
    const availableModules = allModules?.filter(m => {
      // Always exclude plan-included modules
      if (planIncludedIds.has(m.id)) return false;
      
      // For quota-based modules, always show as available for re-purchase
      if (quotaBasedModuleSlugs.includes(m.slug)) {
        // Don't show in available if already purchased - it will show in purchased section with +1 button
        return !activeModuleIds.has(m.id);
      }
      
      // For regular modules, hide if already subscribed
      return !activeModuleIds.has(m.id);
    }) || [];

    // Calculate totals
    const planPrice = (tenantInfo?.subscription_plans as any)?.monthly_price || 0;
    const modulesTotal = purchasedModules.reduce((sum, m) => 
      sum + (m.addon_module?.monthly_price || m.price_paid || 0), 0
    );

    return {
      planIncludedModules,
      includedModules,
      purchasedModules,
      availableModules,
      totalMonthly: planPrice + modulesTotal,
      planPrice,
      modulesTotal,
    };
  };

  const hasModule = (slug: string): boolean => {
    return tenantModules?.some(m => {
      if (m.addon_module?.slug !== slug) return false;
      if (!['active', 'trial'].includes(m.status)) return false;
      
      // Check trial expiration
      if (m.status === 'trial' && m.expires_at) {
        const expiresAt = new Date(m.expires_at);
        if (expiresAt < new Date()) return false;
      }
      // Also check trial_ends_at for trial status
      if (m.status === 'trial') {
        const sub = m as any;
        if (sub.trial_ends_at) {
          const trialEndsAt = new Date(sub.trial_ends_at);
          if (trialEndsAt < new Date()) return false;
        }
      }
      
      return true;
    }) || false;
  };

  /**
   * Check if a module is included in the current plan (even if not yet provisioned)
   */
  const isModuleIncludedInPlan = (moduleId: string): boolean => {
    const planId = tenantInfo?.subscription_plan_id;
    if (!planId || !allPlanAddons) return false;
    return allPlanAddons.some(
      pa => pa.plan_id === planId && pa.addon_module_id === moduleId
    );
  };

  /**
   * Check if a module is already active (purchased, plan_included, or manual)
   * Also checks trial expiration
   */
  const isModuleActive = (moduleId: string): boolean => {
    return tenantModules?.some(m => {
      if (m.addon_module_id !== moduleId) return false;
      if (!['active', 'trial'].includes(m.status)) return false;
      
      // Check trial expiration
      if (m.status === 'trial' && m.expires_at) {
        const expiresAt = new Date(m.expires_at);
        if (expiresAt < new Date()) return false;
      }
      // Also check trial_ends_at for trial status
      if (m.status === 'trial') {
        const sub = m as any;
        if (sub.trial_ends_at) {
          const trialEndsAt = new Date(sub.trial_ends_at);
          if (trialEndsAt < new Date()) return false;
        }
      }
      
      return true;
    }) || false;
  };

  /**
   * Check if purchase should be blocked for a module
   * Returns reason string if blocked, null if can purchase
   */
  const getPurchaseBlockReason = (moduleId: string): string | null => {
    if (isModuleIncludedInPlan(moduleId)) {
      return 'Este módulo já está incluído no seu plano';
    }
    if (isModuleActive(moduleId)) {
      return 'Você já possui este módulo ativo';
    }
    return null;
  };

  return {
    tenantModules,
    allModules,
    tenantInfo,
    isLoading: isLoadingModules || isLoadingAllModules || isLoadingTenant,
    error: modulesError,
    getModulesBreakdown,
    hasModule,
    isModuleIncludedInPlan,
    isModuleActive,
    getPurchaseBlockReason,
    syncModulesFromPlan,
    refetch,
  };
}
