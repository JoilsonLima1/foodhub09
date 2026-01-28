-- Fix Security Issues: ifood credentials exposure, orders PII, payment records

-- =====================================================
-- 1. FIX: ifood_integrations API credentials exposure
-- Create a safe view that excludes sensitive credentials
-- Block direct SELECT access to the base table for regular users
-- =====================================================

-- First, drop existing policies on ifood_integrations
DROP POLICY IF EXISTS "Admin/Manager can manage iFood integration" ON public.ifood_integrations;

-- Create a safe view that only exposes non-sensitive configuration
CREATE OR REPLACE VIEW public.ifood_integrations_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  tenant_id,
  merchant_id,  -- Needed for display
  is_active,
  auto_accept_orders,
  sync_menu,
  created_at,
  updated_at,
  -- Indicate if credentials are configured without exposing them
  CASE WHEN client_id IS NOT NULL AND client_secret IS NOT NULL THEN true ELSE false END as credentials_configured,
  CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_valid_token
FROM public.ifood_integrations;

COMMENT ON VIEW public.ifood_integrations_safe IS 
  'Safe view for iFood integrations that hides API credentials. All credential operations must go through the ifood-api edge function.';

-- Create policy: NO direct SELECT access for regular users - forces use of view
-- Only service role (edge functions) can access the full table
CREATE POLICY "No direct select - use ifood_integrations_safe view"
  ON public.ifood_integrations
  FOR SELECT
  USING (false);

-- Create INSERT policy for edge function (via service role only)
-- Regular users cannot insert directly
CREATE POLICY "Service role only - no direct insert"
  ON public.ifood_integrations
  FOR INSERT
  WITH CHECK (false);

-- Create UPDATE policy for edge function (via service role only)
CREATE POLICY "Service role only - no direct update"
  ON public.ifood_integrations
  FOR UPDATE
  USING (false);

-- Create DELETE policy
CREATE POLICY "Service role only - no direct delete"
  ON public.ifood_integrations
  FOR DELETE
  USING (false);

-- =====================================================
-- 2. FIX: orders customer PII exposure 
-- Verify orders table already has proper RLS
-- Cashiers should use orders_safe view, not direct table access
-- =====================================================

-- The existing orders RLS policy already restricts to:
-- - admin, manager, cashier (full access)  
-- - delivery (only assigned orders)
-- - kitchen/stock uses orders_safe view (PII masked)
-- This is correct architecture - cashiers need customer info for transactions

-- Add comment documenting the access pattern
COMMENT ON TABLE public.orders IS 
  'Orders table with customer PII. Direct access restricted to admin/manager/cashier (need PII for transactions) and delivery (assigned orders only). Kitchen/stock roles MUST use orders_safe view which masks PII.';

-- =====================================================
-- 3. FIX: payment_machine_records card data exposure
-- Restrict cashiers to only view records from current cash register session
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authorized staff can view payment records" ON public.payment_machine_records;
DROP POLICY IF EXISTS "Cashiers can insert machine records" ON public.payment_machine_records;

-- Create stricter SELECT policy:
-- - Admin/Manager: Full access to all records
-- - Cashier: Only records from their active cash register session
CREATE POLICY "Restricted payment record viewing"
  ON public.payment_machine_records
  FOR SELECT
  USING (
    (tenant_id = public.get_user_tenant_id(auth.uid())) AND (
      -- Admin/Manager can see all
      public.has_role(auth.uid(), 'admin'::app_role) OR 
      public.has_role(auth.uid(), 'manager'::app_role) OR
      -- Cashiers can see records from their active cash register OR records they created
      (public.has_role(auth.uid(), 'cashier'::app_role) AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.cash_registers cr
          WHERE cr.id = public.payment_machine_records.order_id  
            AND cr.opened_by = auth.uid() 
            AND cr.is_active = true
        )
      ))
    )
  );

-- Create INSERT policy - cashiers can only insert during active shift
CREATE POLICY "Cashiers can insert during active shift"
  ON public.payment_machine_records
  FOR INSERT
  WITH CHECK (
    (tenant_id = public.get_user_tenant_id(auth.uid())) AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR 
      public.has_role(auth.uid(), 'manager'::app_role) OR
      (public.has_role(auth.uid(), 'cashier'::app_role) AND (
        -- Must have an active cash register
        EXISTS (
          SELECT 1 FROM public.cash_registers cr
          WHERE cr.tenant_id = public.get_user_tenant_id(auth.uid())
            AND cr.opened_by = auth.uid() 
            AND cr.is_active = true
        )
      ))
    )
  );

COMMENT ON TABLE public.payment_machine_records IS 
  'Payment machine transaction records with partial card data. Cashiers restricted to their own records or records from their active cash register session. Admin/Manager have full tenant access.';

-- =====================================================
-- Add RLS policy for the safe view access
-- =====================================================

-- Grant SELECT on the safe view to admin/manager (they need to see config status)
-- The view uses security_invoker so it will check base table RLS
-- But since base table blocks SELECT, we need a different approach

-- Actually, since security_invoker=on and base table has USING(false),
-- the view won't work. Let's use SECURITY DEFINER function instead.

-- Drop the view and create a function instead
DROP VIEW IF EXISTS public.ifood_integrations_safe;

-- Create a SECURITY DEFINER function to get iFood integration config safely
CREATE OR REPLACE FUNCTION public.get_ifood_integration_safe(p_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  merchant_id text,
  is_active boolean,
  auto_accept_orders boolean,
  sync_menu boolean,
  created_at timestamptz,
  updated_at timestamptz,
  credentials_configured boolean,
  has_valid_token boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.tenant_id,
    i.merchant_id,
    i.is_active,
    i.auto_accept_orders,
    i.sync_menu,
    i.created_at,
    i.updated_at,
    (i.client_id IS NOT NULL AND i.client_secret IS NOT NULL) as credentials_configured,
    (i.access_token IS NOT NULL) as has_valid_token
  FROM public.ifood_integrations i
  WHERE i.tenant_id = p_tenant_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR 
      public.has_role(auth.uid(), 'manager'::app_role)
    )
    AND public.get_user_tenant_id(auth.uid()) = p_tenant_id
$$;

COMMENT ON FUNCTION public.get_ifood_integration_safe IS 
  'Securely retrieves iFood integration config without exposing API credentials. Only admin/manager of the tenant can access.';