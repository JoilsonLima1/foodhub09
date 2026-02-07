-- Add enabled flag to tenant_fee_overrides to allow disabling monetization per tenant
ALTER TABLE public.tenant_fee_overrides 
ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN public.tenant_fee_overrides.enabled IS 'When false, platform fees are completely disabled for this tenant (special deal)';