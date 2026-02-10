
-- Fix status constraint to allow 'pending'
ALTER TABLE public.payment_provider_accounts DROP CONSTRAINT payment_provider_accounts_status_check;
ALTER TABLE public.payment_provider_accounts ADD CONSTRAINT payment_provider_accounts_status_check
  CHECK (status = ANY (ARRAY['active','inactive','error','pending']));

-- Fix integration_type constraint to allow 'online' for Stripe/Asaas
ALTER TABLE public.payment_provider_accounts DROP CONSTRAINT payment_provider_accounts_integration_type_check;
ALTER TABLE public.payment_provider_accounts ADD CONSTRAINT payment_provider_accounts_integration_type_check
  CHECK (integration_type = ANY (ARRAY['online','stone_online','stone_connect','stone_tef','stone_openbank']));

-- Create payment_provider_account_profile table for verified account data (item C)
CREATE TABLE IF NOT EXISTS public.payment_provider_account_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_account_id UUID NOT NULL REFERENCES public.payment_provider_accounts(id) ON DELETE CASCADE,
  legal_name TEXT,
  document TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  wallet_id TEXT,
  merchant_id TEXT,
  raw_profile_json JSONB DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_profile_per_account UNIQUE (provider_account_id)
);

ALTER TABLE public.payment_provider_account_profile ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write profiles (scope isolation handled by app logic via provider_account_id)
CREATE POLICY "Authenticated users can manage provider profiles"
  ON public.payment_provider_account_profile
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_provider_account_profile_updated_at
  BEFORE UPDATE ON public.payment_provider_account_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
