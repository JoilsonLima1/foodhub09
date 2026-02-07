-- =============================================
-- FASE 1: TABELAS BASE DE PARCEIROS
-- =============================================

-- Tabela principal de parceiros
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  document TEXT, -- CNPJ
  is_active BOOLEAN DEFAULT true,
  
  -- Limites e quotas
  max_tenants INTEGER DEFAULT 10,
  max_users_per_tenant INTEGER DEFAULT 5,
  
  -- Comissões
  revenue_share_percent NUMERIC(5,2) DEFAULT 0, -- % que o parceiro recebe
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Branding do parceiro (cores, logos, textos)
CREATE TABLE public.partner_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Visual
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '220 70% 50%', -- HSL
  secondary_color TEXT,
  accent_color TEXT,
  
  -- Textos
  platform_name TEXT, -- Nome exibido no lugar de "Lovable"
  support_email TEXT,
  support_phone TEXT,
  terms_url TEXT,
  privacy_url TEXT,
  
  -- Landing page customizada
  hero_title TEXT,
  hero_subtitle TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Domínios do parceiro
CREATE TABLE public.partner_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  ssl_status TEXT DEFAULT 'pending', -- pending, active, failed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Planos personalizados do parceiro
CREATE TABLE public.partner_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  base_plan_id UUID REFERENCES public.subscription_plans(id),
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  -- Limites customizados (sobrescrevem o plano base)
  max_users INTEGER,
  max_products INTEGER,
  max_orders_per_month INTEGER,
  
  -- Módulos inclusos
  included_modules TEXT[] DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(partner_id, slug)
);

-- Vínculo parceiro <-> tenant
CREATE TABLE public.partner_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  partner_plan_id UUID REFERENCES public.partner_plans(id),
  
  status TEXT DEFAULT 'active', -- active, suspended, cancelled
  joined_at TIMESTAMPTZ DEFAULT now(),
  
  -- Billing
  next_billing_date DATE,
  billing_notes TEXT,
  
  UNIQUE(partner_id, tenant_id)
);

-- Taxas customizadas do parceiro
CREATE TABLE public.partner_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Taxas que o parceiro cobra dos seus lojistas
  platform_fee_percent NUMERIC(5,2) DEFAULT 0,
  platform_fee_fixed NUMERIC(10,2) DEFAULT 0,
  
  -- Taxas por método de pagamento
  pix_fee_percent NUMERIC(5,2),
  credit_fee_percent NUMERIC(5,2),
  debit_fee_percent NUMERIC(5,2),
  boleto_fee_fixed NUMERIC(10,2),
  
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usuários admin do parceiro
CREATE TABLE public.partner_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'admin', -- admin, manager, support
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(partner_id, user_id)
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_partner_domains_domain ON public.partner_domains(domain);
CREATE INDEX idx_partner_tenants_tenant ON public.partner_tenants(tenant_id);
CREATE INDEX idx_partner_tenants_partner ON public.partner_tenants(partner_id);
CREATE INDEX idx_partner_users_user ON public.partner_users(user_id);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;

-- Super admin pode tudo
CREATE POLICY "Super admin full access partners"
  ON public.partners FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access partner_branding"
  ON public.partner_branding FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access partner_domains"
  ON public.partner_domains FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access partner_plans"
  ON public.partner_plans FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access partner_tenants"
  ON public.partner_tenants FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access partner_fee_config"
  ON public.partner_fee_config FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access partner_users"
  ON public.partner_users FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Parceiros podem ver/editar seus próprios dados
CREATE POLICY "Partner users can view own partner"
  ON public.partners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partners.id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
    )
  );

CREATE POLICY "Partner users can update own partner"
  ON public.partners FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partners.id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
      AND pu.role = 'admin'
    )
  );

CREATE POLICY "Partner users can manage own branding"
  ON public.partner_branding FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partner_branding.partner_id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
    )
  );

CREATE POLICY "Partner users can manage own domains"
  ON public.partner_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partner_domains.partner_id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
    )
  );

CREATE POLICY "Partner users can manage own plans"
  ON public.partner_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partner_plans.partner_id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
    )
  );

CREATE POLICY "Partner users can view own tenants"
  ON public.partner_tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partner_tenants.partner_id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
    )
  );

CREATE POLICY "Partner admins can manage own tenants"
  ON public.partner_tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partner_tenants.partner_id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
      AND pu.role = 'admin'
    )
  );

CREATE POLICY "Partner users can manage own fees"
  ON public.partner_fee_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partner_fee_config.partner_id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
      AND pu.role = 'admin'
    )
  );

CREATE POLICY "Partner admins can manage partner users"
  ON public.partner_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_users pu
      WHERE pu.partner_id = partner_users.partner_id
      AND pu.user_id = auth.uid()
      AND pu.is_active = true
      AND pu.role = 'admin'
    )
  );

-- Leitura pública de branding para aplicação do tema
CREATE POLICY "Public can read partner branding by domain"
  ON public.partner_branding FOR SELECT
  USING (true);

CREATE POLICY "Public can read partner domains"
  ON public.partner_domains FOR SELECT
  USING (true);

-- =============================================
-- FUNÇÃO PARA DETECTAR PARCEIRO POR DOMÍNIO
-- =============================================
CREATE OR REPLACE FUNCTION public.get_partner_by_domain(p_domain TEXT)
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  partner_slug TEXT,
  branding JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as partner_id,
    p.name as partner_name,
    p.slug as partner_slug,
    jsonb_build_object(
      'logo_url', pb.logo_url,
      'favicon_url', pb.favicon_url,
      'primary_color', pb.primary_color,
      'secondary_color', pb.secondary_color,
      'accent_color', pb.accent_color,
      'platform_name', pb.platform_name,
      'support_email', pb.support_email,
      'support_phone', pb.support_phone,
      'terms_url', pb.terms_url,
      'privacy_url', pb.privacy_url,
      'hero_title', pb.hero_title,
      'hero_subtitle', pb.hero_subtitle
    ) as branding
  FROM public.partner_domains pd
  JOIN public.partners p ON p.id = pd.partner_id
  LEFT JOIN public.partner_branding pb ON pb.partner_id = p.id
  WHERE pd.domain = p_domain
    AND pd.is_verified = true
    AND p.is_active = true
  LIMIT 1;
END;
$$;

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_branding_updated_at
  BEFORE UPDATE ON public.partner_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_plans_updated_at
  BEFORE UPDATE ON public.partner_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_fee_config_updated_at
  BEFORE UPDATE ON public.partner_fee_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();