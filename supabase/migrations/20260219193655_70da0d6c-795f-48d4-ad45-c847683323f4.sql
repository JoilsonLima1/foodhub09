
-- ANALYTICS: Create analytics_events table + indexes + RLS
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  tenant_id    uuid NULL,
  user_id      uuid NULL,
  event_name   text NOT NULL,
  session_id   text NULL,
  ip_hash      text NULL,
  country      text NULL,
  region       text NULL,
  city         text NULL,
  user_agent   text NULL,
  referrer     text NULL,
  utm_source   text NULL,
  utm_medium   text NULL,
  utm_campaign text NULL,
  utm_term     text NULL,
  utm_content  text NULL,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_created ON public.analytics_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created   ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created   ON public.analytics_events (user_id, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_super_admin_all" ON public.analytics_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "analytics_tenant_own" ON public.analytics_events
  FOR SELECT
  USING (
    tenant_id IS NOT NULL AND
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_allow_insert" ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);
