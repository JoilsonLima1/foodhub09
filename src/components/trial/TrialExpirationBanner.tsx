import { useState, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, X, Sparkles, AlertTriangle, Info } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type BannerTone = 'warning' | 'critical' | 'info';

function BannerChip({
  tone,
  children,
  className,
}: {
  tone: BannerTone | 'neutral' | 'muted';
  children: ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === 'critical'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : tone === 'info'
        ? 'border-info/30 bg-info/10 text-info-foreground'
        : tone === 'warning'
          ? 'border-warning/30 bg-warning/10 text-warning-foreground'
          : tone === 'muted'
            ? 'border-border/40 bg-muted/60 text-muted-foreground'
            : 'border-border/50 bg-muted/40 text-foreground';

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium leading-none',
        toneClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}

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
  const bannerType = (notificationSettings?.banner_type ?? 'warning') as BannerTone;
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

  const titleText =
    daysRemaining === 0
      ? 'Seu período de teste expira hoje!'
      : daysRemaining === 1
        ? 'Seu período de teste expira amanhã!'
        : `Seu período de teste expira em ${daysRemaining} dias`;

  return (
    <Alert variant="default" className="mb-4 border-none bg-transparent p-0">
      <div className="flex flex-col gap-3">
        {/* Mantém semântica do componente Alert para leitores de tela */}
        <AlertTitle className="sr-only">{titleText}</AlertTitle>
        <AlertDescription className="sr-only">Expira em: {expirationDisplay}</AlertDescription>

        <div className="flex flex-wrap items-center gap-2">
          <BannerChip tone={bannerType}>
            {getIcon()}
            <span>{titleText}</span>
          </BannerChip>

          <BannerChip tone="neutral">
            <span>
              Expira em: <strong className="font-semibold">{expirationDisplay}</strong>
            </span>
          </BannerChip>

          {subscriptionStatus?.status === 'trialing' && (
            <BannerChip tone="muted">
              Após o término, seu acesso será limitado ao plano gratuito
            </BannerChip>
          )}

          <div className="ml-auto flex items-center gap-2">
            {bannerImageUrl && (
              <img
                src={bannerImageUrl}
                alt="Banner do período de teste"
                className="hidden md:block h-8 w-auto object-contain"
                loading="lazy"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
              disabled={dismissNotification.isPending}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleUpgrade} disabled={isUpgrading} className="gap-2">
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
      </div>
    </Alert>
  );
}
