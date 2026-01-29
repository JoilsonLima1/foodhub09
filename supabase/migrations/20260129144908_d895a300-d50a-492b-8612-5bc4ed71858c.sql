-- Add payment tracking columns to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_method TEXT,
ADD COLUMN IF NOT EXISTS last_payment_provider TEXT,
ADD COLUMN IF NOT EXISTS last_payment_status TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN public.tenants.last_payment_at IS 'Timestamp of the last confirmed payment';
COMMENT ON COLUMN public.tenants.last_payment_method IS 'Payment method used (pix, credit_card, boleto)';
COMMENT ON COLUMN public.tenants.last_payment_provider IS 'Payment gateway provider (asaas, stripe, etc)';
COMMENT ON COLUMN public.tenants.last_payment_status IS 'Status of the last payment (confirmed, pending, etc)';