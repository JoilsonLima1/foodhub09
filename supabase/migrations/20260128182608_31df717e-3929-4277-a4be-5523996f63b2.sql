-- Fix payment_machine_records SELECT policy - incorrect join condition
-- The previous policy had: cr.id = payment_machine_records.order_id (comparing cash_register.id with order_id - WRONG)
-- The correct policy should allow cashiers to view:
-- 1. Records they created (created_by = auth.uid())
-- 2. Records from cash registers they opened (while the register is still active)

DROP POLICY IF EXISTS "Restricted payment record viewing" ON public.payment_machine_records;

-- Recreate with correct logic
CREATE POLICY "Restricted payment record viewing"
  ON public.payment_machine_records
  FOR SELECT
  USING (
    -- Must be within tenant
    tenant_id = get_user_tenant_id(auth.uid()) AND
    (
      -- Admins and managers can view all tenant records
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'manager'::app_role) OR
      -- Cashiers can only view:
      (
        has_role(auth.uid(), 'cashier'::app_role) AND
        (
          -- Records they personally created
          created_by = auth.uid() OR
          -- Records from their currently active cash register session
          EXISTS (
            SELECT 1 
            FROM cash_registers cr
            WHERE cr.tenant_id = get_user_tenant_id(auth.uid())
              AND cr.opened_by = auth.uid()
              AND cr.is_active = true
              -- Only see records created during their active session
              AND payment_machine_records.created_at >= cr.opened_at
          )
        )
      )
    )
  );