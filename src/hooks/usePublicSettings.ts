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

export interface PublicLandingLayout {
  hero_badge: string;
  hero_title: string;
  hero_title_highlight: string;
  hero_subtitle: string;
  hero_description: string;
  trust_badge_1: string;
  trust_badge_2: string;
  trust_badge_3: string;
  social_proof_text: string;
  show_testimonials: boolean;
  show_features: boolean;
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
  hero_title: 'Transforme seu restaurante em uma',
  hero_title_highlight: 'máquina de vendas',
  hero_subtitle: 'Unifique pedidos de múltiplas origens, gerencie entregas, controle estoque e tome decisões inteligentes com relatórios em tempo real e previsões com IA.',
  hero_description: '',
  trust_badge_1: 'Sem cartão de crédito',
  trust_badge_2: 'Cancele quando quiser',
  trust_badge_3: 'Suporte em português',
  social_proof_text: 'Mais de 500+ restaurantes já confiam no',
  show_testimonials: true,
  show_features: true,
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
          settingsMap.landing_layout = value as PublicLandingLayout;
        }
      });

      return settingsMap;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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
