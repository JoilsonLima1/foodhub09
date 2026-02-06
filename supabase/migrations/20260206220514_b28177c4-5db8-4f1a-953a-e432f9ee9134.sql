-- Create organization_domains table for custom domain management
CREATE TABLE public.organization_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    domain_type VARCHAR(20) NOT NULL DEFAULT 'custom' CHECK (domain_type IN ('subdomain', 'custom')),
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(64),
    verification_method VARCHAR(20) DEFAULT 'dns_txt' CHECK (verification_method IN ('dns_txt', 'dns_cname', 'file')),
    ssl_status VARCHAR(20) DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'issuing', 'active', 'failed')),
    dns_configured BOOLEAN DEFAULT false,
    last_checked_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(domain)
);

-- Enable RLS
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all domains
CREATE POLICY "Super admins can manage all domains"
ON public.organization_domains
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- Tenant admins can view their own domains
CREATE POLICY "Tenant admins can view own domains"
ON public.organization_domains
FOR SELECT
TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Tenant admins can insert domains for their tenant
CREATE POLICY "Tenant admins can insert own domains"
ON public.organization_domains
FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Create index for faster lookups
CREATE INDEX idx_organization_domains_tenant ON public.organization_domains(tenant_id);
CREATE INDEX idx_organization_domains_domain ON public.organization_domains(domain);

-- Create trigger for updated_at
CREATE TRIGGER update_organization_domains_updated_at
    BEFORE UPDATE ON public.organization_domains
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate verification token
CREATE OR REPLACE FUNCTION public.generate_domain_verification_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.verification_token IS NULL THEN
        NEW.verification_token := encode(gen_random_bytes(32), 'hex');
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to auto-generate verification token
CREATE TRIGGER generate_domain_verification_token_trigger
    BEFORE INSERT ON public.organization_domains
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_domain_verification_token();