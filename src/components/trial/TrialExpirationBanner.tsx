import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, X, Sparkles, AlertTriangle, Info } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function TrialExpirationBanner() {
  const { session } = useAuth();
  const {
    subscriptionStatus,
    notificationSettings,
    shouldShowNotification,
    dismissNotification,
    getExpirationDisplay,
    getDaysRemaining,
  } = useTrialStatus();

  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!shouldShowNotification) {
    return null;
  }

  const daysRemaining = getDaysRemaining();
  const expirationDisplay = getExpirationDisplay();
  const bannerType = notificationSettings?.banner_type ?? 'warning';
  const bannerImageUrl = notificationSettings?.banner_image_url;

  const handleUpgrade = async () => {
    if (!session?.access_token) return;

    setIsUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId: 'starter' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDismiss = () => {
    dismissNotification.mutate();
  };

  const getAlertVariant = () => {
    switch (bannerType) {
      case 'critical':
        return 'destructive';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const getIcon = () => {
    switch (bannerType) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getBannerStyles = () => {
    switch (bannerType) {
      case 'critical':
        return 'border-destructive bg-destructive/10';
      case 'info':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30';
      default:
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30';
    }
  };

  return (
    <Alert 
      variant={getAlertVariant()} 
      className={`mb-4 relative ${getBannerStyles()}`}
    >
      {bannerImageUrl && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden md:block">
          <img
            src={bannerImageUrl}
            alt="Trial banner"
            className="h-12 w-auto object-contain"
          />
        </div>
      )}
      
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            {daysRemaining === 0 
              ? 'Seu período de teste expira hoje!' 
              : daysRemaining === 1 
                ? 'Seu período de teste expira amanhã!' 
                : `Seu período de teste expira em ${daysRemaining} dias`
            }
          </AlertTitle>
          <AlertDescription className="mt-1">
            <p className="text-sm mb-3">
              Expira em: <strong>{expirationDisplay}</strong>
              {subscriptionStatus?.status === 'trialing' && (
                <span className="ml-2 text-muted-foreground">
                  • Após o término, seu acesso será limitado ao plano gratuito
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isUpgrading ? 'Redirecionando...' : 'Fazer Upgrade Agora'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                disabled={dismissNotification.isPending}
              >
                Continuar sem Upgrade
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleDismiss}
        disabled={dismissNotification.isPending}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </Button>
    </Alert>
  );
}
