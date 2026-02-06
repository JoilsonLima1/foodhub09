/**
 * UsageLimitBanner Component
 * 
 * Shows usage limits and upgrade CTA when limits are reached.
 */

import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Infinity, ArrowUpCircle } from 'lucide-react';

interface UsageLimitBannerProps {
  /** Name of the feature/limit being tracked */
  featureName: string;
  /** Current usage count */
  used: number;
  /** Maximum allowed (-1 for unlimited) */
  limit: number;
  /** Whether the limit has been reached */
  isBlocked?: boolean;
  /** Custom message to display */
  message?: string;
  /** Whether to show as compact inline badge */
  compact?: boolean;
}

export function UsageLimitBanner({
  featureName,
  used,
  limit,
  isBlocked = false,
  message,
  compact = false,
}: UsageLimitBannerProps) {
  const isUnlimited = limit === -1;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - used);
  const percentUsed = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const isWarning = !isUnlimited && percentUsed >= 80;
  const isDanger = !isUnlimited && percentUsed >= 100;

  // Compact badge version
  if (compact) {
    if (isUnlimited) {
      return (
        <Badge variant="outline" className="text-xs">
          <Infinity className="h-3 w-3 mr-1" />
          {featureName} ilimitado
        </Badge>
      );
    }

    return (
      <Badge 
        variant={isDanger ? 'destructive' : isWarning ? 'secondary' : 'outline'} 
        className="text-xs"
      >
        {featureName}: {used}/{limit}
      </Badge>
    );
  }

  // Full banner version
  if (isUnlimited) {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <Infinity className="h-4 w-4 text-primary" />
        <AlertTitle>Uso Ilimitado</AlertTitle>
        <AlertDescription>
          Você tem acesso ilimitado a {featureName} no seu plano atual.
        </AlertDescription>
      </Alert>
    );
  }

  if (isBlocked || isDanger) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Limite Atingido</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            {message || `Você atingiu o limite de ${limit} ${featureName} este mês.`}
          </p>
          <div className="flex items-center gap-4">
            <Progress value={100} className="flex-1 h-2" />
            <span className="text-sm font-medium">{used}/{limit}</span>
          </div>
          <Link to="/settings?tab=subscription">
            <Button size="sm" variant="outline" className="mt-2">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Fazer Upgrade
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (isWarning) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <TrendingUp className="h-4 w-4 text-amber-600" />
        <AlertTitle>Limite Próximo</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Você usou {used} de {limit} {featureName} este mês. 
            Restam {remaining} {remaining === 1 ? 'uso' : 'usos'}.
          </p>
          <div className="flex items-center gap-4">
            <Progress value={percentUsed} className="flex-1 h-2" />
            <span className="text-sm font-medium">{used}/{limit}</span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Normal state - just show progress
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{featureName} usados</span>
          <span className="font-medium">{used}/{limit}</span>
        </div>
        <Progress value={percentUsed} className="h-2" />
      </div>
    </div>
  );
}

/**
 * Inline limit indicator for action buttons
 */
export function UsageLimitIndicator({
  used,
  limit,
  label = 'Restantes',
}: {
  used: number;
  limit: number;
  label?: string;
}) {
  const isUnlimited = limit === -1;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - used);
  const isBlocked = !isUnlimited && remaining <= 0;

  if (isUnlimited) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Infinity className="h-3 w-3" />
        Ilimitado
      </span>
    );
  }

  return (
    <span className={`text-xs flex items-center gap-1 ${isBlocked ? 'text-destructive' : 'text-muted-foreground'}`}>
      {remaining} {label}
    </span>
  );
}
