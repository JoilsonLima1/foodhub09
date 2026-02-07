/**
 * useTenantCoupons - Hook for tenant coupon redemption
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingCoupon {
  id: string;
  tenant_id: string;
  coupon_id: string;
  applies_to: 'next_invoice' | 'specific_addon';
  status: 'pending' | 'applied' | 'expired' | 'invalid';
  created_at: string;
  coupon?: {
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
  };
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  discount_amount: number;
  original_amount: number;
  final_amount: number;
  redeemed_at: string;
}

export function useTenantCoupons() {
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Get pending coupons
  const { data: pendingCoupons = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['tenant-pending-coupons', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_pending_coupons')
        .select(`
          *,
          coupon:partner_coupons(code, discount_type, discount_value)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');
      
      if (error) throw error;
      return (data || []) as PendingCoupon[];
    },
    enabled: !!tenantId,
  });

  // Get redemption history
  const { data: redemptions = [], isLoading: isLoadingRedemptions } = useQuery({
    queryKey: ['tenant-coupon-redemptions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('coupon_redemptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('redeemed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []) as CouponRedemption[];
    },
    enabled: !!tenantId,
  });

  // Validate coupon
  const validateCoupon = useMutation({
    mutationFn: async (code: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_tenant_id: tenantId,
        p_code: code,
      });
      
      if (error) throw error;
      
      const result = data?.[0];
      if (!result?.valid) {
        throw new Error(result?.error_message || 'Cupom inválido');
      }
      
      return result;
    },
  });

  // Apply coupon to next invoice
  const applyCoupon = useMutation({
    mutationFn: async (code: string) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      
      const { data, error } = await supabase.rpc('apply_coupon_to_next_invoice', {
        p_tenant_id: tenantId,
        p_code: code,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-pending-coupons', tenantId] });
      toast({ 
        title: 'Cupom aplicado', 
        description: 'O desconto será aplicado na sua próxima fatura.' 
      });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao aplicar cupom', description: error.message, variant: 'destructive' });
    },
  });

  // Remove pending coupon
  const removePendingCoupon = useMutation({
    mutationFn: async (pendingCouponId: string) => {
      const { error } = await supabase
        .from('tenant_pending_coupons')
        .update({ status: 'expired' })
        .eq('id', pendingCouponId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-pending-coupons', tenantId] });
      toast({ title: 'Cupom removido' });
    },
  });

  return {
    pendingCoupons,
    redemptions,
    isLoading: isLoadingPending || isLoadingRedemptions,
    validateCoupon: validateCoupon.mutateAsync,
    applyCoupon: applyCoupon.mutateAsync,
    removePendingCoupon: removePendingCoupon.mutateAsync,
    isValidating: validateCoupon.isPending,
    isApplying: applyCoupon.isPending,
  };
}
