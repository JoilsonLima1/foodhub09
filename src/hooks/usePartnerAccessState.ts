/**
 * usePartnerAccessState - Hook to check partner billing access state (dunning enforcement)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';

export interface PartnerAccessState {
  access: 'full' | 'read_only' | 'blocked';
  dunning_level: number;
  blocked: boolean;
  read_only: boolean;
  message: string;
  overdue_count: number;
  overdue_amount: number;
  max_days_overdue: number;
}

export function usePartnerAccessState() {
  const { currentPartner: partner } = usePartnerContext();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['partner-access-state', partner?.id],
    queryFn: async () => {
      if (!partner?.id) return null;
      const { data, error } = await supabase
        .rpc('get_partner_access_state', { p_partner_id: partner.id });
      if (error) throw error;
      return data as unknown as PartnerAccessState;
    },
    enabled: !!partner?.id,
    staleTime: 60_000, // 1 min cache
  });

  return {
    accessState: data,
    isBlocked: data?.blocked ?? false,
    isReadOnly: data?.read_only ?? false,
    hasFullAccess: data?.access === 'full' || !data,
    dunningLevel: data?.dunning_level ?? 0,
    message: data?.message ?? '',
    isLoading,
    refetch,
  };
}
