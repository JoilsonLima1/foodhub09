-- ============================================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Fixes all ERROR-level vulnerabilities found in security scan
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE - BLOCK UNAUTHENTICATED ACCESS
-- ============================================================

-- Drop existing policies that may be too permissive
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin update tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin/Manager view tenant profiles" ON public.profiles;

-- Create strict policies that require authentication
CREATE POLICY "Authenticated users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admin/Manager view tenant profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_user_tenant_id(auth.uid()) 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin update tenant profiles"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_user_tenant_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_user_tenant_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 2. ORDERS TABLE - STRENGTHEN RLS WITH EXPLICIT AUTH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Authorized staff can view orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;

-- Strict SELECT policy - requires authentication first
CREATE POLICY "Authorized staff can view orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
      OR (has_role(auth.uid(), 'delivery') AND is_assigned_courier(auth.uid(), id))
    )
  );

-- INSERT policy with explicit auth check
CREATE POLICY "Staff can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
    )
  );

-- UPDATE policy with explicit auth check
CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
      OR has_role(auth.uid(), 'kitchen')
      OR (has_role(auth.uid(), 'delivery') AND is_assigned_courier(auth.uid(), id))
    )
  );

-- ============================================================
-- 3. TENANTS TABLE - BLOCK ALL UNAUTHENTICATED ACCESS
-- ============================================================

DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;

-- Strict SELECT - authenticated users only see their tenant
CREATE POLICY "Authenticated users can view own tenant"
  ON public.tenants FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND id = get_user_tenant_id(auth.uid())
  );

-- Super admin management
CREATE POLICY "Super admins can manage all tenants"
  ON public.tenants FOR ALL
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'super_admin'))
  WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 4. PAYMENT MACHINE RECORDS - STRENGTHEN ISOLATION
-- ============================================================

DROP POLICY IF EXISTS "Restricted payment record viewing" ON public.payment_machine_records;
DROP POLICY IF EXISTS "Cashiers can insert during active shift" ON public.payment_machine_records;

-- Ultra-strict SELECT with session isolation
CREATE POLICY "Strict payment record viewing"
  ON public.payment_machine_records FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      -- Admin/Manager: full access to tenant records
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      -- Cashier: only own records OR records during their ACTIVE shift
      OR (
        has_role(auth.uid(), 'cashier')
        AND (
          created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.cash_registers cr
            WHERE cr.tenant_id = get_user_tenant_id(auth.uid())
              AND cr.opened_by = auth.uid()
              AND cr.is_active = true
              AND payment_machine_records.created_at >= cr.opened_at
              AND (cr.closed_at IS NULL OR payment_machine_records.created_at <= cr.closed_at)
          )
        )
      )
    )
  );

-- INSERT policy with strict session validation
CREATE POLICY "Cashiers can insert during active shift"
  ON public.payment_machine_records FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR (
        has_role(auth.uid(), 'cashier')
        AND EXISTS (
          SELECT 1 FROM public.cash_registers cr
          WHERE cr.tenant_id = get_user_tenant_id(auth.uid())
            AND cr.opened_by = auth.uid()
            AND cr.is_active = true
        )
      )
    )
  );

-- ============================================================
-- 5. IFOOD INTEGRATIONS - COMPLETE LOCKDOWN
-- ============================================================

-- Ensure all direct access is blocked (reinforcing existing policies)
DROP POLICY IF EXISTS "No direct select - use ifood_integrations_safe view" ON public.ifood_integrations;
DROP POLICY IF EXISTS "Service role only - no direct insert" ON public.ifood_integrations;
DROP POLICY IF EXISTS "Service role only - no direct update" ON public.ifood_integrations;
DROP POLICY IF EXISTS "Service role only - no direct delete" ON public.ifood_integrations;

-- Complete lockdown - all operations blocked for all users
CREATE POLICY "Block all direct select"
  ON public.ifood_integrations FOR SELECT
  USING (false);

CREATE POLICY "Block all direct insert"
  ON public.ifood_integrations FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block all direct update"
  ON public.ifood_integrations FOR UPDATE
  USING (false);

CREATE POLICY "Block all direct delete"
  ON public.ifood_integrations FOR DELETE
  USING (false);

