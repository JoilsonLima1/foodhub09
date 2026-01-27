import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, Check, Smartphone } from 'lucide-react';

export function PushNotificationBanner() {
  const { isSupported, permission, hasServiceWorker, requestPermission } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  if (permission === 'granted') {
    return (
      <Alert className="bg-success/10 border-success/20">
        <Check className="h-4 w-4 text-success" />
        <AlertDescription className="text-success flex items-center gap-2 flex-wrap">
          <span className="font-medium">Notificações ativadas</span>
          <span className="text-xs opacity-70 flex items-center gap-1">
            {hasServiceWorker && <Smartphone className="h-3 w-3" />}
            Você receberá alertas mesmo com o app em segundo plano
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  if (permission === 'denied') {
    return (
      <Alert className="bg-destructive/10 border-destructive/20">
        <BellOff className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive text-sm">
          <span className="font-medium">Notificações bloqueadas.</span>{' '}
          <span className="opacity-80">
            Ative nas configurações do navegador para receber alertas de novas entregas.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-warning/10 border-warning/20">
      <Bell className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-warning-foreground text-sm">
          Ative notificações para ser alertado sobre novas entregas
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={requestPermission}
          className="border-warning/20 hover:bg-warning/10 text-xs"
        >
          <Bell className="h-3 w-3 mr-1" />
          Ativar Alertas
        </Button>
      </AlertDescription>
    </Alert>
  );
}
