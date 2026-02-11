import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PixPspProvider {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  supports_txid: boolean;
  supports_webhook: boolean;
  supports_subaccount: boolean;
  supports_split: boolean;
  pricing_model: 'percentual' | 'fixo' | 'hibrido';
  default_percent_fee: number;
  default_fixed_fee: number;
  api_docs_url: string | null;
  webhook_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PixPricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pricing_type: 'percentual' | 'fixo' | 'hibrido';
  percent_rate: number;
  fixed_rate: number;
  min_fee: number;
  max_fee: number | null;
  free_until: string | null;
  is_subsidized: boolean;
  subsidy_percent: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PixAvailabilityRule {
  id: string;
  scope: 'global' | 'partner' | 'tenant' | 'plan' | 'category';
  scope_id: string | null;
  psp_provider_id: string | null;
  pricing_plan_id: string | null;
  priority: number;
  is_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  psp_provider?: PixPspProvider;
  pricing_plan?: PixPricingPlan;
}

export function usePixAutomatico() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch PSP Providers
  const { data: providers, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['pix-psp-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pix_psp_providers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as PixPspProvider[];
    },
  });

  // Fetch Pricing Plans
  const { data: pricingPlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['pix-pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pix_pricing_plans')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PixPricingPlan[];
    },
  });

  // Fetch Availability Rules
  const { data: rules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['pix-availability-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pix_availability_rules')
        .select('*, psp_provider:pix_psp_providers(*), pricing_plan:pix_pricing_plans(*)')
        .order('scope')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as unknown as PixAvailabilityRule[];
    },
  });

  // Toggle PSP active
  const toggleProvider = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('pix_psp_providers')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pix-psp-providers'] });
      toast({ title: 'PSP atualizado' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Update PSP fees
  const updateProvider = useMutation({
    mutationFn: async (updates: Partial<PixPspProvider> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase
        .from('pix_psp_providers')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pix-psp-providers'] });
      toast({ title: 'PSP atualizado' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Create Pricing Plan
  const createPlan = useMutation({
    mutationFn: async (plan: Omit<PixPricingPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('pix_pricing_plans')
        .insert([plan]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pix-pricing-plans'] });
      toast({ title: 'Plano PIX criado' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Update Pricing Plan
  const updatePlan = useMutation({
    mutationFn: async (updates: Partial<PixPricingPlan> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase
        .from('pix_pricing_plans')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pix-pricing-plans'] });
      toast({ title: 'Plano PIX atualizado' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Create Availability Rule
  const createRule = useMutation({
    mutationFn: async (rule: Omit<PixAvailabilityRule, 'id' | 'created_at' | 'updated_at' | 'psp_provider' | 'pricing_plan'>) => {
      const { error } = await supabase
        .from('pix_availability_rules')
        .insert([rule]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pix-availability-rules'] });
      toast({ title: 'Regra criada' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Update Rule
  const updateRule = useMutation({
    mutationFn: async (updates: Partial<PixAvailabilityRule> & { id: string }) => {
      const { id, psp_provider, pricing_plan, ...rest } = updates;
      const { error } = await supabase
        .from('pix_availability_rules')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pix-availability-rules'] });
      toast({ title: 'Regra atualizada' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Delete Rule
  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pix_availability_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pix-availability-rules'] });
      toast({ title: 'Regra removida' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return {
    providers: providers || [],
    pricingPlans: pricingPlans || [],
    rules: rules || [],
    isLoading: isLoadingProviders || isLoadingPlans || isLoadingRules,
    toggleProvider,
    updateProvider,
    createPlan,
    updatePlan,
    createRule,
    updateRule,
    deleteRule,
  };
}
