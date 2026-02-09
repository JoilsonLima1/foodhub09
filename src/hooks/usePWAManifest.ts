/**
 * usePWAManifest - Dynamically injects a web app manifest based on partner branding
 * 
 * Creates and maintains a <link rel="manifest"> tag pointing to a blob URL
 * with the partner's branding (name, icons, colors) or platform defaults.
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
  iconUrl: '/favicon.ico',
  startUrl: '/',
  scope: '/',
};

function hslToHex(hsl: string): string {
  // Try to parse HSL string like "24 95% 53%" or "hsl(24, 95%, 53%)"
  const match = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%?\s+(\d+\.?\d*)%?/);
  if (!match) return '#f97316'; // fallback orange

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

  const icons = [];
  if (config.iconUrl) {
    icons.push(
      { src: config.iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: config.iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    );
  } else {
    icons.push(
      { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
    );
  }

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

export function usePWAManifest(config?: Partial<ManifestConfig>) {
  useEffect(() => {
    const merged = { ...DEFAULT_MANIFEST, ...config };
    const manifestJSON = buildManifestJSON(merged);
    const blob = new Blob([JSON.stringify(manifestJSON, null, 2)], {
      type: 'application/manifest+json',
    });
    const url = URL.createObjectURL(blob);

    // Remove existing manifest link
    const existing = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (existing) {
      existing.href = url;
    } else {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = url;
      document.head.appendChild(link);
    }

    // Update theme-color meta
    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const themeHex = merged.themeColor.startsWith('#')
      ? merged.themeColor
      : hslToHex(merged.themeColor);
    if (themeMeta) {
      themeMeta.content = themeHex;
    } else {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      themeMeta.content = themeHex;
      document.head.appendChild(themeMeta);
    }

    // Update apple-mobile-web-app meta tags
    let appleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-capable"]');
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.name = 'apple-mobile-web-app-capable';
      appleMeta.content = 'yes';
      document.head.appendChild(appleMeta);
    }

    let appleStatusBar = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusBar) {
      appleStatusBar = document.createElement('meta');
      appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
      appleStatusBar.content = 'default';
      document.head.appendChild(appleStatusBar);
    }

    let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) {
      appleTitle.content = merged.shortName;
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [
    config?.name,
    config?.shortName,
    config?.themeColor,
    config?.backgroundColor,
    config?.iconUrl,
  ]);
}
