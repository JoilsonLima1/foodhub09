import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicPaymentGateway {
  id: string;
  name: string;
  provider: 'stripe' | 'pix' | 'asaas';
  is_default: boolean;
  config: {
    pix_key?: string;
    qr_code_url?: string;
  } | null;
}

/**
 * Hook to fetch active payment gateways for checkout.
 * Uses SECURITY DEFINER RPC function that bypasses RLS.
 */
export function useActivePaymentGateways() {
  return useQuery({
    queryKey: ['active-payment-gateways'],
    queryFn: async (): Promise<PublicPaymentGateway[]> => {
      const { data, error } = await supabase.rpc('get_active_payment_gateways');
      
      if (error) {
        console.error('[useActivePaymentGateways] Error:', error);
        throw error;
      }
      
      return (data || []).map((gateway: any) => ({
        id: gateway.id,
        name: gateway.name,
        provider: gateway.provider as 'stripe' | 'pix' | 'asaas',
        is_default: gateway.is_default,
        config: gateway.config,
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
