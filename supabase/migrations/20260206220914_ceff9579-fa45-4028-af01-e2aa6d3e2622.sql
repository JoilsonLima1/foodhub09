-- Marketing SEO Settings per tenant/domain
CREATE TABLE public.marketing_seo_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES public.organization_domains(id) ON DELETE SET NULL,
    
    -- Meta defaults
    default_title_suffix TEXT DEFAULT '',
    default_description TEXT,
    default_keywords TEXT[],
    
    -- Schema.org settings
    schema_org_type TEXT DEFAULT 'LocalBusiness' CHECK (schema_org_type IN ('Organization', 'LocalBusiness', 'Restaurant', 'Store')),
    schema_org_data JSONB DEFAULT '{}',
    
    -- Sitemap settings
    sitemap_enabled BOOLEAN DEFAULT true,
    sitemap_change_freq TEXT DEFAULT 'weekly' CHECK (sitemap_change_freq IN ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')),
    sitemap_priority NUMERIC(2,1) DEFAULT 0.8,
    
    -- Robots.txt settings
    robots_txt_custom TEXT,
    robots_allow_all BOOLEAN DEFAULT true,
    
    -- Search console tracking (manual input by user)
    google_search_console_verified BOOLEAN DEFAULT false,
    google_search_console_verified_at TIMESTAMPTZ,
    bing_webmaster_verified BOOLEAN DEFAULT false,
    bing_webmaster_verified_at TIMESTAMPTZ,
    
    -- SEO Score
    seo_score INTEGER DEFAULT 0 CHECK (seo_score >= 0 AND seo_score <= 100),
    last_audit_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(tenant_id, domain_id)
);

-- Marketing SEO Pages for on-page optimization
CREATE TABLE public.marketing_seo_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    settings_id UUID REFERENCES public.marketing_seo_settings(id) ON DELETE CASCADE,
    
    -- Page info
    page_path TEXT NOT NULL,
    page_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    og_title TEXT,
    og_description TEXT,
    og_image_url TEXT,
    canonical_url TEXT,
    
    -- Analysis results
    title_score INTEGER DEFAULT 0,
    description_score INTEGER DEFAULT 0,
    content_score INTEGER DEFAULT 0,
    overall_score INTEGER DEFAULT 0,
    issues JSONB DEFAULT '[]',
    suggestions JSONB DEFAULT '[]',
    
    -- Status
    is_indexed BOOLEAN,
    last_crawled_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(tenant_id, page_path)
);

-- Marketing SEO Audit Reports
CREATE TABLE public.marketing_seo_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    settings_id UUID REFERENCES public.marketing_seo_settings(id) ON DELETE CASCADE,
    
    -- Report data
    report_type TEXT NOT NULL CHECK (report_type IN ('full_audit', 'page_audit', 'sitemap_check', 'indexation_check')),
    overall_score INTEGER DEFAULT 0,
    
    -- Breakdown
    technical_score INTEGER DEFAULT 0,
    content_score INTEGER DEFAULT 0,
    meta_score INTEGER DEFAULT 0,
    
    -- Issues found
    critical_issues INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    recommendations INTEGER DEFAULT 0,
    
    -- Details
    issues JSONB DEFAULT '[]',
    recommendations_list JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.marketing_seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_seo_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_seo_settings
CREATE POLICY "Super admins can manage all marketing settings"
ON public.marketing_seo_settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can manage own marketing settings"
ON public.marketing_seo_settings
FOR ALL TO authenticated
USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- RLS Policies for marketing_seo_pages
CREATE POLICY "Super admins can manage all seo pages"
ON public.marketing_seo_pages
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can manage own seo pages"
ON public.marketing_seo_pages
FOR ALL TO authenticated
USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- RLS Policies for marketing_seo_reports
CREATE POLICY "Super admins can view all seo reports"
ON public.marketing_seo_reports
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view own seo reports"
ON public.marketing_seo_reports
FOR SELECT TO authenticated
USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "System can insert seo reports"
ON public.marketing_seo_reports
FOR INSERT TO authenticated
WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
);

-- Indexes for performance
CREATE INDEX idx_marketing_seo_settings_tenant ON public.marketing_seo_settings(tenant_id);
CREATE INDEX idx_marketing_seo_settings_domain ON public.marketing_seo_settings(domain_id);
CREATE INDEX idx_marketing_seo_pages_tenant ON public.marketing_seo_pages(tenant_id);
CREATE INDEX idx_marketing_seo_pages_settings ON public.marketing_seo_pages(settings_id);
CREATE INDEX idx_marketing_seo_reports_tenant ON public.marketing_seo_reports(tenant_id);

-- Triggers for updated_at
CREATE TRIGGER update_marketing_seo_settings_updated_at
    BEFORE UPDATE ON public.marketing_seo_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_seo_pages_updated_at
    BEFORE UPDATE ON public.marketing_seo_pages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();