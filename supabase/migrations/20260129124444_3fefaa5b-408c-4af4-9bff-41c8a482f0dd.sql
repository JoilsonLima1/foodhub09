-- Add missing columns for subscription management
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_plan ON tenants(subscription_plan_id);

-- Comment for documentation
COMMENT ON COLUMN tenants.subscription_plan_id IS 'Reference to the current subscription plan';
COMMENT ON COLUMN tenants.subscription_current_period_start IS 'Start of current billing period';
COMMENT ON COLUMN tenants.subscription_current_period_end IS 'End of current billing period';