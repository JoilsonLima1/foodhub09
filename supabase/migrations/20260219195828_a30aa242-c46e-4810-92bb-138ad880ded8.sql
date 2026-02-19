
-- View tenant_360_summary: identidade + contato + atividade por tenant
-- Usa SECURITY DEFINER para super_admin acessar auth.users via função auxiliar

-- Função auxiliar para obter email do auth.users (security definer)
CREATE OR REPLACE FUNCTION public.get_auth_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id LIMIT 1;
$$;

-- Drop view se existir
DROP VIEW IF EXISTS public.tenant_360_summary;

CREATE VIEW public.tenant_360_summary
WITH (security_invoker = off)
AS
WITH
-- Owner/admin de cada tenant (primeiro admin pelo created_at)
tenant_owner AS (
  SELECT DISTINCT ON (ur.tenant_id)
    ur.tenant_id,
    ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ORDER BY ur.tenant_id, ur.created_at ASC
),

-- Perfil do owner
owner_profile AS (
  SELECT
    p.user_id,
    p.tenant_id,
    p.full_name,
    p.phone
  FROM public.profiles p
),

-- Último login por tenant
last_login AS (
  SELECT
    tenant_id,
    MAX(created_at) AS last_login_at
  FROM public.analytics_events
  WHERE event_name = 'user_logged_in'
    AND tenant_id IS NOT NULL
  GROUP BY tenant_id
),

-- Último acesso por tenant (qualquer evento)
last_seen AS (
  SELECT
    tenant_id,
    MAX(created_at) AS last_seen_at
  FROM public.analytics_events
  WHERE tenant_id IS NOT NULL
  GROUP BY tenant_id
),

-- Geo do evento mais recente
last_geo AS (
  SELECT DISTINCT ON (tenant_id)
    tenant_id,
    region AS geo_last_region,
    city   AS geo_last_city
  FROM public.analytics_events
  WHERE tenant_id IS NOT NULL
    AND (region IS NOT NULL OR city IS NOT NULL)
  ORDER BY tenant_id, created_at DESC
),

-- Métricas agregadas por tenant
metrics AS (
  SELECT
    tenant_id,
    COUNT(CASE WHEN event_name = 'user_logged_in'
                AND created_at > (now() - interval '7 days') THEN 1 END)  AS logins_7d,
    COUNT(CASE WHEN event_name = 'product_created' THEN 1 END)             AS products_count,
    COUNT(CASE WHEN event_name = 'sale_completed'
                AND created_at > (now() - interval '30 days') THEN 1 END) AS sales_count_30d,
    COALESCE(SUM(CASE WHEN event_name = 'sale_completed'
                       AND created_at > (now() - interval '30 days')
                  THEN (metadata->>'amount')::numeric END), 0)             AS sales_amount_30d,
    -- Funil
    bool_or(event_name = 'user_signed_up')    AS did_signup,
    bool_or(event_name = 'user_logged_in')    AS did_login,
    bool_or(event_name = 'product_created')   AS did_create_product,
    bool_or(event_name = 'sale_completed')    AS did_sell
  FROM public.analytics_events
  WHERE tenant_id IS NOT NULL
  GROUP BY tenant_id
)

SELECT
  t.id                                                          AS tenant_id,
  COALESCE(t.name, t.slug, t.id::text)                         AS tenant_name,
  COALESCE(t.whatsapp_number, t.phone, op.phone)               AS tenant_whatsapp,
  COALESCE(t.phone, t.whatsapp_number, op.phone)               AS tenant_phone,
  t.email                                                       AS tenant_email,
  to_val.user_id                                                AS owner_user_id,
  COALESCE(op.full_name, t.name)                               AS owner_name,
  COALESCE(t.email, public.get_auth_user_email(to_val.user_id)) AS owner_email,
  op.phone                                                      AS owner_phone,
  ll.last_login_at,
  ls.last_seen_at,
  lg.geo_last_region,
  lg.geo_last_city,
  COALESCE(t.state, lg.geo_last_region)                        AS display_region,
  COALESCE(t.city, lg.geo_last_city)                           AS display_city,
  COALESCE(m.logins_7d, 0)                                     AS logins_7d,
  COALESCE(m.products_count, 0)                                AS products_count,
  COALESCE(m.sales_count_30d, 0)                               AS sales_count_30d,
  COALESCE(m.sales_amount_30d, 0)                              AS sales_amount_30d,
  CASE
    WHEN ls.last_seen_at IS NULL                                              THEN 'INACTIVE'
    WHEN ls.last_seen_at < (now() - interval '14 days')                      THEN 'INACTIVE'
    WHEN m.did_sell                                                           THEN 'ACTIVE'
    WHEN m.did_create_product                                                 THEN 'CONFIGURING'
    WHEN m.did_login                                                          THEN 'LOGGED_IN'
    WHEN m.did_signup                                                         THEN 'NEW'
    ELSE 'INACTIVE'
  END                                                           AS activation_stage,
  CASE
    WHEN m.did_sell           THEN 'SOLD'
    WHEN m.did_create_product THEN 'CREATED_PRODUCT'
    WHEN m.did_login          THEN 'LOGGED_IN'
    WHEN m.did_signup         THEN 'SIGNED_UP'
    ELSE 'UNKNOWN'
  END                                                           AS funnel_step,
  (ls.last_seen_at IS NULL OR ls.last_seen_at < (now() - interval '14 days')) AS risk_flag,
  t.is_active,
  t.created_at                                                  AS tenant_created_at
FROM public.tenants t
LEFT JOIN tenant_owner    to_val ON to_val.tenant_id = t.id
LEFT JOIN owner_profile   op     ON op.user_id = to_val.user_id
LEFT JOIN last_login      ll     ON ll.tenant_id = t.id
LEFT JOIN last_seen        ls     ON ls.tenant_id = t.id
LEFT JOIN last_geo         lg     ON lg.tenant_id = t.id
LEFT JOIN metrics          m      ON m.tenant_id = t.id;

-- RLS: apenas super_admin acessa a view
-- (a view usa security_invoker=off e função SECURITY DEFINER; 
--  protegida pelo has_role check no app/policy)

GRANT SELECT ON public.tenant_360_summary TO authenticated;

-- Função RPC segura para super_admin buscar a view completa
CREATE OR REPLACE FUNCTION public.get_tenant_360_summary()
RETURNS SETOF public.tenant_360_summary
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.tenant_360_summary
  WHERE public.has_role(auth.uid(), 'super_admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_360_summary() TO authenticated;

-- Função para buscar 360 de um tenant específico (para Tenant360Panel)
CREATE OR REPLACE FUNCTION public.get_single_tenant_360(_tenant_id uuid)
RETURNS SETOF public.tenant_360_summary
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.tenant_360_summary
  WHERE tenant_id = _tenant_id
    AND public.has_role(auth.uid(), 'super_admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_single_tenant_360(uuid) TO authenticated;
