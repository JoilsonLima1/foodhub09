import { useEffect } from 'react';
import { usePublicSettings } from '@/hooks/usePublicSettings';

export function useDynamicFavicon() {
  const { branding } = usePublicSettings();

  useEffect(() => {
    const iconUrl = branding?.icon_url;
    
    if (!iconUrl) return;

    // Find existing favicon link or create one
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    // Update the favicon href
    link.type = 'image/png';
    link.href = iconUrl;

    // Also update apple-touch-icon if exists
    let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = iconUrl;

  }, [branding?.icon_url]);
}
