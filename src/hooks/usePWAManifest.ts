/**
 * usePWAManifest - Dynamically injects a web app manifest
 * 
 * Strategy:
 * 1. Primary: points <link rel="manifest"> to the pwa-manifest edge function
 *    with ?domain= for partner resolution (real HTTP endpoint, proper Content-Type)
 * 2. Fallback: generates a blob URL manifest client-side if edge function unavailable
 * 
 * Also injects PWA-related meta tags (theme-color, apple-mobile-web-app-*).
 */

import { useEffect } from 'react';

interface ManifestConfig {
  name: string;
  shortName: string;
  description?: string;
  themeColor: string;
  backgroundColor: string;
  iconUrl?: string | null;
  startUrl?: string;
  scope?: string;
}

const DEFAULT_MANIFEST: ManifestConfig = {
  name: 'FoodHub09',
  shortName: 'FoodHub09',
  description: 'Sistema de Gestão para Restaurantes e Lanchonetes',
  themeColor: '#f97316',
  backgroundColor: '#ffffff',
  iconUrl: '/pwa-icon-192.png',
  startUrl: '/',
  scope: '/',
};

function hslToHex(hsl: string): string {
  const match = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%?\s+(\d+\.?\d*)%?/);
  if (!match) return '#f97316';
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function buildManifestJSON(config: ManifestConfig) {
  const themeHex = config.themeColor.startsWith('#')
    ? config.themeColor
    : hslToHex(config.themeColor);
  const bgHex = config.backgroundColor.startsWith('#')
    ? config.backgroundColor
    : hslToHex(config.backgroundColor);

  const iconSrc = config.iconUrl || '/pwa-icon-192.png';
  const icons = [
    { src: iconSrc, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: iconSrc, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ];

  return {
    name: config.name,
    short_name: config.shortName,
    description: config.description || config.name,
    start_url: config.startUrl || '/',
    scope: config.scope || '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: themeHex,
    background_color: bgHex,
    icons,
    categories: ['food', 'business'],
    lang: 'pt-BR',
    dir: 'ltr',
  };
}

function getEdgeFunctionManifestUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hostname = window.location.hostname;
  return `${supabaseUrl}/functions/v1/pwa-manifest?domain=${encodeURIComponent(hostname)}`;
}

export function usePWAManifest(config?: Partial<ManifestConfig>) {
  useEffect(() => {
    const merged = { ...DEFAULT_MANIFEST, ...config };

    // --- 1) Set manifest link ---
    const edgeUrl = getEdgeFunctionManifestUrl();
    let blobUrl: string | null = null;

    const setManifestLink = (href: string) => {
      const existing = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (existing) {
        existing.href = href;
      } else {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = href;
        document.head.appendChild(link);
      }
    };

    // Try edge function first; fallback to blob if it fails
    setManifestLink(edgeUrl);

    // Validate the edge function manifest is reachable (async)
    fetch(edgeUrl, { method: 'HEAD' }).catch(() => {
      // Edge function unavailable — fall back to blob URL
      const manifestJSON = buildManifestJSON(merged);
      const blob = new Blob([JSON.stringify(manifestJSON, null, 2)], {
        type: 'application/manifest+json',
      });
      blobUrl = URL.createObjectURL(blob);
      setManifestLink(blobUrl);
    });

    // --- 2) Meta tags ---
    const themeHex = merged.themeColor.startsWith('#')
      ? merged.themeColor
      : hslToHex(merged.themeColor);

    // theme-color
    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.content = themeHex;
    } else {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      themeMeta.content = themeHex;
      document.head.appendChild(themeMeta);
    }

    // apple-mobile-web-app-capable
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-capable';
      meta.content = 'yes';
      document.head.appendChild(meta);
    }

    // apple-mobile-web-app-status-bar-style
    if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-status-bar-style';
      meta.content = 'default';
      document.head.appendChild(meta);
    }

    // apple-mobile-web-app-title
    const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) {
      appleTitle.content = merged.shortName;
    }

    // apple-touch-icon (180x180)
    const iconSrc = merged.iconUrl || '/pwa-icon-192.png';
    let appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (appleIcon) {
      appleIcon.href = iconSrc;
    } else {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.setAttribute('sizes', '180x180');
      appleIcon.href = iconSrc;
      document.head.appendChild(appleIcon);
    }

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [
    config?.name,
    config?.shortName,
    config?.themeColor,
    config?.backgroundColor,
    config?.iconUrl,
  ]);
}
