import { useState, useEffect, useCallback } from 'react';
import { useServiceWorker } from './useServiceWorker';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { registration, showNotification: swShowNotification } = useServiceWorker();

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
    async (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') {
        console.warn('Permissão de notificação não concedida');
        return null;
      }

      // Tentar usar Service Worker primeiro (melhor para mobile/background)
      if (registration) {
        try {
          await swShowNotification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            ...options,
          });
          return true;
        } catch (err) {
          console.warn('Fallback para notificação direta:', err);
        }
      }

      // Fallback: notificação direta (não funciona bem em mobile/background)
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
    [isSupported, permission, registration, swShowNotification]
  );

  const notifyNewDelivery = useCallback(
    (orderNumber: number, customerName: string | null, address: string | null) => {
      return showNotification('🚚 Nova Entrega Atribuída!', {
        body: `Pedido #${orderNumber}${customerName ? ` - ${customerName}` : ''}${address ? `\n📍 ${address}` : ''}`,
        tag: `delivery-${orderNumber}`,
        data: {
          url: '/courier',
          orderId: orderNumber,
        },
      } as NotificationOptions);
    },
    [showNotification]
  );

  const notifyOrderReady = useCallback(
    (orderNumber: number) => {
      return showNotification('✅ Pedido Pronto para Coleta!', {
        body: `Pedido #${orderNumber} está pronto para ser retirado`,
        tag: `order-ready-${orderNumber}`,
        data: {
          url: '/courier',
          orderId: orderNumber,
        },
      } as NotificationOptions);
    },
    [showNotification]
  );

  const notifyGeneral = useCallback(
    (title: string, body: string, tag?: string) => {
      return showNotification(title, {
        body,
        tag: tag || `general-${Date.now()}`,
      });
    },
    [showNotification]
  );

  return {
    isSupported,
    permission,
    hasServiceWorker: !!registration,
    requestPermission,
    showNotification,
    notifyNewDelivery,
    notifyOrderReady,
    notifyGeneral,
  };
}
