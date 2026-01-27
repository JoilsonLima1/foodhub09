import { Badge } from '@/components/ui/badge';
import { Clock, Crown, AlertTriangle, Gift, Loader2 } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export function TrialStatusBadge() {
  const { isTrialActive, isTrialExpired, daysRemaining, reason, isLoading } = useFeatureAccess();

  if (isLoading) {
    return (
      <Badge variant="secondary" className="bg-muted">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Carregando...
      </Badge>
    );
  }

  if (reason === 'subscribed') {
    return (
      <Badge variant="default" className="bg-primary text-primary-foreground">
        <Crown className="h-3 w-3 mr-1" />
        Assinante
      </Badge>
    );
  }

  if (isTrialActive) {
    const variant = daysRemaining <= 3 ? 'destructive' : 'secondary';
    const Icon = daysRemaining <= 3 ? AlertTriangle : Gift;
    
    return (
      <Badge variant={variant} className={daysRemaining <= 3 ? '' : 'bg-green-500/10 text-green-600 border-green-500/20'}>
        <Icon className="h-3 w-3 mr-1" />
        {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes
      </Badge>
    );
  }

  if (isTrialExpired) {
    return (
      <Badge variant="destructive">
        <Clock className="h-3 w-3 mr-1" />
        Trial Expirado
      </Badge>
    );
  }

  // No subscription yet - show a neutral badge
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <Gift className="h-3 w-3 mr-1" />
      Sem assinatura
    </Badge>
  );
}
