/**
 * usePartnerCoupons - Hook for managing partner coupons
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PartnerCoupon {
  id: string;
  partner_id: string;
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions: number | null;
  max_redemptions_per_tenant: number | null;
  valid_from: string;
  valid_to: string | null;
  applies_to: 'plan' | 'addon' | 'any';
  min_amount: number | null;
  is_active: boolean;
  created_at: string;
  redemptions_count?: number;
}

interface CreateCouponInput {
  partner_id: string;
  code: string;
  description?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions?: number;
  max_redemptions_per_tenant?: number;
  valid_from?: string;
  valid_to?: string;
  applies_to?: 'plan' | 'addon' | 'any';
  min_amount?: number;
}

interface UpdateCouponInput {
  id: string;
  code?: string;
  description?: string;
  discount_type?: 'percent' | 'fixed';
  discount_value?: number;
  max_redemptions?: number;
  max_redemptions_per_tenant?: number;
  valid_to?: string;
  applies_to?: 'plan' | 'addon' | 'any';
  min_amount?: number;
  is_active?: boolean;
}

export function usePartnerCoupons(partnerId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading, refetch } = useQuery({
    queryKey: ['partner-coupons', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      
      // Get coupons with redemption counts
      const { data: couponsData, error } = await supabase
        .from('partner_coupons')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get redemption counts
      const couponIds = (couponsData || []).map(c => c.id);
      if (couponIds.length === 0) return [];
      
      const { data: redemptions } = await supabase
        .from('coupon_redemptions')
        .select('coupon_id')
        .in('coupon_id', couponIds);
      
      const redemptionCounts = (redemptions || []).reduce((acc, r) => {
        acc[r.coupon_id] = (acc[r.coupon_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return (couponsData || []).map(c => ({
        ...c,
        redemptions_count: redemptionCounts[c.id] || 0,
      })) as PartnerCoupon[];
    },
    enabled: !!partnerId,
  });

  const createCoupon = useMutation({
    mutationFn: async (input: CreateCouponInput) => {
      const { data, error } = await supabase
        .from('partner_coupons')
        .insert({
          partner_id: input.partner_id,
          code: input.code.toUpperCase(),
          description: input.description,
          discount_type: input.discount_type,
          discount_value: input.discount_value,
          max_redemptions: input.max_redemptions,
          max_redemptions_per_tenant: input.max_redemptions_per_tenant || 1,
          valid_from: input.valid_from || new Date().toISOString(),
          valid_to: input.valid_to,
          applies_to: input.applies_to || 'any',
          min_amount: input.min_amount,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-coupons', partnerId] });
      toast({ title: 'Cupom criado', description: 'O cupom foi criado com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar cupom', description: error.message, variant: 'destructive' });
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async (input: UpdateCouponInput) => {
      const { id, ...updates } = input;
      if (updates.code) updates.code = updates.code.toUpperCase();
      
      const { error } = await supabase
        .from('partner_coupons')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-coupons', partnerId] });
      toast({ title: 'Cupom atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar cupom', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase
        .from('partner_coupons')
        .delete()
        .eq('id', couponId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-coupons', partnerId] });
      toast({ title: 'Cupom excluído' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  return {
    coupons,
    isLoading,
    refetch,
    createCoupon: createCoupon.mutateAsync,
    updateCoupon: updateCoupon.mutateAsync,
    deleteCoupon: deleteCoupon.mutateAsync,
    isCreating: createCoupon.isPending,
    isUpdating: updateCoupon.isPending,
  };
}
