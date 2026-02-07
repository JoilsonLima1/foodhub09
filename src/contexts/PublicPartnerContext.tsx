/**
 * PublicPartnerContext - Provides partner context for public pages
 * 
 * This context resolves the partner from the current domain and provides
 * branding/marketing data to public-facing pages (landing, signup, login).
 */

import React, { createContext, useContext, useEffect } from 'react';
import { usePartnerResolution, ResolvedPartner } from '@/hooks/usePartnerResolution';

interface PublicPartnerContextType {
  isPartnerDomain: boolean;
  isMarketingDomain: boolean;
  isAppDomain: boolean;
  isPublished: boolean;
  isSuspended: boolean;
  partner: ResolvedPartner | null;
  isLoading: boolean;
}

const PublicPartnerContext = createContext<PublicPartnerContextType | undefined>(undefined);

export function PublicPartnerProvider({ children }: { children: React.ReactNode }) {
  const resolution = usePartnerResolution();

  // Apply partner branding colors to CSS variables when resolved
  useEffect(() => {
    if (!resolution.partner?.branding) return;

    const { branding } = resolution.partner;
    const root = document.documentElement;

    // Apply partner colors if available (HSL format expected)
    if (branding.primary_color) {
      root.style.setProperty('--primary', branding.primary_color);
    }
    if (branding.secondary_color) {
      root.style.setProperty('--secondary', branding.secondary_color);
    }
    if (branding.accent_color) {
      root.style.setProperty('--accent', branding.accent_color);
    }

    // Apply favicon if available
    if (branding.favicon_url) {
      const existingFavicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (existingFavicon) {
        existingFavicon.href = branding.favicon_url;
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = branding.favicon_url;
        document.head.appendChild(link);
      }
    }

    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--accent');
    };
  }, [resolution.partner?.branding]);

  return (
    <PublicPartnerContext.Provider
      value={{
        isPartnerDomain: resolution.isPartnerDomain,
        isMarketingDomain: resolution.isMarketingDomain,
        isAppDomain: resolution.isAppDomain,
        isPublished: resolution.isPublished,
        isSuspended: resolution.isSuspended,
        partner: resolution.partner,
        isLoading: resolution.isLoading,
      }}
    >
      {children}
    </PublicPartnerContext.Provider>
  );
}

export function usePublicPartner() {
  const context = useContext(PublicPartnerContext);
  if (context === undefined) {
    throw new Error('usePublicPartner must be used within a PublicPartnerProvider');
  }
  return context;
}
