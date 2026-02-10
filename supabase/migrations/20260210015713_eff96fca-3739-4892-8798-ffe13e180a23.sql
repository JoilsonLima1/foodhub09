
ALTER TABLE public.partner_leads ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;
