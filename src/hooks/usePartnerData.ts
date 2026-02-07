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
          plan:partner_plans(id, name, monthly_price)
        `)
        .eq('partner_id', currentPartner.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PartnerTenantWithDetails[];
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
  display_order: number;
  trial_days: number;
  is_free: boolean;
}

export function usePartnerPlansData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentPartner } = usePartnerContext();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['partner-plans-data', currentPartner?.id],
    queryFn: async () => {
      if (!currentPartner?.id) return [];

      const { data, error } = await supabase
        .from('partner_plans')
        .select('*')
        .eq('partner_id', currentPartner.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as PartnerPlanData[];
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

  return {
    plans,
    isLoading,
    createPlan,
    updatePlan,
    deletePlan,
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

  const updateFeeConfig = useMutation({
    mutationFn: async (updates: Partial<PartnerFeeConfigData>) => {
      if (!currentPartner?.id) throw new Error('Partner not found');

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
