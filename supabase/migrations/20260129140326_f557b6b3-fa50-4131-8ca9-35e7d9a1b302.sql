-- Add Asaas tracking columns to tenants table for payment reconciliation
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_asaas_customer_id ON public.tenants(asaas_customer_id) WHERE asaas_customer_id IS NOT NULL;