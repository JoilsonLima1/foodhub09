
-- 1) Adicionar last_seen_at na tabela user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_roles_last_seen
  ON public.user_roles (user_id, tenant_id, last_seen_at DESC);

-- 2) RPC track_session_ping
CREATE OR REPLACE FUNCTION public.track_session_ping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
   WHERE user_id = v_user_id
   LIMIT 1;

  INSERT INTO public.analytics_events (
    tenant_id, user_id, event_name, created_at
  ) VALUES (
    v_tenant_id, v_user_id, 'session_ping', now()
  );

  IF v_tenant_id IS NOT NULL THEN
    UPDATE public.user_roles
       SET last_seen_at = now()
     WHERE user_id = v_user_id
       AND tenant_id = v_tenant_id;
  ELSE
    UPDATE public.user_roles
       SET last_seen_at = now()
     WHERE user_id = v_user_id
       AND tenant_id IS NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.track_session_ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_session_ping() TO authenticated;

-- 3) Recriar view tenant_360_summary
DROP VIEW IF EXISTS public.tenant_360_summary CASCADE;

CREATE OR REPLACE VIEW public.tenant_360_summary AS
WITH owner_role AS (
  SELECT DISTINCT ON (ur.tenant_id)
    ur.tenant_id,
    ur.user_id,
    ur.last_seen_at AS role_last_seen_at
  FROM public.user_roles ur
  WHERE ur.tenant_id IS NOT NULL
    AND ur.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  ORDER BY ur.tenant_id, ur.last_seen_at DESC NULLS LAST
),
event_stats AS (
  SELECT
    ae.tenant_id,
    MAX(ae.created_at) AS event_last_seen_at,
    MAX(CASE WHEN ae.event_name = 'user_logged_in' THEN ae.created_at END) AS last_login_at,
    COUNT(CASE WHEN ae.event_name = 'user_logged_in'
               AND ae.created_at >= now() - interval '7 days' THEN 1 END) AS logins_7d,
    (SELECT ae2.region FROM public.analytics_events ae2
      WHERE ae2.tenant_id = ae.tenant_id AND ae2.region IS NOT NULL
      ORDER BY ae2.created_at DESC LIMIT 1) AS geo_last_region,
    (SELECT ae2.city FROM public.analytics_events ae2
      WHERE ae2.tenant_id = ae.tenant_id AND ae2.city IS NOT NULL
      ORDER BY ae2.created_at DESC LIMIT 1) AS geo_last_city
  FROM public.analytics_events ae
  WHERE ae.tenant_id IS NOT NULL
  GROUP BY ae.tenant_id
),
product_stats AS (
  SELECT tenant_id, COUNT(*) AS products_count
  FROM public.products
  GROUP BY tenant_id
),
sales_stats AS (
  SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS sales_count_30d,
    COALESCE(SUM(total) FILTER (WHERE created_at >= now() - interval '30 days'), 0) AS sales_amount_30d
  FROM public.orders
  GROUP BY tenant_id
)
SELECT
  t.id                                                    AS tenant_id,
  COALESCE(t.name, t.slug)                                AS tenant_name,
  t.whatsapp_number                                       AS tenant_whatsapp,
  t.phone                                                 AS tenant_phone,
  t.email                                                 AS tenant_email,
  t.is_active,
  t.created_at                                            AS tenant_created_at,
  o.user_id                                               AS owner_user_id,
  p.full_name                                             AS owner_name,
  p.phone                                                 AS owner_phone,
  COALESCE(o.role_last_seen_at, es.event_last_seen_at)    AS last_seen_at,
  es.last_login_at,
  COALESCE(t.state, es.geo_last_region)                   AS display_region,
  COALESCE(t.city, es.geo_last_city)                      AS display_city,
  es.geo_last_region,
  es.geo_last_city,
  COALESCE(es.logins_7d, 0)                               AS logins_7d,
  COALESCE(ps.products_count, 0)                          AS products_count,
  COALESCE(ss.sales_count_30d, 0)                         AS sales_count_30d,
  COALESCE(ss.sales_amount_30d, 0)                        AS sales_amount_30d,
  CASE
    WHEN COALESCE(o.role_last_seen_at, es.event_last_seen_at) < now() - interval '14 days' THEN 'INACTIVE'
    WHEN COALESCE(ss.sales_count_30d, 0) > 0                                               THEN 'ACTIVE'
    WHEN COALESCE(ps.products_count, 0) > 0                                                THEN 'CONFIGURING'
    WHEN es.last_login_at IS NOT NULL                                                       THEN 'LOGGED_IN'
    ELSE 'NEW'
  END AS activation_stage,
  CASE
    WHEN COALESCE(ss.sales_count_30d, 0) > 0  THEN 'SOLD'
    WHEN COALESCE(ps.products_count, 0) > 0   THEN 'CREATED_PRODUCT'
    WHEN es.last_login_at IS NOT NULL          THEN 'LOGGED_IN'
    ELSE 'SIGNED_UP'
  END AS funnel_step,
  (
    COALESCE(o.role_last_seen_at, es.event_last_seen_at) < now() - interval '14 days'
    OR (o.role_last_seen_at IS NULL AND es.event_last_seen_at IS NULL)
  ) AS risk_flag
