-- =====================================================
-- PHASE 11 RPCs: BILLING LIFECYCLE
-- =====================================================

-- RPC: create_or_update_billing_profile
CREATE OR REPLACE FUNCTION public.create_or_update_billing_profile(
  p_tenant_id UUID,
  p_billing_email TEXT DEFAULT NULL,
  p_billing_phone TEXT DEFAULT NULL,
  p_billing_doc TEXT DEFAULT NULL,
  p_billing_name TEXT DEFAULT NULL,
  p_provider_customer_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_profile tenant_billing_profiles%ROWTYPE;
BEGIN
  SELECT partner_id INTO v_partner_id FROM tenants WHERE id = p_tenant_id;

  INSERT INTO tenant_billing_profiles (
    tenant_id, partner_id, billing_email, billing_phone, billing_doc, billing_name, provider_customer_id
  )
  VALUES (
    p_tenant_id, v_partner_id, p_billing_email, p_billing_phone, p_billing_doc, p_billing_name, p_provider_customer_id
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    billing_email = COALESCE(EXCLUDED.billing_email, tenant_billing_profiles.billing_email),
    billing_phone = COALESCE(EXCLUDED.billing_phone, tenant_billing_profiles.billing_phone),
    billing_doc = COALESCE(EXCLUDED.billing_doc, tenant_billing_profiles.billing_doc),
    billing_name = COALESCE(EXCLUDED.billing_name, tenant_billing_profiles.billing_name),
    provider_customer_id = COALESCE(EXCLUDED.provider_customer_id, tenant_billing_profiles.provider_customer_id),
    updated_at = now()
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object('success', true, 'profile_id', v_profile.id, 'tenant_id', v_profile.tenant_id);
END;
$$;

-- RPC: create_subscription_invoice (IDEMPOTENT)
CREATE OR REPLACE FUNCTION public.create_subscription_invoice(
  p_tenant_id UUID,
  p_subscription_id UUID,
  p_amount NUMERIC,
  p_due_date DATE,
  p_period_start DATE,
  p_period_end DATE,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_invoice tenant_invoices%ROWTYPE;
  v_new_invoice tenant_invoices%ROWTYPE;
  v_subscription tenant_subscriptions%ROWTYPE;
  v_cycle subscription_cycles%ROWTYPE;
BEGIN
  -- Check for existing invoice (idempotency)
  SELECT * INTO v_existing_invoice
  FROM tenant_invoices
  WHERE tenant_id = p_tenant_id AND subscription_id = p_subscription_id
    AND period_start = p_period_start AND period_end = p_period_end
    AND status NOT IN ('canceled', 'refunded');

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'invoice_id', v_existing_invoice.id, 
      'status', v_existing_invoice.status, 'message', 'Invoice already exists');
  END IF;

  SELECT * INTO v_subscription FROM tenant_subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  INSERT INTO tenant_invoices (
    tenant_id, partner_id, plan_id, subscription_id, amount, due_date, period_start, period_end, status,
    metadata
  )
  VALUES (
    p_tenant_id, v_subscription.partner_id, v_subscription.partner_plan_id, p_subscription_id,
    p_amount, p_due_date, p_period_start, p_period_end, 'pending',
    jsonb_build_object('idempotency_key', COALESCE(p_idempotency_key, p_tenant_id || '-' || p_period_start))
  )
  RETURNING * INTO v_new_invoice;

  INSERT INTO subscription_cycles (tenant_id, partner_id, subscription_id, cycle_start, cycle_end, invoice_id, status)
  VALUES (p_tenant_id, v_subscription.partner_id, p_subscription_id, p_period_start, p_period_end, v_new_invoice.id, 'open')
  ON CONFLICT (subscription_id, cycle_start, cycle_end) DO UPDATE SET invoice_id = EXCLUDED.invoice_id
  RETURNING * INTO v_cycle;

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'invoice_id', v_new_invoice.id, 
    'cycle_id', v_cycle.id, 'status', v_new_invoice.status, 'amount', v_new_invoice.amount);
END;
$$;

-- RPC: sync_invoice_status_from_ssot
CREATE OR REPLACE FUNCTION public.sync_invoice_status_from_ssot(p_provider_payment_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice tenant_invoices%ROWTYPE;
  v_event payment_events%ROWTYPE;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_invoice FROM tenant_invoices WHERE provider_payment_id = p_provider_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  SELECT * INTO v_event FROM payment_events WHERE provider_payment_id = p_provider_payment_id
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'No events found', 'invoice_status', v_invoice.status);
  END IF;

  CASE v_event.event_type
    WHEN 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED' THEN v_new_status := 'paid';
    WHEN 'PAYMENT_OVERDUE' THEN v_new_status := 'overdue';
    WHEN 'PAYMENT_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS' THEN v_new_status := 'refunded';
    WHEN 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE' THEN v_new_status := 'chargeback';
    WHEN 'PAYMENT_DELETED' THEN v_new_status := 'canceled';
    ELSE v_new_status := v_invoice.status;
  END CASE;

  IF v_new_status != v_invoice.status THEN
    UPDATE tenant_invoices SET status = v_new_status, 
      paid_at = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END,
      updated_at = now()
    WHERE id = v_invoice.id;

    UPDATE subscription_cycles SET status = CASE 
      WHEN v_new_status = 'paid' THEN 'paid' WHEN v_new_status = 'overdue' THEN 'overdue' ELSE status END
    WHERE invoice_id = v_invoice.id;

    IF v_new_status = 'paid' AND v_invoice.subscription_id IS NOT NULL THEN
      UPDATE tenant_subscriptions SET status = 'active', 
        current_period_start = v_invoice.period_start, current_period_end = v_invoice.period_end
      WHERE id = v_invoice.subscription_id;
      UPDATE tenants SET subscription_status = 'active' WHERE id = v_invoice.tenant_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice.id, 
    'previous_status', v_invoice.status, 'new_status', v_new_status, 'event_type', v_event.event_type);
