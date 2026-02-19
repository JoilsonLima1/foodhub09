
-- tenant_health view (using CASE WHEN for conditional counting to avoid FILTER on non-aggregate)
CREATE OR REPLACE VIEW public.tenant_health WITH (security_invoker = on) AS
WITH base AS (
  SELECT
    ae.tenant_id,
    MAX(ae.created_at) AS last_seen_at,
    COUNT(DISTINCT CASE WHEN ae.created_at >= now() - interval '7 days'
                        THEN date_trunc('day', ae.created_at) END)   AS days_active_7d,
    COUNT(DISTINCT CASE WHEN ae.created_at >= now() - interval '30 days'
                        THEN date_trunc('day', ae.created_at) END)   AS days_active_30d,
    COUNT(CASE WHEN ae.event_name = 'user_logged_in'
                AND ae.created_at >= now() - interval '7 days'
               THEN 1 END)                                           AS logins_7d,
    COUNT(CASE WHEN ae.event_name = 'product_created' THEN 1 END)    AS products_count,
    COUNT(CASE WHEN ae.event_name = 'sale_completed'
                AND ae.created_at >= now() - interval '30 days'
               THEN 1 END)                                           AS sales_count_30d,
    COALESCE(SUM(
      CASE WHEN ae.event_name = 'sale_completed'
             AND ae.created_at >= now() - interval '30 days'
           THEN (ae.metadata->>'amount')::numeric ELSE 0 END), 0)    AS sales_amount_30d,
    MAX(CASE WHEN ae.region IS NOT NULL THEN ae.region END)          AS geo_last_region,
    MAX(CASE WHEN ae.city IS NOT NULL   THEN ae.city END)            AS geo_last_city,
    MIN(CASE WHEN ae.utm_source IS NOT NULL THEN ae.utm_source END)  AS first_utm_source,
    bool_or(ae.event_name = 'user_signed_up')    AS did_signup,
    bool_or(ae.event_name = 'user_logged_in')    AS did_login,
    bool_or(ae.event_name = 'product_created')   AS did_create_product,
    bool_or(ae.event_name = 'sale_completed')    AS did_sell
  FROM public.analytics_events ae
  WHERE ae.tenant_id IS NOT NULL
  GROUP BY ae.tenant_id
)
SELECT
  b.tenant_id,
  b.last_seen_at,
  b.days_active_7d::int,
  b.days_active_30d::int,
  b.logins_7d::int,
  b.products_count::int,
  b.sales_count_30d::int,
  b.sales_amount_30d,
  CASE
    WHEN b.did_sell            THEN 'ACTIVE'
    WHEN b.did_create_product  THEN 'CONFIGURING'
    WHEN b.did_login           THEN 'LOGGED_IN'
    WHEN b.did_signup          THEN 'NEW'
    ELSE                            'INACTIVE'
  END AS activation_stage,
  (b.last_seen_at < now() - interval '14 days' OR b.last_seen_at IS NULL) AS risk_flag,
  b.geo_last_region,
  b.geo_last_city,
  b.first_utm_source,
  CASE
    WHEN b.did_sell           THEN 'SOLD'
    WHEN b.did_create_product THEN 'CREATED_PRODUCT'
    WHEN b.did_login          THEN 'LOGGED_IN'
    ELSE                           'SIGNED_UP'
  END AS funnel_step
FROM base b;

GRANT SELECT ON public.tenant_health TO authenticated;

-- geo distribution view
CREATE OR REPLACE VIEW public.analytics_geo_distribution WITH (security_invoker = on) AS
SELECT
  region,
  city,
  COUNT(DISTINCT tenant_id) AS tenant_count,
  COUNT(DISTINCT user_id)   AS user_count,
  COUNT(*)                  AS event_count
FROM public.analytics_events
WHERE region IS NOT NULL
GROUP BY region, city
ORDER BY tenant_count DESC;

GRANT SELECT ON public.analytics_geo_distribution TO authenticated;
