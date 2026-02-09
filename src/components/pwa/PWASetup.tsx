/**
 * PWASetup - Component that wires PWA manifest to partner context
 * 
 * Reads partner branding from PublicPartnerContext and configures
 * the dynamic manifest + meta tags accordingly.
 * Falls back to platform branding from system_settings when not on partner domain.
 */

import { usePublicPartner } from '@/contexts/PublicPartnerContext';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { usePWAManifest } from '@/hooks/usePWAManifest';

export function PWASetup() {
  const { partner, isPartnerDomain } = usePublicPartner();
  const { branding: platformBranding } = usePublicSettings();

  const branding = partner?.branding;

  // Partner domain: use partner branding
  // Platform domain: use system_settings branding (pwa_icon_url or logo_url)
  const pwaIconUrl = isPartnerDomain && branding
    ? branding.logo_url || branding.favicon_url || undefined
    : platformBranding.pwa_icon_url || platformBranding.logo_url || undefined;

  usePWAManifest(
    isPartnerDomain && branding
      ? {
          name: branding.platform_name || partner?.partnerName || undefined,
          shortName: branding.platform_name || partner?.partnerName || undefined,
          themeColor: branding.primary_color || undefined,
          backgroundColor: '#ffffff',
          iconUrl: pwaIconUrl,
        }
      : {
          name: platformBranding.company_name || undefined,
          shortName: platformBranding.company_name || undefined,
          iconUrl: pwaIconUrl,
        }
  );

  return null;
}
