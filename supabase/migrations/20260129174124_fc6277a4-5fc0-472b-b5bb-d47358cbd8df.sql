
-- =====================================================
-- BILLING SETTINGS TABLE (Global configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modules_billing_mode text NOT NULL DEFAULT 'bundle' CHECK (modules_billing_mode IN ('bundle', 'separate')),
  invoice_show_breakdown boolean NOT NULL DEFAULT true,
  proration_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.billing_settings (modules_billing_mode, invoice_show_breakdown, proration_enabled)
VALUES ('bundle', true, false)
ON CONFLICT DO NOTHING;

-- RLS for billing_settings
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read billing settings"
  ON public.billing_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage billing settings"
  ON public.billing_settings FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- =====================================================
-- ADD BILLING COLUMNS TO tenant_addon_subscriptions
-- =====================================================
ALTER TABLE public.tenant_addon_subscriptions 
  ADD COLUMN IF NOT EXISTS billing_mode text DEFAULT 'bundle' CHECK (billing_mode IN ('bundle', 'separate')),
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS purchased_at timestamp with time zone;

-- Update existing source column to support plan_included properly
UPDATE public.tenant_addon_subscriptions 
SET source = 'plan_included' 
WHERE is_free = true AND source = 'manual';

-- =====================================================
-- FUNCTION TO GET PUBLIC BILLING SETTINGS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_billing_settings()
RETURNS TABLE (
  modules_billing_mode text,
  invoice_show_breakdown boolean,
  proration_enabled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bs.modules_billing_mode,
    bs.invoice_show_breakdown,
    bs.proration_enabled
  FROM public.billing_settings bs
  LIMIT 1
$$;

-- =====================================================
-- FUNCTION TO SYNC PLAN MODULES TO TENANT
-- This provisions modules included in a plan automatically
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_tenant_modules_from_plan(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_module_id uuid;
BEGIN
  -- Get tenant's current plan
  SELECT subscription_plan_id INTO v_plan_id
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF v_plan_id IS NULL THEN
    -- No plan, deactivate all plan_included modules
    UPDATE public.tenant_addon_subscriptions
    SET status = 'cancelled', cancelled_at = now(), updated_at = now()
    WHERE tenant_id = p_tenant_id 
      AND source = 'plan_included'
      AND status IN ('active', 'trial');
    RETURN;
  END IF;

  -- Get all modules included in the current plan
  FOR v_module_id IN 
    SELECT pam.addon_module_id 
    FROM public.plan_addon_modules pam
    WHERE pam.plan_id = v_plan_id
  LOOP
    -- Insert or update module for tenant
    INSERT INTO public.tenant_addon_subscriptions (
      tenant_id,
      addon_module_id,
      status,
      source,
      is_free,
      price_paid,
      started_at
    )
    VALUES (
      p_tenant_id,
      v_module_id,
      'active',
      'plan_included',
      true,
      0,
      now()
    )
    ON CONFLICT (tenant_id, addon_module_id) 
    DO UPDATE SET
      status = 'active',
      source = CASE 
        WHEN tenant_addon_subscriptions.source = 'purchase' THEN 'purchase' 
        ELSE 'plan_included' 
      END,
      is_free = CASE 
        WHEN tenant_addon_subscriptions.source = 'purchase' THEN tenant_addon_subscriptions.is_free
        ELSE true
      END,
      updated_at = now()
    WHERE tenant_addon_subscriptions.source != 'purchase'; -- Don't override purchases
  END LOOP;

  -- Deactivate plan modules that are no longer included
  UPDATE public.tenant_addon_subscriptions
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND source = 'plan_included'
    AND status IN ('active', 'trial')
    AND addon_module_id NOT IN (
      SELECT pam.addon_module_id 
      FROM public.plan_addon_modules pam
      WHERE pam.plan_id = v_plan_id
    );
END;
$$;

-- =====================================================
-- TRIGGER TO AUTO-SYNC MODULES WHEN PLAN CHANGES
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_sync_modules_on_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger if subscription_plan_id changed
  IF OLD.subscription_plan_id IS DISTINCT FROM NEW.subscription_plan_id THEN
    PERFORM public.sync_tenant_modules_from_plan(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on tenants table
DROP TRIGGER IF EXISTS sync_modules_on_plan_change ON public.tenants;
CREATE TRIGGER sync_modules_on_plan_change
  AFTER UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_modules_on_plan_change();

-- =====================================================
-- TRIGGER TO AUTO-SYNC WHEN PLAN MODULES ARE MODIFIED
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_sync_modules_on_plan_module_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_plan_id uuid;
BEGIN
  -- Get the plan_id from either NEW or OLD
  v_plan_id := COALESCE(NEW.plan_id, OLD.plan_id);
  
  -- Sync all tenants with this plan
  FOR v_tenant_id IN 
    SELECT id FROM public.tenants 
    WHERE subscription_plan_id = v_plan_id
  LOOP
    PERFORM public.sync_tenant_modules_from_plan(v_tenant_id);
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on plan_addon_modules table
DROP TRIGGER IF EXISTS sync_modules_on_plan_module_change ON public.plan_addon_modules;
CREATE TRIGGER sync_modules_on_plan_module_change
  AFTER INSERT OR DELETE OR UPDATE ON public.plan_addon_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_modules_on_plan_module_change();

-- =====================================================
-- VIEW FOR TENANT MODULES WITH COMPLETE INFO
-- =====================================================
CREATE OR REPLACE VIEW public.tenant_modules_detailed AS
SELECT 
  tas.id,
  tas.tenant_id,
  tas.addon_module_id,
  tas.status,
  tas.source,
  tas.is_free,
  tas.price_paid,
  tas.started_at,
  tas.expires_at,
  tas.next_billing_date,
  tas.billing_mode,
  tas.purchased_at,
  tas.asaas_payment_id,
  tas.asaas_subscription_id,
  tas.stripe_subscription_id,
  am.name AS module_name,
  am.slug AS module_slug,
  am.description AS module_description,
  am.monthly_price AS module_price,
  am.icon AS module_icon,
  am.category AS module_category,
  am.features AS module_features,
  t.name AS tenant_name,
  t.subscription_plan_id,
  sp.name AS plan_name
FROM public.tenant_addon_subscriptions tas
JOIN public.addon_modules am ON am.id = tas.addon_module_id
JOIN public.tenants t ON t.id = tas.tenant_id
LEFT JOIN public.subscription_plans sp ON sp.id = t.subscription_plan_id
WHERE am.is_active = true;

-- Grant access to the view
GRANT SELECT ON public.tenant_modules_detailed TO authenticated;
