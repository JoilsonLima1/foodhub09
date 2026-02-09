/**
 * useServiceWorker - Registers and manages the service worker
 * 
 * Only registers on non-localhost app domains (or localhost for dev).
 * Handles update detection and notification.
 */

import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  error: Error | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    registration: null,
    updateAvailable: false,
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

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Nova versão disponível');
              setState(prev => ({ ...prev, updateAvailable: true }));
            }
          });
        }
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      setState({
        isSupported: true,
        isRegistered: true,
        registration,
        updateAvailable: false,
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
        updateAvailable: false,
        error: null,
      });
    }
  }, [state.registration]);

  const applyUpdate = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'CHECK_UPDATE' });
      window.location.reload();
    }
  }, [state.registration]);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (!state.registration) {
        console.warn('[SW] Service Worker não registrado');
        return false;
      }

      try {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            options,
          });
          return true;
        }

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
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setState({
            isSupported: true,
            isRegistered: true,
            registration,
            updateAvailable: false,
            error: null,
          });
        } else {
          register();
        }
      });
    }
  }, [register]);

  return {
    ...state,
    register,
    unregister,
    applyUpdate,
    showNotification,
  };
}
