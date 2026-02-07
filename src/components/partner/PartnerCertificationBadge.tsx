/**
 * PartnerCertificationBadge - Shows certification status badge
 * Used in dashboard and partner sidebar
 */

import { Award, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePartnerOnboarding } from '@/hooks/usePartnerOnboarding';
import { cn } from '@/lib/utils';

interface PartnerCertificationBadgeProps {
  variant?: 'default' | 'compact';
  showProgress?: boolean;
}

export function PartnerCertificationBadge({ 
  variant = 'default',
  showProgress = false 
}: PartnerCertificationBadgeProps) {
  const { progress, isLoading } = usePartnerOnboarding();

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!progress) return null;

  const isCertified = progress.ready_to_sell && progress.dry_run_passed;
  const isReady = progress.ready_to_sell && !progress.dry_run_passed;

  if (variant === 'compact') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            isCertified 
              ? 'bg-primary/20 text-primary' 
              : isReady
                ? 'bg-warning/20 text-warning-foreground'
                : 'bg-muted text-muted-foreground'
          )}>
            {isCertified ? (
              <Award className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {showProgress && (
              <span>{progress.completion_percentage}%</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isCertified 
            ? 'Parceiro Certificado - Operação completa'
            : isReady
              ? 'Execute o teste de prontidão para certificar'
              : `Onboarding: ${progress.completion_percentage}% completo`
          }
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isCertified) {
    return (
      <Badge variant="default" className="gap-1 bg-primary">
        <Award className="h-3 w-3" />
        Parceiro Certificado
      </Badge>
    );
  }

  if (isReady) {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Pendente: Teste de Prontidão
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      Onboarding: {progress.completion_percentage}%
    </Badge>
  );
}
