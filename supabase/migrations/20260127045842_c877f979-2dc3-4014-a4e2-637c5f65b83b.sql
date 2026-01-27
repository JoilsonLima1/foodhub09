-- Drop existing policy
DROP POLICY IF EXISTS "Authorized staff can view orders" ON public.orders;

-- Create updated policy that restricts delivery staff to only their assigned orders
CREATE POLICY "Authorized staff can view orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) 
  AND (
    -- Admin, manager, and cashier can see all tenant orders
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'manager'::app_role) 
    OR public.has_role(auth.uid(), 'cashier'::app_role)
    -- Delivery staff can only see orders assigned to them
    OR (
      public.has_role(auth.uid(), 'delivery'::app_role) 
      AND EXISTS (
        SELECT 1 FROM public.deliveries d
        JOIN public.couriers c ON c.id = d.courier_id
        WHERE d.order_id = orders.id AND c.user_id = auth.uid()
      )
    )
  )
);