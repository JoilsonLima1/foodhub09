
-- Add available_at to print_jobs for backoff scheduling
ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now();

-- Drop old indexes and recreate with available_at
DROP INDEX IF EXISTS idx_print_jobs_tenant_status;
DROP INDEX IF EXISTS idx_print_jobs_tenant_device_status;

CREATE INDEX idx_print_jobs_tenant_status_available ON public.print_jobs(tenant_id, status, available_at, created_at);
CREATE INDEX idx_print_jobs_tenant_device_status_available ON public.print_jobs(tenant_id, device_id, status, available_at);

-- Update claim RPC to use available_at
CREATE OR REPLACE FUNCTION public.claim_print_jobs(
  p_tenant_id uuid,
  p_device_id uuid,
  p_limit int DEFAULT 5
)
RETURNS SETOF public.print_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.print_jobs
  SET status = 'claimed', claimed_at = now(), device_id = COALESCE(device_id, p_device_id), updated_at = now()
  WHERE id IN (
    SELECT pj.id FROM public.print_jobs pj
    WHERE pj.tenant_id = p_tenant_id
      AND pj.status = 'queued'
      AND pj.available_at <= now()
      AND (pj.device_id IS NULL OR pj.device_id = p_device_id)
    ORDER BY pj.priority ASC, pj.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Update generate_pairing_code to return code + expires_at as composite
-- (keep simple: returns text, caller knows it's 10min)
