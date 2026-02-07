-- Add max fee limits to partner_policies table
ALTER TABLE public.partner_policies 
ADD COLUMN IF NOT EXISTS max_platform_fee_percent DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS max_platform_fee_fixed DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS max_pix_fee_percent DECIMAL(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS max_credit_fee_percent DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS max_debit_fee_percent DECIMAL(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS max_boleto_fee_fixed DECIMAL(10,2) DEFAULT 10.00;