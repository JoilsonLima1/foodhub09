-- Add idempotency columns to partner_earnings
ALTER TABLE public.partner_earnings 
ADD COLUMN IF NOT EXISTS external_payment_id TEXT,
ADD COLUMN IF NOT EXISTS settlement_mode TEXT DEFAULT 'invoice',
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
ADD COLUMN IF NOT EXISTS original_earning_id UUID REFERENCES partner_earnings(id);

-- Create unique index for idempotency (prevents duplicate webhook processing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_earnings_external_payment_unique 
ON public.partner_earnings (partner_id, tenant_id, external_payment_id) 
WHERE external_payment_id IS NOT NULL AND reversed_at IS NULL;

-- Index for finding reversals
CREATE INDEX IF NOT EXISTS idx_partner_earnings_original_id 
ON public.partner_earnings (original_earning_id) 
WHERE original_earning_id IS NOT NULL;

-- Add similar columns to platform_partner_revenue
ALTER TABLE public.platform_partner_revenue 
ADD COLUMN IF NOT EXISTS external_payment_id TEXT,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
ADD COLUMN IF NOT EXISTS original_revenue_id UUID REFERENCES platform_partner_revenue(id);