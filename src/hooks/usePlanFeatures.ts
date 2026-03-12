/**
 * usePlanFeatures - Fetches the tenant's subscription plan feature flags
 * Used to gate sidebar items and features based on the active plan.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanFeatures {
  feature_pos: boolean;
  feature_kitchen_display: boolean;
  feature_delivery_management: boolean;
  feature_stock_control: boolean;
  feature_reports_basic: boolean;
  feature_reports_advanced: boolean;
  feature_cmv_reports: boolean;
  feature_ai_forecast: boolean;
  feature_courier_app: boolean;
  feature_multi_branch: boolean;
  feature_public_menu: boolean;
  feature_custom_integrations: boolean;
  feature_api_access: boolean;
  feature_white_label: boolean;
  feature_priority_support: boolean;
  feature_goal_notifications: boolean;
  plan_name: string;
  plan_slug: string;
}

const DEFAULT_FEATURES: PlanFeatures = {
  feature_pos: false,
  feature_kitchen_display: false,
  feature_delivery_management: false,
  feature_stock_control: false,
  feature_reports_basic: false,
  feature_reports_advanced: false,
  feature_cmv_reports: false,
  feature_ai_forecast: false,
  feature_courier_app: false,
  feature_multi_branch: false,
  feature_public_menu: false,
  feature_custom_integrations: false,
  feature_api_access: false,
  feature_white_label: false,
  feature_priority_support: false,
  feature_goal_notifications: false,
  plan_name: '',
  plan_slug: '',
};

export function usePlanFeatures() {
  const { tenantId } = useAuth();

  const { data: planFeatures, isLoading } = useQuery({
    queryKey: ['plan-features', tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_FEATURES;

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('subscription_plan_id')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant?.subscription_plan_id) {
        return DEFAULT_FEATURES;
      }

      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', tenant.subscription_plan_id)
        .single();

      if (planError || !plan) {
        return DEFAULT_FEATURES;
      }

      return {
        feature_pos: plan.feature_pos ?? false,
        feature_kitchen_display: plan.feature_kitchen_display ?? false,
        feature_delivery_management: plan.feature_delivery_management ?? false,
        feature_stock_control: plan.feature_stock_control ?? false,
        feature_reports_basic: plan.feature_reports_basic ?? false,
        feature_reports_advanced: plan.feature_reports_advanced ?? false,
        feature_cmv_reports: plan.feature_cmv_reports ?? false,
        feature_ai_forecast: plan.feature_ai_forecast ?? false,
        feature_courier_app: plan.feature_courier_app ?? false,
        feature_multi_branch: plan.feature_multi_branch ?? false,
        feature_public_menu: plan.feature_public_menu ?? false,
        feature_custom_integrations: plan.feature_custom_integrations ?? false,
        feature_api_access: plan.feature_api_access ?? false,
        feature_white_label: plan.feature_white_label ?? false,
        feature_priority_support: plan.feature_priority_support ?? false,
        feature_goal_notifications: plan.feature_goal_notifications ?? false,
        plan_name: plan.name,
        plan_slug: plan.slug,
      } as PlanFeatures;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  /** Check if a specific plan feature is enabled */
  const hasPlanFeature = (feature: keyof PlanFeatures): boolean => {
    if (!planFeatures) return false;
    return planFeatures[feature] === true;
  };

  return {
    planFeatures: planFeatures ?? DEFAULT_FEATURES,
    isLoading,
    hasPlanFeature,
  };
}
