/**
 * useOnboardingGuard - Hook for checking partner readiness before actions
 * Used to enforce onboarding completion before critical actions
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { toast } from 'sonner';

interface ReadinessResult {
  allowed: boolean;
  reason: string;
  missing_steps: string[];
}

type ActionType = 'create_tenant' | 'create_paid_tenant' | 'activate_plan' | 'enable_sales' | 'publish_site';

const STEP_LABELS: Record<string, string> = {
  branding: 'Marca & White-label',
  payments: 'Pagamentos & Repasse',
  notifications: 'Notificações',
  plans: 'Planos & Preços',
  domains: 'Domínios',
  compliance: 'Compliance',
};

export function useOnboardingGuard() {
  const { currentPartner } = usePartnerContext();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);

  const checkAndProceed = useCallback(async (
    action: ActionType,
    onAllowed: () => void | Promise<void>,
    options?: { 
      showToast?: boolean; 
      redirectOnBlock?: boolean;
    }
  ): Promise<boolean> => {
    const { showToast = true, redirectOnBlock = true } = options || {};
    
    if (!currentPartner?.id) {
      toast.error('Parceiro não identificado');
      return false;
    }

    setIsChecking(true);

    try {
      const { data, error } = await supabase
        .rpc('assert_partner_ready_for', {
          p_partner_id: currentPartner.id,
          p_action: action,
        });

      if (error) throw error;

      const result = data as unknown as ReadinessResult;

      if (result.allowed) {
        await onAllowed();
        return true;
      }

      // Not allowed - show feedback
      if (showToast) {
        const missingLabels = result.missing_steps
          .map(step => STEP_LABELS[step] || step)
          .join(', ');
        
        toast.error(result.reason, {
          description: missingLabels ? `Pendente: ${missingLabels}` : undefined,
          action: redirectOnBlock ? {
            label: 'Ver Onboarding',
            onClick: () => navigate('/partner/onboarding'),
          } : undefined,
        });
      }

      if (redirectOnBlock) {
        navigate('/partner/onboarding');
      }

      return false;
    } catch (error) {
      console.error('Onboarding guard error:', error);
      toast.error('Erro ao verificar prontidão');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [currentPartner?.id, navigate]);

  // Convenience methods for common actions
  const guardCreateTenant = useCallback((onAllowed: () => void | Promise<void>) => {
    return checkAndProceed('create_tenant', onAllowed);
  }, [checkAndProceed]);

  const guardCreatePaidTenant = useCallback((onAllowed: () => void | Promise<void>) => {
    return checkAndProceed('create_paid_tenant', onAllowed);
  }, [checkAndProceed]);

  const guardActivatePlan = useCallback((onAllowed: () => void | Promise<void>) => {
    return checkAndProceed('activate_plan', onAllowed);
  }, [checkAndProceed]);

  const guardEnableSales = useCallback((onAllowed: () => void | Promise<void>) => {
    return checkAndProceed('enable_sales', onAllowed);
  }, [checkAndProceed]);

  const guardPublishSite = useCallback((onAllowed: () => void | Promise<void>) => {
    return checkAndProceed('publish_site', onAllowed);
  }, [checkAndProceed]);

  return {
    checkAndProceed,
    isChecking,
    guardCreateTenant,
    guardCreatePaidTenant,
    guardActivatePlan,
    guardEnableSales,
    guardPublishSite,
  };
}
