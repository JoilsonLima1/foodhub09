
-- Add verified_level and missing_fields to payment_provider_account_profile
ALTER TABLE public.payment_provider_account_profile
ADD COLUMN IF NOT EXISTS verified_level text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS missing_fields text[] DEFAULT '{}';

COMMENT ON COLUMN public.payment_provider_account_profile.verified_level IS 'full | partial | pending';
COMMENT ON COLUMN public.payment_provider_account_profile.missing_fields IS 'Array of field names not available from provider API';
