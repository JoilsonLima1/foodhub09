/**
 * usePartnerPolicy - Hook to fetch and validate against partner policies
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';

export interface PartnerPolicy {
  id: string;
  partner_id: string | null;
  max_plans_per_partner: number;
  allow_free_plan: boolean;
  min_paid_plan_price: number;
  free_plan_max_modules: number;
  free_plan_max_features: number;
  max_trial_days_allowed: number;
  trial_allowed_modules: string[];
  trial_allowed_features: string[];
  allowed_modules_catalog: string[];
  allowed_features_catalog: string[];
  max_modules_per_plan: number;
  max_features_per_plan: number;
  require_plan_hierarchy: boolean;
  allow_offline_billing: boolean;
}

export function usePartnerPolicy() {
  const { currentPartner } = usePartnerContext();

  const { data: policy, isLoading } = useQuery({
    queryKey: ['partner-policy', currentPartner?.id],
    queryFn: async () => {
      // Try to get partner-specific policy first
      if (currentPartner?.id) {
        const { data: specificPolicy } = await supabase
          .from('partner_policies')
          .select('*')
          .eq('partner_id', currentPartner.id)
          .maybeSingle();

        if (specificPolicy) return specificPolicy as PartnerPolicy;
      }

      // Fall back to global policy
      const { data: globalPolicy, error } = await supabase
        .from('partner_policies')
        .select('*')
        .is('partner_id', null)
        .single();

      if (error) throw error;
      return globalPolicy as PartnerPolicy;
    },
    enabled: true,
  });

  // Validation helpers
  const validatePlan = (plan: {
    is_free?: boolean;
    monthly_price: number;
    trial_days?: number;
    included_modules?: string[];
    included_features?: string[];
  }) => {
    const errors: string[] = [];

    if (!policy) return { valid: false, errors: ['Política não carregada'] };

    // Free plan check
    if (plan.is_free && !policy.allow_free_plan) {
      errors.push('Plano gratuito não permitido');
    }

    // Minimum price check
    if (!plan.is_free && plan.monthly_price < policy.min_paid_plan_price) {
      errors.push(`Preço mínimo para plano pago: R$ ${policy.min_paid_plan_price.toFixed(2)}`);
    }

    // Trial days check
    if (plan.trial_days && plan.trial_days > policy.max_trial_days_allowed) {
      errors.push(`Máximo de ${policy.max_trial_days_allowed} dias de trial`);
    }

    // Modules check
    if (plan.included_modules) {
      if (plan.included_modules.length > policy.max_modules_per_plan) {
        errors.push(`Máximo de ${policy.max_modules_per_plan} módulos por plano`);
      }

      const invalidModules = plan.included_modules.filter(
        m => !policy.allowed_modules_catalog.includes(m)
      );
      if (invalidModules.length > 0) {
        errors.push(`Módulos não permitidos: ${invalidModules.join(', ')}`);
      }

      // Free plan module limit
      if (plan.is_free && plan.included_modules.length > policy.free_plan_max_modules) {
        errors.push(`Plano grátis pode ter no máximo ${policy.free_plan_max_modules} módulos`);
      }
    }

    // Features check
    if (plan.included_features) {
      if (plan.included_features.length > policy.max_features_per_plan) {
        errors.push(`Máximo de ${policy.max_features_per_plan} features por plano`);
      }

      const invalidFeatures = plan.included_features.filter(
        f => !policy.allowed_features_catalog.includes(f)
      );
      if (invalidFeatures.length > 0) {
        errors.push(`Features não permitidas: ${invalidFeatures.join(', ')}`);
      }

      // Free plan feature limit
      if (plan.is_free && plan.included_features.length > policy.free_plan_max_features) {
        errors.push(`Plano grátis pode ter no máximo ${policy.free_plan_max_features} features`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  return {
    policy,
    isLoading,
    validatePlan,
  };
}
