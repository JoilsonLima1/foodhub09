
-- Fix RLS policies on printer_routes: use p.user_id instead of p.id
DROP POLICY IF EXISTS "Users can view their tenant printer routes" ON public.printer_routes;
DROP POLICY IF EXISTS "Users can insert printer routes for their tenant" ON public.printer_routes;
DROP POLICY IF EXISTS "Users can update their tenant printer routes" ON public.printer_routes;
DROP POLICY IF EXISTS "Users can delete their tenant printer routes" ON public.printer_routes;

CREATE POLICY "Users can view their tenant printer routes"
ON public.printer_routes FOR SELECT
USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.user_id = auth.uid()));

CREATE POLICY "Users can insert printer routes for their tenant"
ON public.printer_routes FOR INSERT
WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.user_id = auth.uid()));

CREATE POLICY "Users can update their tenant printer routes"
ON public.printer_routes FOR UPDATE
USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant printer routes"
ON public.printer_routes FOR DELETE
USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.user_id = auth.uid()));
