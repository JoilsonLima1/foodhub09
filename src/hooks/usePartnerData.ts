/**
 * usePartnerData - Hooks for partner-specific data operations
 * 
 * These hooks are scoped to the current partner context.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePartnerContext } from '@/contexts/PartnerContext';

// ==================== Partner Tenants ====================

export interface PartnerTenantWithDetails {
  id: string;
  partner_id: string;
  tenant_id: string;
  partner_plan_id: string | null;
  status: string;
  joined_at: string;
  next_billing_date: string | null;
  billing_notes: string | null;
  tenant: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    is_active: boolean;
    subscription_status: string | null;
    created_at: string;
  } | null;
  plan: {
    id: string;
    name: string;
    monthly_price: number;
  } | null;
  subscription: {
    id: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    delinquency_stage: string | null;
    payment_provider: string | null;
  } | null;
}

export function usePartnerTenantsData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();

  const { data: tenants = [], isLoading, refetch } = useQuery({
    queryKey: ['partner-tenants-data', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      const { data, error } = await supabase
        .from('partner_tenants')
        .select(`
          *,
          tenant:tenants(id, name, email, phone, is_active, subscription_status, created_at),
          plan:partner_plans(id, name, monthly_price),
          subscription:tenant_subscriptions(id, status, current_period_start, current_period_end, trial_ends_at, delinquency_stage, payment_provider)
        `)
        .eq('partner_id', currentPartner.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      
      // Flatten subscription array to single object (taking most recent)
      return (data || []).map((pt: any) => ({
        ...pt,
        subscription: Array.isArray(pt.subscription) 
          ? pt.subscription[0] || null 
          : pt.subscription,
      })) as PartnerTenantWithDetails[];
    },
    enabled: !!currentPartner?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('partner_tenants')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-tenants-data'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    inactive: tenants.filter(t => t.status !== 'active').length,
  };

  return {
    tenants,
    isLoading,
    stats,
    refetch,
    updateStatus,
  };
}

// ==================== Partner Plans ====================

export interface PartnerPlanData {
  id: string;
  partner_id: string;
  base_plan_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  currency: string;
  max_users: number | null;
  max_products: number | null;
  max_orders_per_month: number | null;
  included_modules: string[] | null;
  included_features: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  is_default: boolean;
  display_order: number;
  trial_days: number;
  is_free: boolean;
}

export function usePartnerPlansData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();

  const { data: plans = [], isLoading, error, refetch } = useQuery({
    queryKey: ['partner-plans-data', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      const { data, error } = await supabase
        .from('partner_plans')
        .select('*')
        .eq('partner_id', currentPartner.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        is_featured: !!p.is_featured,
        is_default: !!p.is_default,
      })) as PartnerPlanData[];
    },
    enabled: !!currentPartner?.id,
  });

  const createPlan = useMutation({
    mutationFn: async (plan: Omit<PartnerPlanData, 'id' | 'partner_id'>) => {
      if (!currentPartner?.id) throw new Error('Partner not found');

      const { data, error } = await supabase
        .from('partner_plans')
        .insert({
          ...plan,
          partner_id: currentPartner.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-plans-data'] });
      toast({ title: 'Plano criado com sucesso' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PartnerPlanData> & { id: string }) => {
      const { error } = await supabase
        .from('partner_plans')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-plans-data'] });
      toast({ title: 'Plano atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partner_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-plans-data'] });
      toast({ title: 'Plano removido' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Set default plan (ensures only 1 default per partner)
  const setDefaultPlan = useMutation({
    mutationFn: async (planId: string) => {
      if (!currentPartner?.id) throw new Error('Partner not found');
      // Clear all defaults first
      const { error: clearError } = await supabase
        .from('partner_plans')
        .update({ is_default: false } as any)
        .eq('partner_id', currentPartner.id);
      if (clearError) throw clearError;
      // Set the chosen one
      const { error: setError } = await supabase
        .from('partner_plans')
        .update({ is_default: true } as any)
        .eq('id', planId);
      if (setError) throw setError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-plans-data'] });
      toast({ title: 'Plano padrão atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao definir plano padrão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    plans,
    isLoading,
    error,
    refetch,
    createPlan,
    updatePlan,
    deletePlan,
    setDefaultPlan,
  };
}

// ==================== Partner Fee Config ====================

export interface PartnerFeeConfigData {
  id: string;
  partner_id: string;
  is_enabled: boolean;
  platform_fee_percent: number | null;
  platform_fee_fixed: number | null;
  pix_fee_percent: number | null;
  credit_fee_percent: number | null;
  debit_fee_percent: number | null;
  boleto_fee_fixed: number | null;
  platform_share_percent: number | null;
  platform_share_enabled: boolean | null;
}

export interface PartnerFeeLimits {
  max_platform_fee_percent: number;
  max_platform_fee_fixed: number;
  max_pix_fee_percent: number;
  max_credit_fee_percent: number;
  max_debit_fee_percent: number;
  max_boleto_fee_fixed: number;
}

export function usePartnerFeeConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();

  const { data: feeConfig, isLoading } = useQuery({
    queryKey: ['partner-fee-config', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return null;

      const { data, error } = await supabase
        .from('partner_fee_config')
        .select('*')
        .eq('partner_id', currentPartner.id)
        .maybeSingle();

      if (error) throw error;
      return data as PartnerFeeConfigData | null;
    },
    enabled: !!currentPartner?.id,
  });

  // Fetch global fee limits from partner_policies
  const { data: feeLimits } = useQuery({
    queryKey: ['partner-fee-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_policies')
        .select('max_platform_fee_percent, max_platform_fee_fixed, max_pix_fee_percent, max_credit_fee_percent, max_debit_fee_percent, max_boleto_fee_fixed')
        .is('partner_id', null)
        .single();

      if (error) {
        // Return defaults if no policy exists
        return {
          max_platform_fee_percent: 10,
          max_platform_fee_fixed: 5,
          max_pix_fee_percent: 5,
          max_credit_fee_percent: 10,
          max_debit_fee_percent: 5,
          max_boleto_fee_fixed: 10,
        } as PartnerFeeLimits;
      }
      return data as PartnerFeeLimits;
    },
  });

  const updateFeeConfig = useMutation({
    mutationFn: async (updates: Partial<PartnerFeeConfigData>) => {
      if (!currentPartner?.id) throw new Error('Partner not found');

      // Validate against limits
      if (feeLimits) {
        if (updates.platform_fee_percent && updates.platform_fee_percent > feeLimits.max_platform_fee_percent) {
          throw new Error(`Taxa percentual não pode exceder ${feeLimits.max_platform_fee_percent}%`);
        }
        if (updates.platform_fee_fixed && updates.platform_fee_fixed > feeLimits.max_platform_fee_fixed) {
          throw new Error(`Taxa fixa não pode exceder R$ ${feeLimits.max_platform_fee_fixed}`);
        }
        if (updates.pix_fee_percent && updates.pix_fee_percent > feeLimits.max_pix_fee_percent) {
          throw new Error(`Taxa PIX não pode exceder ${feeLimits.max_pix_fee_percent}%`);
        }
        if (updates.credit_fee_percent && updates.credit_fee_percent > feeLimits.max_credit_fee_percent) {
          throw new Error(`Taxa Crédito não pode exceder ${feeLimits.max_credit_fee_percent}%`);
        }
        if (updates.debit_fee_percent && updates.debit_fee_percent > feeLimits.max_debit_fee_percent) {
          throw new Error(`Taxa Débito não pode exceder ${feeLimits.max_debit_fee_percent}%`);
        }
        if (updates.boleto_fee_fixed && updates.boleto_fee_fixed > feeLimits.max_boleto_fee_fixed) {
          throw new Error(`Taxa Boleto não pode exceder R$ ${feeLimits.max_boleto_fee_fixed}`);
        }
      }

      const { error } = await supabase
        .from('partner_fee_config')
        .upsert({
          partner_id: currentPartner.id,
          ...updates,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-fee-config'] });
      toast({ title: 'Configuração de taxas atualizada' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar taxas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    feeConfig,
    feeLimits,
    isLoading,
    updateFeeConfig,
  };
}

// ==================== Partner Users ====================

export interface PartnerUserData {
  id: string;
  partner_id: string;
  user_id: string;
  role: 'partner_admin' | 'partner_support';
  is_active: boolean;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function usePartnerUsersData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['partner-users-data', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      const { data, error } = await supabase
        .from('partner_users')
        .select(`
          *,
          profile:profiles(full_name, avatar_url)
        `)
        .eq('partner_id', currentPartner.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map((u: any) => ({
        ...u,
        profile: u.profile?.[0] || u.profile,
      })) as PartnerUserData[];
    },
    enabled: !!currentPartner?.id,
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase
        .from('partner_users')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-users-data'] });
      toast({ title: 'Cargo atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar cargo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleUserActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('partner_users')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-users-data'] });
      toast({ title: 'Status do usuário atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partner_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-users-data'] });
      toast({ title: 'Usuário removido' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    users,
    isLoading,
    updateUserRole,
    toggleUserActive,
    removeUser,
  };
}

// ==================== Partner Dashboard Stats ====================

export function usePartnerDashboardStats() {
  const { currentPartner } = usePartnerContext();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['partner-dashboard-stats', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) {
        return {
          totalTenants: 0,
          activeTenants: 0,
          tenantLimit: 0,
          totalRevenue: 0,
          activeDomainsCount: 0,
          plansCount: 0,
        };
      }

      // Fetch tenant counts
      const { data: tenants } = await supabase
        .from('partner_tenants')
        .select('status')
        .eq('partner_id', currentPartner.id);

      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;

      // Fetch domains count
      const { count: domainsCount } = await supabase
        .from('partner_domains')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', currentPartner.id)
        .eq('is_verified', true);

      // Fetch plans count
      const { count: plansCount } = await supabase
        .from('partner_plans')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', currentPartner.id)
        .eq('is_active', true);

      return {
        totalTenants,
        activeTenants,
        tenantLimit: currentPartner.max_tenants,
        tenantLimitUsed: Math.round((totalTenants / currentPartner.max_tenants) * 100),
        activeDomainsCount: domainsCount || 0,
        plansCount: plansCount || 0,
        totalRevenue: 0, // Placeholder for future implementation
      };
    },
    enabled: !!currentPartner?.id,
  });

  return { stats, isLoading };
}
