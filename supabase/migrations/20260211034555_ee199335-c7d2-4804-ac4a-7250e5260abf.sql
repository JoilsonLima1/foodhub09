
-- Add webhook_secret to tenant_psp_accounts for Woovi webhook validation
ALTER TABLE public.tenant_psp_accounts
ADD COLUMN IF NOT EXISTS webhook_secret_encrypted text,
ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz,
ADD COLUMN IF NOT EXISTS last_webhook_status text,
ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS connection_tested_at timestamptz,
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'tenant';

-- Add use_platform_credentials flag to tenant_psp_accounts
ALTER TABLE public.tenant_psp_accounts
ADD COLUMN IF NOT EXISTS use_platform_credentials boolean NOT NULL DEFAULT true;

-- Create platform-level PIX credentials table (for global/partner scope)
CREATE TABLE IF NOT EXISTS public.pix_platform_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  psp_provider_id uuid NOT NULL REFERENCES public.pix_psp_providers(id),
  scope text NOT NULL DEFAULT 'platform',
  scope_id uuid,
  api_key_encrypted text NOT NULL,
  webhook_secret_encrypted text,
  environment text NOT NULL DEFAULT 'production',
  is_active boolean NOT NULL DEFAULT true,
  connection_status text NOT NULL DEFAULT 'pending',
  connection_tested_at timestamptz,
  last_webhook_at timestamptz,
  last_webhook_status text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(psp_provider_id, scope, scope_id)
);

ALTER TABLE public.pix_platform_credentials ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage platform credentials
CREATE POLICY "Super admins manage pix platform credentials"
ON public.pix_platform_credentials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Create function to resolve Woovi credentials (tenant > partner > platform)
CREATE OR REPLACE FUNCTION public.resolve_pix_credentials(p_tenant_id uuid, p_psp_provider_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_account record;
  v_partner_id uuid;
  v_partner_cred record;
  v_platform_cred record;
BEGIN
  -- 1) Check tenant-level credentials
  SELECT * INTO v_tenant_account
  FROM tenant_psp_accounts
  WHERE tenant_id = p_tenant_id
    AND psp_provider_id = p_psp_provider_id
    AND is_enabled = true;

  IF v_tenant_account IS NOT NULL AND v_tenant_account.use_platform_credentials = false AND v_tenant_account.api_key_encrypted IS NOT NULL THEN
    RETURN jsonb_build_object(
      'source', 'tenant',
      'api_key', v_tenant_account.api_key_encrypted,
      'webhook_secret', v_tenant_account.webhook_secret_encrypted,
      'connection_status', v_tenant_account.connection_status
    );
  END IF;

  -- 2) Check partner-level credentials
  SELECT t.partner_id INTO v_partner_id
  FROM tenants t
  WHERE t.id = p_tenant_id;

  IF v_partner_id IS NOT NULL THEN
    SELECT * INTO v_partner_cred
    FROM pix_platform_credentials
    WHERE psp_provider_id = p_psp_provider_id
      AND scope = 'partner'
      AND scope_id = v_partner_id
      AND is_active = true;

    IF v_partner_cred IS NOT NULL THEN
      RETURN jsonb_build_object(
        'source', 'partner',
        'api_key', v_partner_cred.api_key_encrypted,
        'webhook_secret', v_partner_cred.webhook_secret_encrypted,
        'connection_status', v_partner_cred.connection_status
      );
    END IF;
  END IF;

  -- 3) Check platform-level credentials
  SELECT * INTO v_platform_cred
  FROM pix_platform_credentials
  WHERE psp_provider_id = p_psp_provider_id
    AND scope = 'platform'
    AND scope_id IS NULL
    AND is_active = true;

  IF v_platform_cred IS NOT NULL THEN
    RETURN jsonb_build_object(
      'source', 'platform',
      'api_key', v_platform_cred.api_key_encrypted,
      'webhook_secret', v_platform_cred.webhook_secret_encrypted,
      'connection_status', v_platform_cred.connection_status
    );
  END IF;

  RETURN jsonb_build_object('source', 'none', 'api_key', null, 'webhook_secret', null, 'connection_status', 'not_configured');
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_pix_platform_credentials_updated_at
BEFORE UPDATE ON public.pix_platform_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add PSP reference columns to pix_transactions
ALTER TABLE public.pix_transactions
ADD COLUMN IF NOT EXISTS psp_charge_id text,
ADD COLUMN IF NOT EXISTS psp_correlation_id text;
