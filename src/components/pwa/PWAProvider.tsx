/**
 * PWAProvider - Wires up PWA manifest + SW registration based on partner context
 * 
 * Should be placed near the root of the app tree.
 * Uses partner branding when available, falls back to platform defaults.
 */

import { useEffect } from 'react';
import { usePWAManifest } from '@/hooks/usePWAManifest';
import { useServiceWorker } from '@/hooks/useServiceWorker';

interface PWAProviderProps {
  children: React.ReactNode;
  partnerName?: string | null;
  partnerShortName?: string | null;
  partnerDescription?: string | null;
  partnerIconUrl?: string | null;
  partnerThemeColor?: string | null;
  partnerBackgroundColor?: string | null;
}

export function PWAProvider({
  children,
  partnerName,
  partnerShortName,
  partnerIconUrl,
  partnerThemeColor,
  partnerBackgroundColor,
  partnerDescription,
}: PWAProviderProps) {
  // Dynamic manifest injection
  usePWAManifest({
    name: partnerName || undefined,
    shortName: partnerShortName || partnerName || undefined,
    description: partnerDescription || undefined,
    themeColor: partnerThemeColor || undefined,
    backgroundColor: partnerBackgroundColor || undefined,
    iconUrl: partnerIconUrl,
  });

  // Service worker registration (already exists, just ensure it's called)
  const { register } = useServiceWorker();

  useEffect(() => {
    // SW auto-registers in useServiceWorker's useEffect, no extra call needed
  }, [register]);

  return <>{children}</>;
}
