/**
 * SubscriptionBlockedOverlay - Shows when subscription is expired and user is not admin
 */

import { AlertTriangle, CreditCard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionBlockedOverlayProps {
  reason: string;
  onContactAdmin?: () => void;
}

export function SubscriptionBlockedOverlay({ reason, onContactAdmin }: SubscriptionBlockedOverlayProps) {
  const { signOut } = useAuth();

  const getTitle = () => {
    switch (reason) {
      case 'trial_expired':
        return 'Período de teste expirado';
      case 'subscription_expired':
        return 'Assinatura expirada';
      case 'subscription_canceled':
        return 'Assinatura cancelada';
      case 'subscription_past_due':
        return 'Pagamento pendente';
      default:
        return 'Acesso bloqueado';
    }
  };

  const getDescription = () => {
    switch (reason) {
      case 'trial_expired':
        return 'Seu período de teste chegou ao fim. Entre em contato com o administrador da sua organização para renovar o acesso.';
      case 'subscription_expired':
        return 'A assinatura da sua organização expirou. Apenas o administrador pode renovar o acesso.';
      case 'subscription_canceled':
        return 'A assinatura foi cancelada. O administrador precisa reativar para restaurar o acesso.';
      case 'subscription_past_due':
        return 'Existe um pagamento pendente. O administrador precisa regularizar a situação.';
      default:
        return 'Você não tem acesso a esta área. Entre em contato com o administrador.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription className="text-base">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-center text-sm text-muted-foreground">
            <CreditCard className="h-5 w-5 mx-auto mb-2" />
            <p>
              Apenas administradores podem gerenciar a assinatura e renovar o acesso.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {onContactAdmin && (
              <Button onClick={onContactAdmin} className="w-full">
                Contatar Administrador
              </Button>
            )}
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
