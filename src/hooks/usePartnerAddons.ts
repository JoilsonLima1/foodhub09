/**
 * usePartnerAddons - Hook for managing partner add-ons
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PartnerAddon {
  id: string;
  name: string;
  description: string | null;
  pricing_type: 'recurring' | 'one_time';
  amount: number;
  currency: string;
  billing_period: 'monthly' | 'yearly' | null;
  module_key: string | null;
  is_active: boolean;
  subscribers_count: number;
}

interface CreateAddonInput {
  partner_id: string;
  name: string;
  description?: string;
  pricing_type?: 'recurring' | 'one_time';
  amount: number;
  billing_period?: 'monthly' | 'yearly';
  module_key?: string;
}

interface UpdateAddonInput {
  addon_id: string;
  name?: string;
  description?: string;
  pricing_type?: 'recurring' | 'one_time';
  amount?: number;
  billing_period?: 'monthly' | 'yearly';
  is_active?: boolean;
}

export function usePartnerAddons(partnerId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: addons = [], isLoading, refetch } = useQuery({
    queryKey: ['partner-addons', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      
      const { data, error } = await supabase
        .rpc('list_partner_addons', { p_partner_id: partnerId });
      
      if (error) throw error;
      return (data || []) as PartnerAddon[];
    },
    enabled: !!partnerId,
  });

  const createAddon = useMutation({
    mutationFn: async (input: CreateAddonInput) => {
      const { data, error } = await supabase.rpc('create_partner_addon', {
        p_partner_id: input.partner_id,
        p_name: input.name,
        p_description: input.description || null,
        p_pricing_type: input.pricing_type || 'recurring',
        p_amount: input.amount,
        p_billing_period: input.billing_period || 'monthly',
        p_module_key: input.module_key || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-addons', partnerId] });
      toast({ title: 'Add-on criado', description: 'O add-on foi criado com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar add-on', description: error.message, variant: 'destructive' });
    },
  });

  const updateAddon = useMutation({
    mutationFn: async (input: UpdateAddonInput) => {
      const { data, error } = await supabase.rpc('update_partner_addon', {
        p_addon_id: input.addon_id,
        p_name: input.name || null,
        p_description: input.description || null,
        p_pricing_type: input.pricing_type || null,
        p_amount: input.amount || null,
        p_billing_period: input.billing_period || null,
        p_is_active: input.is_active ?? null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-addons', partnerId] });
      toast({ title: 'Add-on atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar add-on', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAddon = useMutation({
    mutationFn: async (addonId: string) => {
      const { error } = await supabase
        .from('partner_addons')
        .delete()
        .eq('id', addonId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-addons', partnerId] });
      toast({ title: 'Add-on excluído' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  return {
    addons,
    isLoading,
    refetch,
    createAddon: createAddon.mutateAsync,
    updateAddon: updateAddon.mutateAsync,
    deleteAddon: deleteAddon.mutateAsync,
    isCreating: createAddon.isPending,
    isUpdating: updateAddon.isPending,
  };
}