END;
$$;

-- RPC: apply_dunning_policy
CREATE OR REPLACE FUNCTION public.apply_dunning_policy(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_invoice tenant_invoices%ROWTYPE;
  v_policy partner_dunning_policies%ROWTYPE;
  v_days_overdue INT;
  v_new_status TEXT;
  v_actions JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Tenant not found'); END IF;

  SELECT * INTO v_invoice FROM tenant_invoices
  WHERE tenant_id = p_tenant_id AND status = 'overdue' ORDER BY due_date ASC LIMIT 1;

  IF NOT FOUND THEN
    IF v_tenant.subscription_status IN ('past_due', 'suspended') THEN
      UPDATE tenants SET subscription_status = 'active' WHERE id = p_tenant_id;
      v_actions := v_actions || jsonb_build_object('action', 'reactivated', 'reason', 'no_overdue_invoices');
    END IF;
    RETURN jsonb_build_object('success', true, 'message', 'No overdue invoices', 'actions', v_actions);
  END IF;

  SELECT * INTO v_policy FROM partner_dunning_policies WHERE partner_id = v_tenant.partner_id LIMIT 1;
  IF NOT FOUND THEN SELECT * INTO v_policy FROM partner_dunning_policies WHERE partner_id IS NULL LIMIT 1; END IF;

  v_days_overdue := CURRENT_DATE - v_invoice.due_date;

  IF v_days_overdue >= v_policy.block_after_days THEN v_new_status := 'blocked';
  ELSIF v_days_overdue >= v_policy.suspend_after_days THEN v_new_status := 'suspended';
  ELSIF v_days_overdue >= v_policy.grace_days THEN v_new_status := 'past_due';
  ELSE v_new_status := 'active'; END IF;

  IF v_new_status != v_tenant.subscription_status THEN
    UPDATE tenants SET subscription_status = v_new_status WHERE id = p_tenant_id;
    UPDATE tenant_subscriptions SET status = v_new_status WHERE tenant_id = p_tenant_id AND status NOT IN ('canceled');
    v_actions := v_actions || jsonb_build_object('action', 'status_changed', 'from', v_tenant.subscription_status, 'to', v_new_status);
    INSERT INTO billing_notifications (tenant_id, invoice_id, type, template_key, status, scheduled_at)
    VALUES (p_tenant_id, v_invoice.id, 'inapp', 'dunning_' || v_new_status, 'queued', now());
  END IF;

  RETURN jsonb_build_object('success', true, 'tenant_id', p_tenant_id, 'days_overdue', v_days_overdue, 
    'current_status', v_new_status, 'actions', v_actions);
END;
$$;

-- RPC: reactivate_on_payment
CREATE OR REPLACE FUNCTION public.reactivate_on_payment(p_tenant_id UUID, p_invoice_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_pending_count INT;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Tenant not found'); END IF;

  SELECT COUNT(*) INTO v_pending_count FROM tenant_invoices WHERE tenant_id = p_tenant_id AND status IN ('pending', 'overdue');

  IF v_pending_count = 0 THEN
    UPDATE tenants SET subscription_status = 'active' WHERE id = p_tenant_id;
    UPDATE tenant_subscriptions SET status = 'active' WHERE tenant_id = p_tenant_id AND status NOT IN ('canceled');
    RETURN jsonb_build_object('success', true, 'reactivated', true, 'tenant_id', p_tenant_id, 'previous_status', v_tenant.subscription_status);
  ELSE
    RETURN jsonb_build_object('success', true, 'reactivated', false, 'pending_invoices', v_pending_count);
  END IF;
END;
$$;

-- RPC: run_billing_cycle_cron
CREATE OR REPLACE FUNCTION public.run_billing_cycle_cron(p_target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_result JSONB;
  v_invoices_created INT := 0;
  v_dunning_applied INT := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  FOR v_subscription IN
    SELECT ts.*, pp.monthly_price, t.partner_id
    FROM tenant_subscriptions ts
    JOIN tenants t ON t.id = ts.tenant_id
    LEFT JOIN partner_plans pp ON pp.id = ts.partner_plan_id
    WHERE ts.status = 'active' AND ts.current_period_end IS NOT NULL
      AND ts.current_period_end <= p_target_date + INTERVAL '3 days'
      AND ts.billing_mode != 'trial'
      AND NOT EXISTS (
        SELECT 1 FROM tenant_invoices ti WHERE ti.subscription_id = ts.id
          AND ti.period_start = ts.current_period_end AND ti.status NOT IN ('canceled', 'refunded'))
  LOOP
    BEGIN
      SELECT public.create_subscription_invoice(
        v_subscription.tenant_id, v_subscription.id, 
        COALESCE(v_subscription.monthly_price, v_subscription.monthly_amount, 0),
        v_subscription.current_period_end::DATE, v_subscription.current_period_end::DATE,
        (v_subscription.current_period_end + INTERVAL '30 days')::DATE
      ) INTO v_result;
      IF (v_result->>'success')::BOOLEAN AND NOT (v_result->>'idempotent')::BOOLEAN THEN
        v_invoices_created := v_invoices_created + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('subscription_id', v_subscription.id, 'error', SQLERRM);
    END;
  END LOOP;

  UPDATE tenant_invoices SET status = 'overdue' WHERE status = 'pending' AND due_date < p_target_date;

  FOR v_subscription IN SELECT DISTINCT tenant_id FROM tenant_invoices WHERE status = 'overdue' LOOP
    BEGIN PERFORM public.apply_dunning_policy(v_subscription.tenant_id); v_dunning_applied := v_dunning_applied + 1;
    EXCEPTION WHEN OTHERS THEN v_errors := v_errors || jsonb_build_object('tenant_id', v_subscription.tenant_id, 'error', SQLERRM); END;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'target_date', p_target_date, 'invoices_created', v_invoices_created, 
    'dunning_applied', v_dunning_applied, 'errors', v_errors);
END;
$$;

-- RPC: get_tenant_billing_summary
CREATE OR REPLACE FUNCTION public.get_tenant_billing_summary(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile tenant_billing_profiles%ROWTYPE;
  v_subscription tenant_subscriptions%ROWTYPE;
  v_invoices JSONB;
  v_plan JSONB;
BEGIN
  SELECT * INTO v_profile FROM tenant_billing_profiles WHERE tenant_id = p_tenant_id;
  SELECT * INTO v_subscription FROM tenant_subscriptions WHERE tenant_id = p_tenant_id AND status NOT IN ('canceled') 
    ORDER BY created_at DESC LIMIT 1;

  IF v_subscription.partner_plan_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', id, 'name', name, 'monthly_price', monthly_price, 'slug', slug)
    INTO v_plan FROM partner_plans WHERE id = v_subscription.partner_plan_id;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(i.*) ORDER BY i.due_date DESC), '[]'::JSONB)
  INTO v_invoices FROM (
    SELECT id, amount, due_date, status, period_start, period_end, provider_payment_url, paid_at
    FROM tenant_invoices WHERE tenant_id = p_tenant_id ORDER BY due_date DESC LIMIT 12) i;

  RETURN jsonb_build_object(
    'profile', CASE WHEN v_profile.id IS NOT NULL THEN row_to_json(v_profile) ELSE NULL END,
    'subscription', CASE WHEN v_subscription.id IS NOT NULL THEN jsonb_build_object(
      'id', v_subscription.id, 'status', v_subscription.status, 'billing_mode', v_subscription.billing_mode,
      'trial_ends_at', v_subscription.trial_ends_at, 'current_period_start', v_subscription.current_period_start,
      'current_period_end', v_subscription.current_period_end, 'monthly_amount', v_subscription.monthly_amount
    ) ELSE NULL END,
    'plan', v_plan, 'invoices', v_invoices);
END;
$$;

-- RPC: handle_billing_event_from_ssot
CREATE OR REPLACE FUNCTION public.handle_billing_event_from_ssot(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event payment_events%ROWTYPE;
  v_invoice tenant_invoices%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_event FROM payment_events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Event not found'); END IF;

  SELECT * INTO v_invoice FROM tenant_invoices WHERE provider_payment_id = v_event.provider_payment_id;
  IF NOT FOUND AND v_event.external_reference LIKE 'inv_%' THEN
    SELECT * INTO v_invoice FROM tenant_invoices WHERE id::TEXT = REPLACE(v_event.external_reference, 'inv_', '');
  END IF;

  IF NOT FOUND THEN RETURN jsonb_build_object('success', true, 'message', 'No matching invoice', 'event_id', p_event_id); END IF;

  SELECT public.sync_invoice_status_from_ssot(v_invoice.provider_payment_id) INTO v_result;

  IF v_event.event_type IN ('PAYMENT_OVERDUE', 'PAYMENT_CHARGEBACK_REQUESTED') THEN
    PERFORM public.apply_dunning_policy(v_invoice.tenant_id);
  END IF;

  IF v_event.event_type IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') THEN
    PERFORM public.reactivate_on_payment(v_invoice.tenant_id, v_invoice.id);
  END IF;

  RETURN jsonb_build_object('success', true, 'event_id', p_event_id, 'invoice_id', v_invoice.id, 'sync_result', v_result);
END;
$$;

-- RPC: link_invoice_to_provider
CREATE OR REPLACE FUNCTION public.link_invoice_to_provider(
  p_invoice_id UUID,
  p_provider_payment_id TEXT,
  p_provider_payment_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenant_invoices SET 
    provider_payment_id = p_provider_payment_id,
    provider_payment_url = COALESCE(p_provider_payment_url, provider_payment_url),
    updated_at = now()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id, 'provider_payment_id', p_provider_payment_id);
END;
$$;

-- RPC: get_billing_ops_overview (Super Admin)
CREATE OR REPLACE FUNCTION public.get_billing_ops_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overdue_count INT;
  v_pending_count INT;
  v_chargeback_count INT;
  v_total_overdue_amount NUMERIC;
  v_recent_invoices JSONB;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_overdue_count, v_total_overdue_amount
  FROM tenant_invoices WHERE status = 'overdue';

  SELECT COUNT(*) INTO v_pending_count FROM tenant_invoices WHERE status = 'pending';
  SELECT COUNT(*) INTO v_chargeback_count FROM tenant_invoices WHERE status = 'chargeback';

  SELECT COALESCE(jsonb_agg(row_to_json(r.*)), '[]'::JSONB) INTO v_recent_invoices FROM (
    SELECT ti.id, ti.tenant_id, t.name as tenant_name, ti.amount, ti.due_date, ti.status, ti.partner_id
    FROM tenant_invoices ti
    JOIN tenants t ON t.id = ti.tenant_id
    WHERE ti.status IN ('overdue', 'chargeback')
    ORDER BY ti.due_date ASC LIMIT 50
  ) r;

  RETURN jsonb_build_object(
    'overdue_count', v_overdue_count,
    'pending_count', v_pending_count,
    'chargeback_count', v_chargeback_count,
    'total_overdue_amount', v_total_overdue_amount,
    'recent_problem_invoices', v_recent_invoices
  );
END;
$$;