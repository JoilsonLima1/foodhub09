CREATE OR REPLACE FUNCTION public.resolve_pix_config(p_tenant_id UUID)
RETURNS TABLE(
  psp_provider_id UUID,
  psp_name TEXT,
  psp_display_name TEXT,
  pricing_plan_id UUID,
  pricing_plan_name TEXT,
  percent_rate NUMERIC,
  fixed_rate NUMERIC,
  min_fee NUMERIC,
  max_fee NUMERIC,
  is_subsidized BOOLEAN,
  rule_scope TEXT,
  rule_priority INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id TEXT;
  v_plan_slug TEXT;
  v_category TEXT;
BEGIN
  SELECT NULL::TEXT, sp.slug, t.business_category
  INTO v_partner_id, v_plan_slug, v_category
  FROM tenants t
  LEFT JOIN subscriptions s ON s.tenant_id = t.id
  LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE t.id = p_tenant_id;

  RETURN QUERY
  WITH ranked_rules AS (
    SELECT DISTINCT ON (r.psp_provider_id)
      r.psp_provider_id,
      p.name AS psp_name,
      p.display_name AS psp_display_name,
      r.pricing_plan_id,
      pp.name AS pricing_plan_name,
      COALESCE(pp.percent_rate, p.default_percent_fee) AS percent_rate,
      COALESCE(pp.fixed_rate, p.default_fixed_fee) AS fixed_rate,
      COALESCE(pp.min_fee, 0::numeric) AS min_fee,
      pp.max_fee,
      COALESCE(pp.is_subsidized, false) AS is_subsidized,
      r.scope AS rule_scope,
      CASE r.scope
        WHEN 'tenant' THEN 5
        WHEN 'partner' THEN 4
        WHEN 'plan' THEN 3
        WHEN 'category' THEN 2
        WHEN 'global' THEN 1
        ELSE 0
      END AS rule_priority
    FROM pix_availability_rules r
    JOIN pix_psp_providers p ON p.id = r.psp_provider_id AND p.is_active = true
    LEFT JOIN pix_pricing_plans pp ON pp.id = r.pricing_plan_id AND pp.is_active = true
    WHERE r.is_enabled = true
      AND (
        (r.scope = 'tenant' AND r.scope_id = p_tenant_id::TEXT)
        OR (r.scope = 'partner' AND r.scope_id = v_partner_id)
        OR (r.scope = 'plan' AND r.scope_id = v_plan_slug)
        OR (r.scope = 'category' AND r.scope_id = v_category)
        OR (r.scope = 'global' AND r.scope_id IS NULL)
      )
    ORDER BY r.psp_provider_id,
      CASE r.scope
        WHEN 'tenant' THEN 5
        WHEN 'partner' THEN 4
        WHEN 'plan' THEN 3
        WHEN 'category' THEN 2
        WHEN 'global' THEN 1
        ELSE 0
      END DESC
  )
  SELECT * FROM ranked_rules
  ORDER BY ranked_rules.rule_priority DESC;
END;
$$;