FROM public.tenants t
LEFT JOIN owner_role    o  ON o.tenant_id = t.id
LEFT JOIN public.profiles p ON p.user_id = o.user_id
LEFT JOIN event_stats   es ON es.tenant_id = t.id
LEFT JOIN product_stats ps ON ps.tenant_id = t.id
LEFT JOIN sales_stats   ss ON ss.tenant_id = t.id;

-- 4) Recriar RPCs
CREATE OR REPLACE FUNCTION public.get_tenant_360_summary()
RETURNS TABLE (
  tenant_id        uuid,
  tenant_name      text,
  tenant_whatsapp  text,
  tenant_phone     text,
  tenant_email     text,
  owner_user_id    uuid,
  owner_name       text,
  owner_email      text,
  owner_phone      text,
  last_login_at    timestamptz,
  last_seen_at     timestamptz,
  geo_last_region  text,
  geo_last_city    text,
  display_region   text,
  display_city     text,
  logins_7d        bigint,
  products_count   bigint,
  sales_count_30d  bigint,
  sales_amount_30d numeric,
  activation_stage text,
  funnel_step      text,
  risk_flag        boolean,
  is_active        boolean,
  tenant_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    s.tenant_id, s.tenant_name, s.tenant_whatsapp, s.tenant_phone, s.tenant_email,
    s.owner_user_id, s.owner_name,
    (SELECT u.email::text FROM auth.users u WHERE u.id = s.owner_user_id) AS owner_email,
    s.owner_phone, s.last_login_at, s.last_seen_at,
    s.geo_last_region, s.geo_last_city, s.display_region, s.display_city,
    s.logins_7d, s.products_count, s.sales_count_30d, s.sales_amount_30d,
    s.activation_stage, s.funnel_step, s.risk_flag, s.is_active, s.tenant_created_at
  FROM public.tenant_360_summary s
  ORDER BY s.last_seen_at DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_single_tenant_360(_tenant_id uuid)
RETURNS TABLE (
  tenant_id        uuid,
  tenant_name      text,
  tenant_whatsapp  text,
  tenant_phone     text,
  tenant_email     text,
  owner_user_id    uuid,
  owner_name       text,
  owner_email      text,
  owner_phone      text,
  last_login_at    timestamptz,
  last_seen_at     timestamptz,
  geo_last_region  text,
  geo_last_city    text,
  display_region   text,
  display_city     text,
  logins_7d        bigint,
  products_count   bigint,
  sales_count_30d  bigint,
  sales_amount_30d numeric,
  activation_stage text,
  funnel_step      text,
  risk_flag        boolean,
  is_active        boolean,
  tenant_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    s.tenant_id, s.tenant_name, s.tenant_whatsapp, s.tenant_phone, s.tenant_email,
    s.owner_user_id, s.owner_name,
    (SELECT u.email::text FROM auth.users u WHERE u.id = s.owner_user_id) AS owner_email,
    s.owner_phone, s.last_login_at, s.last_seen_at,
    s.geo_last_region, s.geo_last_city, s.display_region, s.display_city,
    s.logins_7d, s.products_count, s.sales_count_30d, s.sales_amount_30d,
    s.activation_stage, s.funnel_step, s.risk_flag, s.is_active, s.tenant_created_at
  FROM public.tenant_360_summary s
  WHERE s.tenant_id = _tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_360_summary()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_single_tenant_360(uuid) TO authenticated;
