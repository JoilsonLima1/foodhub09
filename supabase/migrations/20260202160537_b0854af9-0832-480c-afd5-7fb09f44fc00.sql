-- =========================================================
-- BACKFILL: Ensure all profiles have store_id linked to HQ
-- =========================================================

-- 1) For profiles without store_id, link to the headquarters store of their tenant
UPDATE public.profiles p
SET store_id = s.id
FROM public.stores s
WHERE p.tenant_id = s.tenant_id
  AND s.is_headquarters = true
  AND p.store_id IS NULL
  AND p.tenant_id IS NOT NULL;

-- 2) For tenants without any stores, create the headquarters store
-- This is handled by ensure_headquarters_store() function, but let's ensure it runs
DO $$
DECLARE
  v_tenant RECORD;
  v_store_id UUID;
BEGIN
  FOR v_tenant IN 
    SELECT t.id, t.name 
    FROM public.tenants t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.stores s WHERE s.tenant_id = t.id
    )
  LOOP
    INSERT INTO public.stores (tenant_id, name, code, is_headquarters, is_active, type)
    VALUES (v_tenant.id, COALESCE(v_tenant.name, 'Matriz'), 'MATRIZ', true, true, 'headquarters')
    RETURNING id INTO v_store_id;
    
    -- Link profiles to new store
    UPDATE public.profiles 
    SET store_id = v_store_id 
    WHERE tenant_id = v_tenant.id AND store_id IS NULL;
    
    RAISE NOTICE 'Created HQ store for tenant %: %', v_tenant.id, v_store_id;
  END LOOP;
END $$;

-- 3) Sync modules for all tenants that have a plan but missing module subscriptions
DO $$
DECLARE
  v_tenant RECORD;
BEGIN
  FOR v_tenant IN 
    SELECT t.id, t.subscription_plan_id 
    FROM public.tenants t
    WHERE t.subscription_plan_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.tenant_addon_subscriptions tas 
        WHERE tas.tenant_id = t.id AND tas.status IN ('active', 'trial')
      )
  LOOP
    PERFORM public.sync_tenant_modules_from_plan(v_tenant.id);
    RAISE NOTICE 'Synced modules for tenant %', v_tenant.id;
  END LOOP;
END $$;

-- 4) Ensure the trigger to auto-link profile to store exists
DROP TRIGGER IF EXISTS trigger_auto_link_profile_to_store ON public.profiles;
CREATE TRIGGER trigger_auto_link_profile_to_store
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_profile_to_store();

-- 5) Ensure all profiles now have store_id (second pass after HQ creation)
UPDATE public.profiles p
SET store_id = s.id
FROM public.stores s
WHERE p.tenant_id = s.tenant_id
  AND s.is_headquarters = true
  AND p.store_id IS NULL
  AND p.tenant_id IS NOT NULL;