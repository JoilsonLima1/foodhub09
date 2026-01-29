-- Add Asaas reference columns to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;

-- Add Asaas payment reference to tenant_addon_subscriptions
ALTER TABLE tenant_addon_subscriptions 
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;