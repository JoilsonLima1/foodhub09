import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    registration: null,
    error: null,
  });

  const register = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Workers não suportados');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Service Worker registrado:', registration.scope);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      setState({
        isSupported: true,
        isRegistered: true,
        registration,
        error: null,
      });

      return registration;
    } catch (error) {
      console.error('[SW] Erro ao registrar Service Worker:', error);
      setState((prev) => ({
        ...prev,
        isSupported: true,
        error: error as Error,
      }));
      return null;
    }
  }, []);

  const unregister = useCallback(async () => {
    if (state.registration) {
      await state.registration.unregister();
      setState({
        isSupported: true,
        isRegistered: false,
        registration: null,
        error: null,
      });
    }
  }, [state.registration]);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (!state.registration) {
        console.warn('[SW] Service Worker não registrado');
        return false;
      }

      try {
        // Send message to service worker to show notification
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            options,
          });
          return true;
        }

        // Fallback: use registration directly
        await state.registration.showNotification(title, options);
        return true;
      } catch (error) {
        console.error('[SW] Erro ao mostrar notificação:', error);
        return false;
      }
    },
    [state.registration]
  );

  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator;
    setState((prev) => ({ ...prev, isSupported }));

    if (isSupported) {
      // Check if already registered
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setState({
            isSupported: true,
            isRegistered: true,
            registration,
            error: null,
          });
        } else {
          // Auto-register
          register();
        }
      });
    }
  }, [register]);

  return {
    ...state,
    register,
    unregister,
    showNotification,
  };
}
