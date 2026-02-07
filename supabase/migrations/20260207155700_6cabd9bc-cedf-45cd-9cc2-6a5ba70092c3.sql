-- Create cron_job_logs table for audit
CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  results JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add delinquency_stage column to tenant_subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_subscriptions' 
    AND column_name = 'delinquency_stage'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
    ADD COLUMN delinquency_stage TEXT DEFAULT 'none';
  END IF;
END $$;

-- Add trial_ends_at column to tenant_subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_subscriptions' 
    AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
    ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add last_payment_attempt_at column to tenant_subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_subscriptions' 
    AND column_name = 'last_payment_attempt_at'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
    ADD COLUMN last_payment_attempt_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add payment_attempts column to tenant_subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_subscriptions' 
    AND column_name = 'payment_attempts'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
    ADD COLUMN payment_attempts INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_executed_at ON public.cron_job_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_trial_ends_at ON public.tenant_subscriptions(trial_ends_at) WHERE status = 'trial';

-- Enable RLS
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Super admin can view cron logs
CREATE POLICY "Super admins can view cron logs"
  ON public.cron_job_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Comment
COMMENT ON TABLE public.cron_job_logs IS 'Audit log for scheduled cron jobs';