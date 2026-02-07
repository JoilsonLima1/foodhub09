/**
 * usePartnerResolution - Resolves partner context from current domain
 * 
 * This is the SSOT for determining if the current request is from a partner domain
 * and what mode (app or marketing) should be active.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerBrandingResolved {
  id: string;
  partner_id: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  platform_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  powered_by_enabled: boolean;
  powered_by_text: string | null;
  footer_text: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
}

export interface PartnerMarketingPage {
  id: string;
  partner_id: string;
  hero_badge: string | null;
  hero_title: string;
  hero_subtitle: string | null;
  hero_cta_text: string | null;
  hero_cta_url: string | null;
  hero_image_url: string | null;
  benefits_title: string | null;
  benefits: any[];
  features_title: string | null;
  features: any[];
  faq_title: string | null;
  faq_items: any[];
  cta_title: string | null;
  cta_subtitle: string | null;
  cta_button_text: string | null;
  social_proof_text: string | null;
  testimonials: any[];
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  schema_org: any | null;
  show_modules_section: boolean;
  show_pricing_section: boolean;
  show_faq_section: boolean;
  show_testimonials_section: boolean;
}

export interface ResolvedPartner {
  partnerId: string;
  partnerName: string;
  partnerSlug: string;
  domainType: 'app' | 'marketing';
  branding: PartnerBrandingResolved | null;
  marketingPage: PartnerMarketingPage | null;
}

interface PartnerResolutionResult {
  isPartnerDomain: boolean;
  isMarketingDomain: boolean;
  isAppDomain: boolean;
  partner: ResolvedPartner | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Get the current hostname, stripping port if present
 */
function getCurrentHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname;
}

/**
 * Check if this is a known platform domain (not a partner domain)
 */
function isPlatformDomain(hostname: string): boolean {
  const platformDomains = [
    'localhost',
    '127.0.0.1',
    'foodhub09.com.br',
    'www.foodhub09.com.br',
    'start-a-new-quest.lovable.app',
  ];
  
  // Also check for lovable preview domains
  if (hostname.includes('.lovable.app') || hostname.includes('.lovableproject.com')) {
    return true;
  }
  
  return platformDomains.includes(hostname);
}

export function usePartnerResolution(): PartnerResolutionResult {
  const hostname = getCurrentHostname();
  const shouldQuery = !isPlatformDomain(hostname) && hostname !== '';
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-resolution', hostname],
    queryFn: async () => {
      if (!shouldQuery) return null;
      
      const { data, error } = await supabase
        .rpc('get_partner_by_domain', { p_domain: hostname });
      
      if (error) {
        console.error('[PartnerResolution] RPC error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      const result = data[0];
      return {
        partnerId: result.partner_id,
        partnerName: result.partner_name,
        partnerSlug: result.partner_slug,
        domainType: result.domain_type as 'app' | 'marketing',
        branding: result.branding as unknown as PartnerBrandingResolved | null,
        marketingPage: result.marketing_page as unknown as PartnerMarketingPage | null,
      } as ResolvedPartner;
    },
    enabled: shouldQuery,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const isPartnerDomain = !!data;
  const domainType = data?.domainType || null;

  return {
    isPartnerDomain,
    isMarketingDomain: isPartnerDomain && domainType === 'marketing',
    isAppDomain: isPartnerDomain && domainType === 'app',
    partner: data || null,
    isLoading: shouldQuery ? isLoading : false,
    error: error as Error | null,
  };
}

/**
 * Hook to get partner plans for public display
 */
export function usePublicPartnerPlans(partnerId: string | null) {
  return useQuery({
    queryKey: ['public-partner-plans', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      
      const { data, error } = await supabase
        .rpc('get_public_partner_plans', { p_partner_id: partnerId });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });
}
