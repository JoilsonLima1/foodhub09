import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Public business category type (limited fields, no features/terminology/theme)
export interface PublicBusinessCategory {
  id: string;
  category_key: string;
  name: string;
  description: string | null;
  icon: string;
  display_order: number;
}

/**
 * Hook for fetching business categories on public pages (signup).
 * Uses RPC function that doesn't expose internal configuration like features/terminology/theme.
 */
export function usePublicBusinessCategories() {
  return useQuery({
    queryKey: ['public-business-categories'],
    queryFn: async (): Promise<PublicBusinessCategory[]> => {
      const { data, error } = await supabase.rpc('get_public_business_categories');

      if (error) throw error;
      return (data || []) as PublicBusinessCategory[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}
