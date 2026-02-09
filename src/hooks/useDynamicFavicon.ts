import { useEffect } from 'react';
import { usePublicSettings } from '@/hooks/usePublicSettings';

function setFaviconLink(rel: string, href: string, sizes?: string) {
  const selector = sizes 
    ? `link[rel="${rel}"][sizes="${sizes}"]`
    : `link[rel="${rel}"]`;
  let link = document.querySelector<HTMLLinkElement>(selector);
  
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    if (sizes) link.setAttribute('sizes', sizes);
    document.head.appendChild(link);
  }

  link.type = 'image/png';
  link.href = href;
}

export function useDynamicFavicon() {
  const { branding } = usePublicSettings();

  useEffect(() => {
    const iconUrl = branding?.icon_url;
    
    if (!iconUrl) return;

    // Update all favicon variants
    setFaviconLink('icon', iconUrl, '32x32');
    setFaviconLink('icon', iconUrl, '16x16');
    setFaviconLink('icon', iconUrl);
    setFaviconLink('apple-touch-icon', iconUrl, '180x180');
    setFaviconLink('apple-touch-icon', iconUrl);

  }, [branding?.icon_url]);
}
