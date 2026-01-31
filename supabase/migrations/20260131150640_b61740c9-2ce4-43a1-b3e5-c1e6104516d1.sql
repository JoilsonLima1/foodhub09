-- Create audit table for tenant module changes
CREATE TABLE IF NOT EXISTS public.tenant_module_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  addon_module_id UUID NOT NULL REFERENCES public.addon_modules(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'install', 'uninstall', 'activate', 'deactivate', 'sync', 'update'
  source TEXT, -- 'manual', 'plan_included', 'purchase', 'auto_sync'
  grant_type TEXT, -- 'gift', 'manual_free', 'manual_paid', 'purchase'
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.tenant_module_audit ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access audit logs
CREATE POLICY "super_admin_audit_access" ON public.tenant_module_audit
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Add index for efficient querying
CREATE INDEX idx_tenant_module_audit_tenant ON public.tenant_module_audit(tenant_id);
CREATE INDEX idx_tenant_module_audit_module ON public.tenant_module_audit(addon_module_id);
CREATE INDEX idx_tenant_module_audit_performed_at ON public.tenant_module_audit(performed_at DESC);

-- Add 'manual_free' and 'manual_paid' as valid sources in tenant_addon_subscriptions
-- Update the source check to include new values
ALTER TABLE public.tenant_addon_subscriptions 
  DROP CONSTRAINT IF EXISTS tenant_addon_subscriptions_source_check;

-- Add grant_type column to track how module was granted
ALTER TABLE public.tenant_addon_subscriptions 
  ADD COLUMN IF NOT EXISTS grant_type TEXT DEFAULT 'purchase';

-- Add admin_notes for manual operations
ALTER TABLE public.tenant_addon_subscriptions 
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add installed_by to track who installed the module
ALTER TABLE public.tenant_addon_subscriptions 
  ADD COLUMN IF NOT EXISTS installed_by UUID REFERENCES auth.users(id);

-- Create function to log module changes
CREATE OR REPLACE FUNCTION public.log_module_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tenant_module_audit (
      tenant_id,
      addon_module_id,
      action,
      source,
      grant_type,
      new_status,
      notes,
      performed_by,
      metadata
    ) VALUES (
      NEW.tenant_id,
      NEW.addon_module_id,
      'install',
      NEW.source,
      NEW.grant_type,
      NEW.status,
      NEW.admin_notes,
      auth.uid(),
      jsonb_build_object(
        'is_free', NEW.is_free,
        'price_paid', NEW.price_paid
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.tenant_module_audit (
        tenant_id,
        addon_module_id,
        action,
        source,
        previous_status,
        new_status,
        notes,
        performed_by,
        metadata
      ) VALUES (
        NEW.tenant_id,
        NEW.addon_module_id,
        CASE 
          WHEN NEW.status = 'cancelled' THEN 'uninstall'
          WHEN NEW.status = 'active' AND OLD.status != 'active' THEN 'activate'
          WHEN NEW.status = 'suspended' THEN 'deactivate'
          ELSE 'update'
        END,
        NEW.source,
        OLD.status,
        NEW.status,
        NEW.admin_notes,
        auth.uid(),
        jsonb_build_object(
          'is_free', NEW.is_free,
          'price_paid', NEW.price_paid
        )
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.tenant_module_audit (
      tenant_id,
      addon_module_id,
      action,
      previous_status,
      performed_by,
      metadata
    ) VALUES (
      OLD.tenant_id,
      OLD.addon_module_id,
      'uninstall',
      OLD.status,
      auth.uid(),
      jsonb_build_object(
        'deleted', true,
        'was_free', OLD.is_free
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS trigger_log_module_change ON public.tenant_addon_subscriptions;
CREATE TRIGGER trigger_log_module_change
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_addon_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_module_change();

-- Function to force sync modules for a tenant (repair provisioning)
CREATE OR REPLACE FUNCTION public.force_sync_tenant_modules(p_tenant_id UUID)
RETURNS TABLE (
  action_taken TEXT,
  module_name TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_module RECORD;
  v_sync_count INT := 0;
BEGIN
  -- Get tenant's current plan
  SELECT subscription_plan_id INTO v_plan_id
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- Return results for each module processed
  FOR v_module IN 
    SELECT 
      am.id as module_id,
      am.name as module_name,
      pam.addon_module_id IS NOT NULL as in_plan,
      tas.id as subscription_id,
      tas.status as current_status,
      tas.source as current_source
    FROM public.addon_modules am
    LEFT JOIN public.plan_addon_modules pam 
      ON pam.addon_module_id = am.id AND pam.plan_id = v_plan_id
    LEFT JOIN public.tenant_addon_subscriptions tas 
      ON tas.addon_module_id = am.id AND tas.tenant_id = p_tenant_id
    WHERE am.is_active = true
  LOOP
    -- Module should be active (in plan) but isn't provisioned
    IF v_module.in_plan AND v_module.subscription_id IS NULL THEN
      INSERT INTO public.tenant_addon_subscriptions (
        tenant_id, addon_module_id, status, source, is_free, price_paid, grant_type, admin_notes
      ) VALUES (
        p_tenant_id, v_module.module_id, 'active', 'plan_included', true, 0, 'gift', 'Auto-sync from plan'
      );
      action_taken := 'ADDED';
      module_name := v_module.module_name;
      details := 'Added missing plan module';
      RETURN NEXT;
      
    -- Module is provisioned as plan_included but no longer in plan
    ELSIF NOT v_module.in_plan AND v_module.subscription_id IS NOT NULL 
          AND v_module.current_source = 'plan_included' 
          AND v_module.current_status IN ('active', 'trial') THEN
      UPDATE public.tenant_addon_subscriptions 
      SET status = 'cancelled', cancelled_at = now(), admin_notes = 'Removed from plan during sync'
      WHERE id = v_module.subscription_id;
      action_taken := 'REMOVED';
      module_name := v_module.module_name;
      details := 'Removed - no longer in plan';
      RETURN NEXT;
      
    -- Module is in plan but was cancelled - reactivate it
    ELSIF v_module.in_plan AND v_module.subscription_id IS NOT NULL 
          AND v_module.current_status = 'cancelled'
          AND v_module.current_source = 'plan_included' THEN
      UPDATE public.tenant_addon_subscriptions 
      SET status = 'active', cancelled_at = NULL, admin_notes = 'Reactivated during sync'
      WHERE id = v_module.subscription_id;
      action_taken := 'REACTIVATED';
      module_name := v_module.module_name;
      details := 'Reactivated plan module';
      RETURN NEXT;
    END IF;
  END LOOP;

  -- Log the sync action
  INSERT INTO public.tenant_module_audit (
    tenant_id,
    addon_module_id,
    action,
    source,
    notes,
    performed_by
  ) 
  SELECT 
    p_tenant_id,
    (SELECT id FROM public.addon_modules LIMIT 1), -- placeholder
    'sync',
    'auto_sync',
    'Force sync performed by admin',
    auth.uid();

  RETURN;
END;
$$;