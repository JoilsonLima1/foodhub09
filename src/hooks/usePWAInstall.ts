/**
 * usePWAInstall - Hook for PWA install prompt management and telemetry
 * 
 * Handles:
 * - beforeinstallprompt event (Chrome/Android)
 * - iOS Safari detection with manual instructions
 * - Install telemetry logging to operational_logs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'desktop' | 'unknown';

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  platform: Platform;
  showIOSInstructions: boolean;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/Win|Mac|Linux/.test(ua) && !/Mobile/.test(ua)) return 'desktop';
  return 'unknown';
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

async function logPWAEvent(
  event: string,
  partnerId?: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('operational_logs').insert({
      level: 'info',
      scope: 'pwa',
      message: event,
      partner_id: partnerId || null,
      metadata: {
        ...metadata,
        platform: detectPlatform(),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn('[PWA] Failed to log event:', e);
  }
}

export function usePWAInstall(partnerId?: string | null) {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: isStandalone(),
    isIOS: detectPlatform() === 'ios',
    platform: detectPlatform(),
    showIOSInstructions: false,
  });

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setState(prev => ({ ...prev, isInstallable: true }));
      logPWAEvent('app_install_prompt_shown', partnerId);
    };

    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));
      logPWAEvent('app_installed', partnerId);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [partnerId]);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'dismissed') {
        logPWAEvent('app_install_dismissed', partnerId);
      }
      deferredPrompt.current = null;
      setState(prev => ({ ...prev, isInstallable: false }));
      return outcome;
    }
    return null;
  }, [partnerId]);

  const toggleIOSInstructions = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showIOSInstructions: show }));
    if (show) {
      logPWAEvent('app_install_prompt_shown', partnerId, { type: 'ios_instructions' });
    }
  }, [partnerId]);

  return {
    ...state,
    promptInstall,
    toggleIOSInstructions,
  };
}