-- ============================================================
-- 6. COURIERS TABLE - STRICT AUTHENTICATION
-- ============================================================

DROP POLICY IF EXISTS "Managers can manage couriers" ON public.couriers;
DROP POLICY IF EXISTS "Users can view tenant couriers" ON public.couriers;

-- Only authenticated staff can view couriers
CREATE POLICY "Authenticated staff can view tenant couriers"
  ON public.couriers FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
      OR has_role(auth.uid(), 'delivery')
    )
  );

-- Managers can manage couriers
CREATE POLICY "Managers can manage couriers"
  ON public.couriers FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (
      (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')))
      OR has_role(auth.uid(), 'super_admin')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')))
      OR has_role(auth.uid(), 'super_admin')
    )
  );

-- ============================================================
-- 7. PRODUCTS TABLE - PROTECT PRICING FROM UNAUTHENTICATED ACCESS
-- ============================================================

DROP POLICY IF EXISTS "Users can view tenant products" ON public.products;
DROP POLICY IF EXISTS "Managers can manage products" ON public.products;

-- Only authenticated users can view products (no public access to pricing)
CREATE POLICY "Authenticated users can view tenant products"
  ON public.products FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

-- Managers can manage products
CREATE POLICY "Managers can manage products"
  ON public.products FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- ============================================================
-- 8. CATEGORIES - PROTECT FROM UNAUTHENTICATED ACCESS
-- ============================================================

DROP POLICY IF EXISTS "Users can view tenant categories" ON public.categories;
DROP POLICY IF EXISTS "Managers can manage categories" ON public.categories;

CREATE POLICY "Authenticated users can view tenant categories"
  ON public.categories FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Managers can manage categories"
  ON public.categories FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- ============================================================
-- 9. DELIVERIES - STRENGTHEN AUTH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Staff can manage deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view tenant deliveries" ON public.deliveries;

CREATE POLICY "Authorized staff can view deliveries"
  ON public.deliveries FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
      OR (has_role(auth.uid(), 'delivery') AND courier_id IN (
        SELECT id FROM public.couriers WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Staff can manage deliveries"
  ON public.deliveries FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
      OR (has_role(auth.uid(), 'delivery') AND courier_id IN (
        SELECT id FROM public.couriers WHERE user_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
    )
  );

-- ============================================================
-- 10. PAYMENTS - STRICT AUTH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Users can view tenant payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON public.payments;

CREATE POLICY "Authorized staff can view payments"
  ON public.payments FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
    )
  );

CREATE POLICY "Staff can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
    )
  );

-- ============================================================
-- 11. ORDER_ITEMS - STRICT AUTH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can insert order items" ON public.order_items;

CREATE POLICY "Authorized users can view order items"
  ON public.order_items FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Staff can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

-- ============================================================
-- 12. ORDER_STATUS_HISTORY - STRICT AUTH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Users can view order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Staff can insert status history" ON public.order_status_history;

CREATE POLICY "Authorized users can view order status history"
  ON public.order_status_history FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Staff can insert status history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

-- ============================================================
-- 13. INGREDIENTS - STRICT AUTH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Users can view tenant ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Stock managers can manage ingredients" ON public.ingredients;

CREATE POLICY "Authenticated users can view tenant ingredients"
  ON public.ingredients FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Stock managers can manage ingredients"
  ON public.ingredients FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'stock')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'stock')
    )
  );

-- ============================================================
-- 14. CASH REGISTERS - STRICT AUTH CHECK
-- ============================================================

DROP POLICY IF EXISTS "Users can view tenant cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Cashiers can manage cash registers" ON public.cash_registers;

CREATE POLICY "Authenticated users can view tenant cash registers"
  ON public.cash_registers FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Cashiers can manage cash registers"
  ON public.cash_registers FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
    )
  );

-- ============================================================
-- 15. COUPONS - RESTRICT TO AUTHORIZED STAFF ONLY
-- ============================================================

DROP POLICY IF EXISTS "Users can view tenant coupons" ON public.coupons;

CREATE POLICY "Authorized staff can view tenant coupons"
  ON public.coupons FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'cashier')
    )
  );

-- ============================================================
-- END OF SECURITY HARDENING MIGRATION
-- ============================================================