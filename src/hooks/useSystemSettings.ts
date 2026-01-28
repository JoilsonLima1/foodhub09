import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface BrandingSettings {
  logo_url: string | null;
  icon_url: string | null;
  company_name: string;
}

export interface ColorSettings {
  primary: string;
  secondary: string;
  accent: string;
}

export interface WhatsAppSettings {
  number: string | null;
  message: string;
}

export interface TrialSettings {
  days: number;
  highlight_text: string;
  end_date: string | null;
}

export interface LandingLayoutSettings {
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

export interface AnalyticsSettings {
  google_analytics_id: string | null;
  facebook_pixel_id: string | null;
}

export interface TrialNotificationSettings {
  days_before_expiration: number;
  show_frequency_hours: number;
  banner_image_url: string | null;
  banner_type: 'info' | 'warning' | 'critical';
  show_expiration_datetime: boolean;
}

type SettingKey = 'branding' | 'colors' | 'whatsapp' | 'trial_period' | 'landing_layout' | 'analytics' | 'trial_notifications';

type SettingsMap = {
  branding?: BrandingSettings;
  colors?: ColorSettings;
  whatsapp?: WhatsAppSettings;
  trial_period?: TrialSettings;
  landing_layout?: LandingLayoutSettings;
  analytics?: AnalyticsSettings;
  trial_notifications?: TrialNotificationSettings;
};

interface UpdateSettingParams {
  key: SettingKey;
  value: BrandingSettings | ColorSettings | WhatsAppSettings | TrialSettings | LandingLayoutSettings | AnalyticsSettings | TrialNotificationSettings;
}

export function useSystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;

      // Convert array to object keyed by setting_key with explicit typing
      const settingsMap: SettingsMap = {};
      data?.forEach(setting => {
        const key = setting.setting_key;
        const value = setting.setting_value;
        
        if (key === 'branding') {
          settingsMap.branding = value as unknown as BrandingSettings;
        } else if (key === 'colors') {
          settingsMap.colors = value as unknown as ColorSettings;
        } else if (key === 'whatsapp') {
          settingsMap.whatsapp = value as unknown as WhatsAppSettings;
        } else if (key === 'trial_period') {
          settingsMap.trial_period = value as unknown as TrialSettings;
        } else if (key === 'landing_layout') {
          settingsMap.landing_layout = value as unknown as LandingLayoutSettings;
        } else if (key === 'analytics') {
          settingsMap.analytics = value as unknown as AnalyticsSettings;
        } else if (key === 'trial_notifications') {
          settingsMap.trial_notifications = value as unknown as TrialNotificationSettings;
        }
      });

      return settingsMap;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: UpdateSettingParams) => {
      const { data, error } = await supabase
        .from('system_settings')
        .update({ setting_value: value as unknown as Json })
        .eq('setting_key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: 'Configuração salva',
        description: 'As alterações foram aplicadas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    branding: settings?.branding,
    colors: settings?.colors,
    whatsapp: settings?.whatsapp,
    trialPeriod: settings?.trial_period,
    landingLayout: settings?.landing_layout,
    analytics: settings?.analytics,
    trialNotifications: settings?.trial_notifications,
  };
}
