-- Create system_settings table for global super admin configurations
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Super admins can manage system settings
CREATE POLICY "Super admins can manage system settings"
ON public.system_settings FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Anyone can view system settings (for landing page rendering)
CREATE POLICY "Anyone can view system settings"
ON public.system_settings FOR SELECT
USING (true);

-- Create payment_gateways table for managing payment providers
CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL,
  api_key_masked text,
  is_active boolean DEFAULT false,
  is_default boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Super admins can manage payment gateways
CREATE POLICY "Super admins can manage payment gateways"
ON public.payment_gateways FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('branding', '{"logo_url": null, "icon_url": null, "company_name": "FoodHub"}', 'Logo and branding settings'),
('colors', '{"primary": "47 97% 60%", "secondary": "217 33% 17%", "accent": "47 97% 50%"}', 'Theme colors in HSL format'),
('whatsapp', '{"number": null, "message": "Olá! Gostaria de saber mais sobre o FoodHub."}', 'WhatsApp sales contact'),
('trial_period', '{"days": 14, "highlight_text": "14 dias grátis", "end_date": null}', 'Free trial configuration'),
('landing_layout', '{"hero_title": "Gerencie seu restaurante com inteligência", "hero_subtitle": "Sistema completo de gestão para restaurantes, pizzarias e lanchonetes", "show_testimonials": true, "show_features": true}', 'Landing page layout settings'),
('analytics', '{"google_analytics_id": null, "facebook_pixel_id": null}', 'Analytics tracking IDs');

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_gateways_updated_at
BEFORE UPDATE ON public.payment_gateways
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();