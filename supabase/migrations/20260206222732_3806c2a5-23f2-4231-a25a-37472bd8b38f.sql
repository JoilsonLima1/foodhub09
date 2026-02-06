-- =====================================================
-- Auto-initialize SEO settings when domain is verified
-- =====================================================

-- Add status column to marketing_seo_settings to track initialization state
ALTER TABLE public.marketing_seo_settings 
ADD COLUMN IF NOT EXISTS seo_init_status TEXT NOT NULL DEFAULT 'pending_domain';

-- Add comment for clarity
COMMENT ON COLUMN public.marketing_seo_settings.seo_init_status IS 
'Status of SEO initialization: pending_domain, initialized, ready';

-- =====================================================
-- Function: Initialize SEO settings for a tenant
-- =====================================================
CREATE OR REPLACE FUNCTION public.initialize_tenant_seo_settings(
  p_tenant_id UUID,
  p_domain_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings_id UUID;
  v_domain_record RECORD;
  v_tenant_name TEXT;
BEGIN
  -- Get tenant name for default title
  SELECT name INTO v_tenant_name
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- Get verified domain if not provided
  IF p_domain_id IS NULL THEN
    SELECT id, domain INTO v_domain_record
    FROM public.organization_domains
    WHERE tenant_id = p_tenant_id
      AND is_verified = true
    ORDER BY is_primary DESC, created_at ASC
    LIMIT 1;
    
    p_domain_id := v_domain_record.id;
  ELSE
    SELECT id, domain INTO v_domain_record
    FROM public.organization_domains
    WHERE id = p_domain_id;
  END IF;

  -- Check if settings already exist
  SELECT id INTO v_settings_id
  FROM public.marketing_seo_settings
  WHERE tenant_id = p_tenant_id;

  IF v_settings_id IS NOT NULL THEN
    -- Update existing settings with domain and mark as ready
    UPDATE public.marketing_seo_settings
    SET 
      domain_id = COALESCE(p_domain_id, domain_id),
      default_title_suffix = COALESCE(NULLIF(default_title_suffix, ''), ' | ' || COALESCE(v_tenant_name, 'Minha Loja')),
      seo_init_status = CASE 
        WHEN p_domain_id IS NOT NULL THEN 'ready'
        ELSE 'pending_domain'
      END,
      updated_at = now()
    WHERE id = v_settings_id;
  ELSE
    -- Create new settings
    INSERT INTO public.marketing_seo_settings (
      tenant_id,
      domain_id,
      default_title_suffix,
      default_description,
      sitemap_enabled,
      robots_allow_all,
      seo_init_status
    ) VALUES (
      p_tenant_id,
      p_domain_id,
      ' | ' || COALESCE(v_tenant_name, 'Minha Loja'),
      'Bem-vindo à ' || COALESCE(v_tenant_name, 'nossa loja') || '. Confira nossos produtos e serviços.',
      true,
      true,
      CASE WHEN p_domain_id IS NOT NULL THEN 'ready' ELSE 'pending_domain' END
    )
    RETURNING id INTO v_settings_id;
  END IF;

  RETURN v_settings_id;
END;
$$;

-- =====================================================
-- Trigger: Auto-init SEO when domain is verified
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_on_domain_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run when is_verified changes from false to true
  IF NEW.is_verified = true AND (OLD.is_verified = false OR OLD.is_verified IS NULL) THEN
    -- Initialize SEO settings for this tenant with this domain
    PERFORM public.initialize_tenant_seo_settings(NEW.tenant_id, NEW.id);
    
    -- Log the auto-initialization in audit history if settings exist
    INSERT INTO public.marketing_seo_audit_history (
      tenant_id,
      settings_id,
      previous_score,
      current_score,
      audit_type,
      notes
    )
    SELECT 
      NEW.tenant_id,
      mss.id,
      mss.seo_score,
      mss.seo_score,
      'auto_init',
      'SEO inicializado automaticamente após verificação do domínio: ' || NEW.domain
    FROM public.marketing_seo_settings mss
    WHERE mss.tenant_id = NEW.tenant_id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_domain_verified_seo_init ON public.organization_domains;

-- Create trigger on organization_domains
CREATE TRIGGER trg_domain_verified_seo_init
  AFTER UPDATE ON public.organization_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_on_domain_verified();

-- =====================================================
-- Trigger: Auto-init SEO when tenant is created
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_on_tenant_created_seo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize SEO settings for new tenant (without domain initially)
  PERFORM public.initialize_tenant_seo_settings(NEW.id, NULL);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_tenant_created_seo_init ON public.tenants;

-- Create trigger on tenants table
CREATE TRIGGER trg_tenant_created_seo_init
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_on_tenant_created_seo();