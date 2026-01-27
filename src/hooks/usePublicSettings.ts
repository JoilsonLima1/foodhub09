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
  hero_title: string;
  hero_subtitle: string;
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
  hero_title: 'Gerencie seu restaurante com inteligência',
  hero_subtitle: 'Sistema completo de gestão para restaurantes, pizzarias e lanchonetes',
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
