-- Add payment tracking columns to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_method TEXT,
ADD COLUMN IF NOT EXISTS last_payment_provider TEXT,
ADD COLUMN IF NOT EXISTS last_payment_status TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.last_payment_at IS 'Timestamp of the last successful payment';
COMMENT ON COLUMN public.tenants.last_payment_method IS 'Payment method used: pix, credit_card, boleto, etc.';
COMMENT ON COLUMN public.tenants.last_payment_provider IS 'Payment gateway provider: stripe, asaas, etc.';
COMMENT ON COLUMN public.tenants.last_payment_status IS 'Last payment status: confirmed, pending, failed';