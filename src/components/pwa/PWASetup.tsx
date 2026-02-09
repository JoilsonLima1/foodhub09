/**
 * PWASetup - Component that wires PWA manifest to partner context
 * 
 * Reads partner branding from PublicPartnerContext and configures
 * the dynamic manifest + meta tags accordingly.
 */

import { usePublicPartner } from '@/contexts/PublicPartnerContext';
import { usePWAManifest } from '@/hooks/usePWAManifest';

export function PWASetup() {
  const { partner, isPartnerDomain } = usePublicPartner();

  const branding = partner?.branding;

  usePWAManifest(
    isPartnerDomain && branding
      ? {
          name: branding.platform_name || partner?.partnerName || undefined,
          shortName: branding.platform_name || partner?.partnerName || undefined,
          themeColor: branding.primary_color || undefined,
          backgroundColor: '#ffffff',
          iconUrl: branding.logo_url || branding.favicon_url || undefined,
        }
      : undefined
  );

  return null;
}
