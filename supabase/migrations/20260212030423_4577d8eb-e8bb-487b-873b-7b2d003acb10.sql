
-- ====================================
-- SmartPOS Module: Tables + Indexes + RLS
-- ====================================

-- A) tenant_devices
CREATE TABLE public.tenant_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'smartpos',
  model text,
  serial text,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('offline','online','error')),
  last_seen_at timestamptz,
  device_key_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_devices_tenant ON public.tenant_devices(tenant_id);
CREATE INDEX idx_tenant_devices_tenant_enabled ON public.tenant_devices(tenant_id, enabled);
CREATE INDEX idx_tenant_devices_tenant_last_seen ON public.tenant_devices(tenant_id, last_seen_at);

ALTER TABLE public.tenant_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their devices"
  ON public.tenant_devices FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins can insert devices"
  ON public.tenant_devices FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Tenant admins can update devices"
  ON public.tenant_devices FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Tenant admins can delete devices"
  ON public.tenant_devices FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- B) device_pairing_codes
CREATE TABLE public.device_pairing_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by_device_id uuid REFERENCES public.tenant_devices(id),
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pairing_codes_tenant_code ON public.device_pairing_codes(tenant_id, code);
CREATE INDEX idx_pairing_codes_expires ON public.device_pairing_codes(expires_at);

ALTER TABLE public.device_pairing_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view pairing codes"
  ON public.device_pairing_codes FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins can create pairing codes"
  ON public.device_pairing_codes FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- C) print_jobs
CREATE TABLE public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.tenant_devices(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'pdv',
  job_type text NOT NULL CHECK (job_type IN ('RECEIPT','KITCHEN_TICKET','TEST')),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','claimed','printing','printed','failed','cancelled')),
  priority int NOT NULL DEFAULT 5,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  claimed_at timestamptz,
  printed_at timestamptz,
  last_error text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_print_jobs_tenant_status ON public.print_jobs(tenant_id, status, created_at);
CREATE INDEX idx_print_jobs_tenant_device_status ON public.print_jobs(tenant_id, device_id, status);
CREATE INDEX idx_print_jobs_status_claimed ON public.print_jobs(status, claimed_at);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view print jobs"
  ON public.print_jobs FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can create print jobs"
  ON public.print_jobs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can update print jobs"
  ON public.print_jobs FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- D) device_events
CREATE TABLE public.device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.tenant_devices(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','error')),
  event_type text NOT NULL,
  message text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_events_tenant_device ON public.device_events(tenant_id, device_id, created_at);

ALTER TABLE public.device_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view device events"
  ON public.device_events FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Trigger for updated_at on tenant_devices
CREATE TRIGGER update_tenant_devices_updated_at
  BEFORE UPDATE ON public.tenant_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on print_jobs
CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RPC to generate pairing code
CREATE OR REPLACE FUNCTION public.generate_pairing_code(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  -- Verify caller has access to this tenant
  IF public.get_user_tenant_id(auth.uid()) != p_tenant_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Generate unique 6-digit code
  LOOP
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.device_pairing_codes
      WHERE code = v_code AND tenant_id = p_tenant_id
        AND expires_at > now() AND used_at IS NULL
    );
  END LOOP;

  INSERT INTO public.device_pairing_codes (tenant_id, code, expires_at, created_by_user_id)
  VALUES (p_tenant_id, v_code, now() + interval '10 minutes', auth.uid());

  RETURN v_code;
END;
$$;

-- RPC for atomic job claim (used by edge function with service role)
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
  SET status = 'claimed', claimed_at = now(), device_id = p_device_id, updated_at = now()
  WHERE id IN (
    SELECT pj.id FROM public.print_jobs pj
    WHERE pj.tenant_id = p_tenant_id
      AND pj.status = 'queued'
      AND (pj.device_id IS NULL OR pj.device_id = p_device_id)
    ORDER BY pj.priority ASC, pj.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
