import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Public subscription plans type (limited fields, no Stripe IDs)
export interface PublicSubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  currency: string;
  display_order: number;
  max_users: number;
  max_products: number;
  max_orders_per_month: number;
  feature_pos: boolean;
  feature_kitchen_display: boolean;
  feature_delivery_management: boolean;
  feature_stock_control: boolean;
  feature_reports_basic: boolean;
  feature_reports_advanced: boolean;
  feature_ai_forecast: boolean;
  feature_multi_branch: boolean;
  feature_api_access: boolean;
  feature_white_label: boolean;
  feature_priority_support: boolean;
  feature_custom_integrations: boolean;
  feature_cmv_reports: boolean;
  feature_goal_notifications: boolean;
  feature_courier_app: boolean;
  feature_public_menu: boolean;
}

/**
 * Hook for fetching subscription plans on public pages (landing, pricing).
 * Uses RPC function that doesn't expose sensitive fields like Stripe IDs.
 */
export function usePublicSubscriptionPlans() {
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['public-subscription-plans'],
    queryFn: async (): Promise<PublicSubscriptionPlan[]> => {
      const { data, error } = await supabase.rpc('get_public_subscription_plans');

      if (error) throw error;
      return (data || []) as PublicSubscriptionPlan[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  return {
    plans,
    isLoading,
    error,
  };
}
