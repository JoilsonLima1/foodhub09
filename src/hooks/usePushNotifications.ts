import { useState, useEffect, useCallback } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Verificar suporte a notificações
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Notificações não são suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') {
        console.warn('Permissão de notificação não concedida');
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: true,
          ...options,
        });

        // Auto-fechar após 10 segundos
        setTimeout(() => notification.close(), 10000);

        return notification;
      } catch (err) {
        console.error('Erro ao mostrar notificação:', err);
        return null;
      }
    },
    [isSupported, permission]
  );

  const notifyNewDelivery = useCallback(
    (orderNumber: number, customerName: string | null, address: string | null) => {
      return showNotification('🚚 Nova Entrega Atribuída!', {
        body: `Pedido #${orderNumber}${customerName ? ` - ${customerName}` : ''}${address ? `\n📍 ${address}` : ''}`,
        tag: `delivery-${orderNumber}`,
      });
    },
    [showNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    notifyNewDelivery,
  };
}
