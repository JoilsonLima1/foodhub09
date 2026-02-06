import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicSubscriber {
  id: string;
  name: string;
  category_name: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
}

/**
 * Hook for fetching public subscriber list (stores that opted-in for public display)
 */
export function usePublicSubscribers() {
  const { data: subscribers = [], isLoading, error } = useQuery({
    queryKey: ['public-subscribers'],
    queryFn: async (): Promise<PublicSubscriber[]> => {
      // Fetch active tenants for public listing
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, city, state, logo_url, business_category')
        .eq('is_active', true)
        .in('subscription_status', ['active', 'trialing'])
        .order('name');

      if (error) throw error;
      
      // Transform to expected format
      return (data || []).map((t) => ({
        id: t.id,
        name: t.name,
        category_name: t.business_category || null,
        city: t.city || null,
        state: t.state || null,
        logo_url: t.logo_url || null,
      }));
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Group subscribers by category
  const byCategory = subscribers.reduce((acc, sub) => {
    const category = sub.category_name || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(sub);
    return acc;
  }, {} as Record<string, PublicSubscriber[]>);

  // Group by state
  const byState = subscribers.reduce((acc, sub) => {
    const state = sub.state || 'Não informado';
    if (!acc[state]) acc[state] = [];
    acc[state].push(sub);
    return acc;
  }, {} as Record<string, PublicSubscriber[]>);

  return {
    subscribers,
    byCategory,
    byState,
    totalCount: subscribers.length,
    isLoading,
    error,
  };
}
