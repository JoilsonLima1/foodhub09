-- =====================================================
-- PHASE 12 RPCs: Add-ons, Proration, Coupons, Entitlements
-- =====================================================

-- =====================================================
-- 1. PARTNER ADDON CRUD
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_partner_addon(
  p_partner_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_pricing_type TEXT DEFAULT 'recurring',
  p_amount NUMERIC DEFAULT 0,
  p_billing_period TEXT DEFAULT 'monthly',
  p_module_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_addon_id UUID;
BEGIN
  INSERT INTO partner_addons (
    partner_id, name, description, pricing_type, 
    amount, billing_period, module_key
  ) VALUES (
    p_partner_id, p_name, p_description, p_pricing_type,
    p_amount, p_billing_period, p_module_key
  )
  RETURNING id INTO v_addon_id;
  
  RETURN v_addon_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_partner_addon(
  p_addon_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_pricing_type TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_billing_period TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE partner_addons SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    pricing_type = COALESCE(p_pricing_type, pricing_type),
    amount = COALESCE(p_amount, amount),
    billing_period = COALESCE(p_billing_period, billing_period),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_addon_id;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_partner_addons(p_partner_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  pricing_type TEXT,
  amount NUMERIC,
  currency TEXT,
  billing_period TEXT,
  module_key TEXT,
  is_active BOOLEAN,
  subscribers_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.description,
    a.pricing_type,
    a.amount,
    a.currency,
    a.billing_period,
    a.module_key,
    a.is_active,
    COUNT(s.id) FILTER (WHERE s.status = 'active') AS subscribers_count
  FROM partner_addons a
  LEFT JOIN partner_tenant_addon_subscriptions s ON s.addon_id = a.id
  WHERE a.partner_id = p_partner_id
  GROUP BY a.id
  ORDER BY a.display_order, a.created_at;
END;
$$;

-- =====================================================
-- 2. TENANT ADDON SUBSCRIPTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.subscribe_tenant_addon(
  p_tenant_id UUID,
  p_addon_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_addon partner_addons%ROWTYPE;
  v_partner_id UUID;
  v_existing_id UUID;
  v_subscription_id UUID;
BEGIN
  -- Get addon info
  SELECT * INTO v_addon FROM partner_addons WHERE id = p_addon_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Add-on not found or inactive';
  END IF;
  
  -- Get partner for this tenant
  SELECT pt.partner_id INTO v_partner_id 
  FROM partner_tenants pt WHERE pt.tenant_id = p_tenant_id;
  
  IF v_partner_id IS NULL OR v_partner_id != v_addon.partner_id THEN
    RAISE EXCEPTION 'Add-on not available for this tenant';
  END IF;
  
  -- Check for existing active subscription (idempotent)
  SELECT id INTO v_existing_id
  FROM partner_tenant_addon_subscriptions
  WHERE tenant_id = p_tenant_id AND addon_id = p_addon_id AND status = 'active';
  
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id; -- Already subscribed
  END IF;
  
  -- Create subscription
  INSERT INTO partner_tenant_addon_subscriptions (
    tenant_id, partner_id, addon_id, status, start_at
  ) VALUES (
    p_tenant_id, v_partner_id, p_addon_id, 'active', now()
  )
  RETURNING id INTO v_subscription_id;
  
  -- Create entitlement if module_key exists
  IF v_addon.module_key IS NOT NULL THEN
    INSERT INTO tenant_entitlements (
      tenant_id, partner_id, entitlement_key, entitlement_value,
      source, source_id, effective_from
    ) VALUES (
      p_tenant_id, v_partner_id, v_addon.module_key,
      jsonb_build_object('enabled', true, 'addon_name', v_addon.name),
      'addon', v_subscription_id, now()
    );
  END IF;
  
  RETURN v_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_tenant_addon_subscription(
  p_subscription_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub partner_tenant_addon_subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_sub 
  FROM partner_tenant_addon_subscriptions 
  WHERE id = p_subscription_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Cancel the subscription
  UPDATE partner_tenant_addon_subscriptions SET
    status = 'canceled',
    canceled_at = now(),
    cancellation_reason = p_reason,
    end_at = now()
  WHERE id = p_subscription_id;
  
  -- End related entitlements
  UPDATE tenant_entitlements SET
    effective_to = now()
  WHERE source = 'addon' AND source_id = p_subscription_id AND effective_to IS NULL;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- 3. COUPON VALIDATION & APPLICATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_tenant_id UUID,
  p_code TEXT
)
RETURNS TABLE (
  valid BOOLEAN,
  coupon_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  applies_to TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon partner_coupons%ROWTYPE;
  v_partner_id UUID;
  v_total_redemptions BIGINT;
  v_tenant_redemptions BIGINT;
BEGIN
  -- Get partner for tenant
  SELECT pt.partner_id INTO v_partner_id 
  FROM partner_tenants pt WHERE pt.tenant_id = p_tenant_id;
  
  IF v_partner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::TEXT, 
      'Tenant não associado a um parceiro'::TEXT;
    RETURN;
  END IF;
  
  -- Find coupon
  SELECT * INTO v_coupon 
  FROM partner_coupons 
  WHERE partner_id = v_partner_id 
    AND UPPER(code) = UPPER(p_code) 
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::TEXT, 
      'Cupom não encontrado ou inativo'::TEXT;
    RETURN;
  END IF;
  
  -- Check validity period
  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::TEXT, 
      'Cupom ainda não está válido'::TEXT;
    RETURN;
  END IF;
  
  IF v_coupon.valid_to IS NOT NULL AND v_coupon.valid_to < now() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::TEXT, 
      'Cupom expirado'::TEXT;
    RETURN;
  END IF;
  
  -- Check max redemptions
  IF v_coupon.max_redemptions IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_redemptions 
    FROM coupon_redemptions WHERE coupon_id = v_coupon.id;
    
    IF v_total_redemptions >= v_coupon.max_redemptions THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::TEXT, 
        'Limite de uso do cupom atingido'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check per-tenant limit
  IF v_coupon.max_redemptions_per_tenant IS NOT NULL THEN
    SELECT COUNT(*) INTO v_tenant_redemptions 
    FROM coupon_redemptions 
    WHERE coupon_id = v_coupon.id AND tenant_id = p_tenant_id;
    
    IF v_tenant_redemptions >= v_coupon.max_redemptions_per_tenant THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::TEXT, 
        'Você já utilizou este cupom o máximo de vezes permitido'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Valid!
  RETURN QUERY SELECT TRUE, v_coupon.id, v_coupon.discount_type, 
    v_coupon.discount_value, v_coupon.applies_to, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_coupon_to_next_invoice(
  p_tenant_id UUID,
  p_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation RECORD;
  v_pending_id UUID;
BEGIN
  -- Validate first
  SELECT * INTO v_validation FROM validate_coupon(p_tenant_id, p_code);
  
  IF NOT v_validation.valid THEN
    RAISE EXCEPTION '%', v_validation.error_message;
  END IF;
  
  -- Check for existing pending coupon
  SELECT id INTO v_pending_id
  FROM tenant_pending_coupons
  WHERE tenant_id = p_tenant_id AND status = 'pending';
  
  IF v_pending_id IS NOT NULL THEN
    -- Expire old pending
    UPDATE tenant_pending_coupons SET status = 'expired' WHERE id = v_pending_id;
  END IF;
  
  -- Create pending application
  INSERT INTO tenant_pending_coupons (
    tenant_id, coupon_id, applies_to, status
  ) VALUES (
    p_tenant_id, v_validation.coupon_id, 'next_invoice', 'pending'
  )
  RETURNING id INTO v_pending_id;
  
  RETURN v_pending_id;
END;
$$;

-- =====================================================
-- 4. PRORATION CALCULATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_proration(
  p_tenant_id UUID,
  p_new_plan_id UUID
)
RETURNS TABLE (
  from_plan_id UUID,
  from_plan_name TEXT,
  from_amount NUMERIC,
  to_plan_id UUID,
  to_plan_name TEXT,
  to_amount NUMERIC,
  days_remaining INTEGER,
  days_in_cycle INTEGER,
  proration_credit NUMERIC,
  proration_charge NUMERIC,
  net_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_current_plan partner_plans%ROWTYPE;
  v_new_plan partner_plans%ROWTYPE;
  v_days_remaining INTEGER;
  v_days_in_cycle INTEGER;
  v_credit NUMERIC;
  v_charge NUMERIC;
BEGIN
  -- Get tenant
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;
  
  -- Get current plan via partner_tenants
  SELECT pp.* INTO v_current_plan
  FROM partner_tenants pt
  JOIN partner_plans pp ON pp.id = pt.partner_plan_id
  WHERE pt.tenant_id = p_tenant_id;
  
  -- Get new plan
  SELECT * INTO v_new_plan FROM partner_plans WHERE id = p_new_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'New plan not found';
  END IF;
  
  -- Calculate days remaining in current cycle
  IF v_tenant.subscription_current_period_end IS NOT NULL THEN
    v_days_remaining := GREATEST(0, (v_tenant.subscription_current_period_end::date - CURRENT_DATE));
    v_days_in_cycle := GREATEST(1, 
      (v_tenant.subscription_current_period_end::date - 
       COALESCE(v_tenant.subscription_current_period_start::date, CURRENT_DATE - 30))
    );
  ELSE
    v_days_remaining := 0;
    v_days_in_cycle := 30;
  END IF;
  
  -- Calculate proration
  v_credit := COALESCE(v_current_plan.price, 0) * v_days_remaining / v_days_in_cycle;
  v_charge := v_new_plan.price * v_days_remaining / v_days_in_cycle;
  
  RETURN QUERY SELECT
    v_current_plan.id,
    v_current_plan.name,
    COALESCE(v_current_plan.price, 0::NUMERIC),
    v_new_plan.id,
    v_new_plan.name,
    v_new_plan.price,
    v_days_remaining,
    v_days_in_cycle,
    ROUND(v_credit, 2),
    ROUND(v_charge, 2),
    ROUND(v_charge - v_credit, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.change_tenant_plan_with_proration(
  p_tenant_id UUID,
  p_new_plan_id UUID,
  p_waive_proration BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proration RECORD;
  v_proration_id UUID;
  v_invoice_id UUID;
  v_partner_id UUID;
BEGIN
  -- Get partner
  SELECT pt.partner_id INTO v_partner_id 
  FROM partner_tenants pt WHERE pt.tenant_id = p_tenant_id;
  
  -- Calculate proration
  SELECT * INTO v_proration FROM calculate_proration(p_tenant_id, p_new_plan_id);
  
  -- Check for existing pending proration (idempotent)
  SELECT id INTO v_proration_id
  FROM plan_change_prorations
  WHERE tenant_id = p_tenant_id 
    AND to_plan_id = p_new_plan_id 
    AND status = 'pending';
  
  IF v_proration_id IS NOT NULL THEN
    RETURN v_proration_id; -- Already pending
  END IF;
  
  -- Record proration
  INSERT INTO plan_change_prorations (
    tenant_id, from_plan_id, to_plan_id, from_plan_name, to_plan_name,
    days_remaining, days_in_cycle, from_amount, to_amount,
    proration_credit, proration_charge, net_amount,
    status
  ) VALUES (
    p_tenant_id, v_proration.from_plan_id, v_proration.to_plan_id,
    v_proration.from_plan_name, v_proration.to_plan_name,
    v_proration.days_remaining, v_proration.days_in_cycle,
    v_proration.from_amount, v_proration.to_amount,
    v_proration.proration_credit, v_proration.proration_charge,
    v_proration.net_amount,
    CASE WHEN p_waive_proration THEN 'waived' ELSE 'pending' END
  )
  RETURNING id INTO v_proration_id;
  
  -- Update tenant plan (via partner_tenants)
  UPDATE partner_tenants SET
    partner_plan_id = p_new_plan_id
  WHERE tenant_id = p_tenant_id;
  
  -- Create one-time invoice for proration if positive and not waived
  IF v_proration.net_amount > 0 AND NOT p_waive_proration THEN
    INSERT INTO tenant_invoices (
      tenant_id, partner_id, invoice_type, amount, status, 
      due_date, description
    ) VALUES (
      p_tenant_id, v_partner_id, 'proration', v_proration.net_amount, 
      'pending', CURRENT_DATE + 7,
      'Ajuste proporcional: ' || v_proration.from_plan_name || ' → ' || v_proration.to_plan_name
    )
    RETURNING id INTO v_invoice_id;
    
    UPDATE plan_change_prorations SET 
      invoice_id = v_invoice_id,
      status = 'applied',
      applied_at = now()
    WHERE id = v_proration_id;
  END IF;
  
  RETURN v_proration_id;
END;
$$;

-- =====================================================
-- 5. ENTITLEMENTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.rebuild_tenant_entitlements(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_plan_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Get partner and plan
  SELECT pt.partner_id, pt.partner_plan_id INTO v_partner_id, v_plan_id
  FROM partner_tenants pt WHERE pt.tenant_id = p_tenant_id;
  
  -- Close existing plan-based entitlements
  UPDATE tenant_entitlements SET effective_to = now()
  WHERE tenant_id = p_tenant_id AND source = 'plan' AND effective_to IS NULL;
  
  -- Create new entitlements from plan modules
  INSERT INTO tenant_entitlements (
    tenant_id, partner_id, entitlement_key, entitlement_value,
    source, source_id, effective_from
  )
  SELECT 
    p_tenant_id,
    v_partner_id,
    am.slug,
    jsonb_build_object('enabled', true, 'from_plan', pp.name),
    'plan',
    v_plan_id,
    now()
  FROM partner_plan_modules ppm
  JOIN partner_plans pp ON pp.id = ppm.plan_id
  JOIN addon_modules am ON am.id = ppm.module_id
  WHERE ppm.plan_id = v_plan_id AND ppm.is_included = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_entitlement(
  p_tenant_id UUID,
  p_key TEXT,
  p_requested_value INTEGER DEFAULT NULL
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_value JSONB,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entitlement tenant_entitlements%ROWTYPE;
  v_limit INTEGER;
BEGIN
  -- Find active entitlement
  SELECT * INTO v_entitlement
  FROM tenant_entitlements
  WHERE tenant_id = p_tenant_id 
    AND entitlement_key = p_key
    AND (effective_to IS NULL OR effective_to > now())
  ORDER BY effective_from DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB, 
      'Funcionalidade não disponível no seu plano'::TEXT;
    RETURN;
  END IF;
  
  -- Check if enabled
  IF (v_entitlement.entitlement_value->>'enabled')::boolean = false THEN
    RETURN QUERY SELECT FALSE, v_entitlement.entitlement_value, 
      'Funcionalidade desabilitada'::TEXT;
    RETURN;
  END IF;
  
  -- Check limit if requested
  IF p_requested_value IS NOT NULL THEN
    v_limit := (v_entitlement.entitlement_value->>'limit')::integer;
    IF v_limit IS NOT NULL AND v_limit != -1 AND p_requested_value > v_limit THEN
      RETURN QUERY SELECT FALSE, v_entitlement.entitlement_value, 
        format('Limite excedido: máximo %s', v_limit)::TEXT;
      RETURN;
    END IF;
  END IF;
  
  RETURN QUERY SELECT TRUE, v_entitlement.entitlement_value, NULL::TEXT;
END;
$$;

-- =====================================================
-- 6. LIST FUNCTIONS FOR UI
-- =====================================================
CREATE OR REPLACE FUNCTION public.list_tenant_addon_subscriptions(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  addon_id UUID,
  addon_name TEXT,
  addon_description TEXT,
  amount NUMERIC,
  pricing_type TEXT,
  status TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.addon_id,
    a.name,
    a.description,
    a.amount,
    a.pricing_type,
    s.status,
    s.start_at,
    s.end_at
  FROM partner_tenant_addon_subscriptions s
  JOIN partner_addons a ON a.id = s.addon_id
  WHERE s.tenant_id = p_tenant_id
  ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_available_addons_for_tenant(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  amount NUMERIC,
  currency TEXT,
  pricing_type TEXT,
  billing_period TEXT,
  is_subscribed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  SELECT pt.partner_id INTO v_partner_id 
  FROM partner_tenants pt WHERE pt.tenant_id = p_tenant_id;
  
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.description,
    a.amount,
    a.currency,
    a.pricing_type,
    a.billing_period,
    EXISTS (
      SELECT 1 FROM partner_tenant_addon_subscriptions s
      WHERE s.addon_id = a.id AND s.tenant_id = p_tenant_id AND s.status = 'active'
    ) AS is_subscribed
  FROM partner_addons a
  WHERE a.partner_id = v_partner_id AND a.is_active = true
  ORDER BY a.display_order, a.name;
END;
$$;