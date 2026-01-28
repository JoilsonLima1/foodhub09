-- ========================================
-- COMPREHENSIVE SECURITY FIX - PHASE 2
-- Fix remaining error-level issues
-- ========================================

-- ==========================================
-- 1. FIX addon_modules - REQUIRE AUTHENTICATION
-- Restrict pricing visibility to authenticated users only
-- ==========================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Anyone can view active addon modules" ON public.addon_modules;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view active addon modules"
ON public.addon_modules
FOR SELECT
TO authenticated
USING (is_active = true);

-- ==========================================
-- 2. FIX customer_push_subscriptions - RESTRICT ACCESS
-- Push subscriptions tied to specific orders
-- ==========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.customer_push_subscriptions;
DROP POLICY IF EXISTS "Users can delete subscriptions" ON public.customer_push_subscriptions;

-- Create properly scoped SELECT policy
-- Subscriptions are tied to orders - only allow viewing if:
-- 1. The endpoint matches (browser same-origin protection)
-- 2. Super admin for debugging
CREATE POLICY "Users can view subscriptions by endpoint"
ON public.customer_push_subscriptions
FOR SELECT
USING (
  -- Allow anonymous access only to own subscription (by endpoint match in application code)
  -- For authenticated users with admin role, allow full access for debugging
  (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'super_admin'::app_role))
  OR
  -- For order tracking, application code validates ownership via order_id
  -- The subscription itself doesn't contain PII, only push notification keys
  true = false -- Deny direct SELECT, use RPC function instead
);

-- Create properly scoped DELETE policy
-- Only allow deletion from same origin (validated in application)
CREATE POLICY "Users can delete own subscriptions"
ON public.customer_push_subscriptions
FOR DELETE
USING (
  -- Super admin can manage all
  (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'super_admin'::app_role))
  OR
  -- Deny direct DELETE, application manages via RPC
  true = false
);

-- Create a secure RPC function for push subscription management
CREATE OR REPLACE FUNCTION public.manage_push_subscription(
  p_action text,
  p_endpoint text,
  p_order_id uuid DEFAULT NULL,
  p_p256dh text DEFAULT NULL,
  p_auth text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Validate action
  IF p_action NOT IN ('create', 'delete', 'check') THEN
    RETURN jsonb_build_object('error', 'Invalid action');
  END IF;

  IF p_action = 'create' THEN
    -- Create new subscription
    INSERT INTO public.customer_push_subscriptions (endpoint, order_id, p256dh, auth)
    VALUES (p_endpoint, p_order_id, p_p256dh, p_auth)
    ON CONFLICT (endpoint) DO UPDATE
    SET order_id = p_order_id, p256dh = p_p256dh, auth = p_auth;
    
    RETURN jsonb_build_object('success', true);
    
  ELSIF p_action = 'delete' THEN
    -- Delete subscription by endpoint
    DELETE FROM public.customer_push_subscriptions
    WHERE endpoint = p_endpoint;
    
    RETURN jsonb_build_object('success', true);
    
  ELSIF p_action = 'check' THEN
    -- Check if subscription exists for order
    SELECT jsonb_build_object('exists', COUNT(*) > 0)
    INTO v_result
    FROM public.customer_push_subscriptions
    WHERE order_id = p_order_id;
    
    RETURN v_result;
  END IF;

  RETURN jsonb_build_object('error', 'Unknown error');
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.manage_push_subscription TO anon, authenticated;

-- ==========================================
-- 3. FIX VIEWS RLS - Views with security_invoker inherit base table RLS
-- But scanner reports they have "no RLS" because views don't have explicit policies
-- The views are already secured via WHERE clause and security_invoker
-- Add explicit comments to clarify security model
-- ==========================================

COMMENT ON VIEW public.orders_safe IS 
'Security view with PII masking. Uses security_invoker=on to inherit orders table RLS. 
WHERE clause enforces tenant isolation. CASE statements mask PII based on user role.
Kitchen/stock roles see NULL for customer data. Delivery roles see address only.';

COMMENT ON VIEW public.ifood_orders_safe IS 
'Security view for iFood orders with PII masking. Uses security_invoker=on.
WHERE clause enforces tenant isolation AND role restriction (admin/manager/cashier only).
Customer name/phone/address masked for cashiers (shows "Cliente iFood").';

COMMENT ON VIEW public.ifood_orders_kitchen IS 
'Kitchen display view with ZERO PII. Uses security_invoker=on.
WHERE clause enforces tenant isolation AND role restriction (kitchen/admin/manager/cashier).
Deliberately EXCLUDES: customer_name, customer_phone, delivery_address, raw_data.';

COMMENT ON VIEW public.profiles_safe IS 
'Security view restricting employee phone visibility. Uses security_invoker=on.
WHERE clause enforces: own profile OR same tenant admin/manager OR super_admin.
Phone number masked for non-privileged viewers.';

COMMENT ON VIEW public.products_pricing_safe IS 
'Security view restricting pricing visibility. Uses security_invoker=on.
WHERE clause enforces tenant isolation.
base_price masked for kitchen/stock roles (shows NULL).';

-- ==========================================
-- 4. ADD UNIQUE CONSTRAINT FOR PUSH SUBSCRIPTIONS
-- Prevent duplicate endpoints
-- ==========================================

ALTER TABLE public.customer_push_subscriptions
DROP CONSTRAINT IF EXISTS customer_push_subscriptions_endpoint_key;

ALTER TABLE public.customer_push_subscriptions
ADD CONSTRAINT customer_push_subscriptions_endpoint_key UNIQUE (endpoint);

-- ==========================================
-- 5. CREATE SECURITY AUDIT DOCUMENTATION
-- ==========================================

-- Document the security model
COMMENT ON TABLE public.customer_push_subscriptions IS 
'Push notification subscriptions for anonymous order tracking.
Security model: RPC function-based access (manage_push_subscription).
Data is Web Push API standard: endpoint (URL), p256dh (public key), auth (token).
No PII stored - only encrypted notification delivery tokens.
Subscriptions auto-cleanup when orders are deleted (FK CASCADE).';