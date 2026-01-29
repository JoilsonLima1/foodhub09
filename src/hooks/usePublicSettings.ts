import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicBranding {
  logo_url: string | null;
  icon_url: string | null;
  company_name: string;
}

export interface PublicColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface PublicTrialPeriod {
  days: number;
  highlight_text: string;
  end_date: string | null;
}

export type PublicAnnouncementBannerStyle = 'gradient' | 'elegant' | 'minimal';

export type PublicHeroTitleHighlightStyle = 
  | 'none' | 'underline' | 'rounded' | 'pill' | 'thought' | 'bubble' 
  | 'marker' | 'glow' | 'gradient' | 'box' | 'circle' | 'scratch';

export interface PublicHeroTitlePart {
  text: string;
  color: string;
  highlight_style: PublicHeroTitleHighlightStyle;
}

export interface PublicAnnouncementBanner {
  is_visible: boolean;
  text: string;
  highlight_text: string;
  style: PublicAnnouncementBannerStyle;
}

export interface PublicLandingLayout {
  hero_badge: string;
  hero_title_part1: string;
  hero_title_part2: string;
  hero_title_part3: string;
  hero_title_part4: string;
  hero_subtitle: string;
  hero_description: string;
  trust_badge_1: string;
  trust_badge_2: string;
  trust_badge_3: string;
  social_proof_text: string;
  show_testimonials: boolean;
  show_features: boolean;
  announcement_banner?: PublicAnnouncementBanner;
  // Legacy fields for backwards compatibility
  hero_title?: string;
  hero_title_highlight?: string;
  // New 3-part title system with individual colors
  hero_title_parts?: {
    top: PublicHeroTitlePart;
    middle: PublicHeroTitlePart;
    bottom: PublicHeroTitlePart;
  };
}

interface PublicSettings {
  branding?: PublicBranding;
  colors?: PublicColors;
  trial_period?: PublicTrialPeriod;
  landing_layout?: PublicLandingLayout;
}

// Fallback values when DB settings are not loaded
const DEFAULT_BRANDING: PublicBranding = {
  logo_url: null,
  icon_url: null,
  company_name: 'FoodHub09',
};

const DEFAULT_TRIAL: PublicTrialPeriod = {
  days: 14,
  highlight_text: '14 dias grátis',
  end_date: null,
};

const DEFAULT_LANDING: PublicLandingLayout = {
  hero_badge: 'Plataforma #1 para Gestão de Restaurantes',
  hero_title_part1: 'Transforme seu',
  hero_title_part2: 'restaurante',
  hero_title_part3: 'em uma',
  hero_title_part4: 'máquina de vendas',
  hero_subtitle: 'Unifique pedidos de múltiplas origens, gerencie entregas, controle estoque e tome decisões inteligentes com relatórios em tempo real e previsões com IA.',
  hero_description: '',
  trust_badge_1: 'Sem cartão de crédito',
  trust_badge_2: 'Cancele quando quiser',
  trust_badge_3: 'Suporte em português',
  social_proof_text: 'Mais de 500+ restaurantes já confiam no',
  show_testimonials: true,
  show_features: true,
  announcement_banner: {
    is_visible: true,
    text: 'Use TODAS as funcionalidades por',
    highlight_text: '14 DIAS GRÁTIS',
    style: 'gradient',
  },
  // hero_title_parts is intentionally undefined by default to use the legacy 4-part system
};

export function usePublicSettings() {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      // Use the public function that doesn't require auth
      const { data, error } = await supabase.rpc('get_public_settings');

      if (error) {
        console.error('Error fetching public settings:', error);
        return null;
      }

      const settingsMap: PublicSettings = {};
      
      data?.forEach((setting: { setting_key: string; setting_value: unknown }) => {
        const key = setting.setting_key;
        const value = setting.setting_value;
        
        if (key === 'branding') {
          settingsMap.branding = value as PublicBranding;
        } else if (key === 'colors') {
          settingsMap.colors = value as PublicColors;
        } else if (key === 'trial_period') {
          settingsMap.trial_period = value as PublicTrialPeriod;
        } else if (key === 'landing_layout') {
          const rawLayout = value as Record<string, unknown>;
          // Map legacy fields to new 4-part title structure
          const layout: PublicLandingLayout = {
            hero_badge: rawLayout.hero_badge as string || DEFAULT_LANDING.hero_badge,
            hero_title_part1: rawLayout.hero_title_part1 as string || rawLayout.hero_title as string || DEFAULT_LANDING.hero_title_part1,
            hero_title_part2: rawLayout.hero_title_part2 as string || rawLayout.hero_title_highlight as string || DEFAULT_LANDING.hero_title_part2,
            hero_title_part3: rawLayout.hero_title_part3 as string || DEFAULT_LANDING.hero_title_part3,
            hero_title_part4: rawLayout.hero_title_part4 as string || DEFAULT_LANDING.hero_title_part4,
            hero_subtitle: rawLayout.hero_subtitle as string || DEFAULT_LANDING.hero_subtitle,
            hero_description: rawLayout.hero_description as string || DEFAULT_LANDING.hero_description,
            trust_badge_1: rawLayout.trust_badge_1 as string || DEFAULT_LANDING.trust_badge_1,
            trust_badge_2: rawLayout.trust_badge_2 as string || DEFAULT_LANDING.trust_badge_2,
            trust_badge_3: rawLayout.trust_badge_3 as string || DEFAULT_LANDING.trust_badge_3,
            social_proof_text: rawLayout.social_proof_text as string || DEFAULT_LANDING.social_proof_text,
            show_testimonials: rawLayout.show_testimonials as boolean ?? DEFAULT_LANDING.show_testimonials,
            show_features: rawLayout.show_features as boolean ?? DEFAULT_LANDING.show_features,
            // Use database banner settings if available, otherwise use defaults
            // Ensure is_visible from database is respected (don't override with default)
            announcement_banner: rawLayout.announcement_banner 
              ? {
                  is_visible: (rawLayout.announcement_banner as PublicAnnouncementBanner).is_visible,
                  text: (rawLayout.announcement_banner as PublicAnnouncementBanner).text || DEFAULT_LANDING.announcement_banner!.text,
                  highlight_text: (rawLayout.announcement_banner as PublicAnnouncementBanner).highlight_text || DEFAULT_LANDING.announcement_banner!.highlight_text,
                  // Validate style - only use valid styles, fallback to gradient
                  style: ['gradient', 'elegant', 'minimal'].includes((rawLayout.announcement_banner as PublicAnnouncementBanner).style) 
                    ? (rawLayout.announcement_banner as PublicAnnouncementBanner).style 
                    : 'gradient',
                }
              : DEFAULT_LANDING.announcement_banner,
            // Force legacy 4-part hero title on the public Landing page.
            // Even if older data stored hero_title_parts, we ignore it to keep the 4-field + 2-color alternating layout.
            hero_title_parts: undefined,
          };
          settingsMap.landing_layout = layout;
        }
      });

      return settingsMap;
    },
    staleTime: 1000 * 30, // Cache for 30 seconds to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to the page
  });

  return {
    branding: settings?.branding ?? DEFAULT_BRANDING,
    colors: settings?.colors,
    trialPeriod: settings?.trial_period ?? DEFAULT_TRIAL,
    landingLayout: settings?.landing_layout ?? DEFAULT_LANDING,
    isLoading,
    error,
  };
}
