/**
 * SubscriptionRenewalBanner - Shows for admins when subscription needs renewal
 */

import { AlertTriangle, CreditCard, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTenantSubscription } from '@/hooks/useTenantSubscription';

export function SubscriptionRenewalBanner() {
  const { subscription, needsRenewal, trialDaysRemaining, isTrialActive } = useTenantSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !needsRenewal) return null;

  const isUrgent = trialDaysRemaining <= 3 || subscription?.status === 'expired';

  return (
    <div className={`relative px-4 py-3 ${isUrgent ? 'bg-destructive text-destructive-foreground' : 'bg-amber-500 text-white'}`}>
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            {isTrialActive ? (
              <>
                Seu período de teste termina em {trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}.
                Renove agora para continuar usando todos os recursos.
              </>
            ) : (
              <>
                Sua assinatura expirou. Renove para restaurar o acesso completo.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isUrgent ? 'secondary' : 'default'}
            className="whitespace-nowrap"
            onClick={() => {
              // Navigate to subscription management
              window.location.href = '/settings?tab=subscription';
            }}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Renovar Agora
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={isUrgent ? 'text-destructive-foreground hover:bg-destructive-foreground/10' : 'text-white hover:bg-white/10'}
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
