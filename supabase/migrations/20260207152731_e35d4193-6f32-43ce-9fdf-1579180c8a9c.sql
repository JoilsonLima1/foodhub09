
-- Corrigir view para usar SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS public.partner_overdue_invoices;

CREATE VIEW public.partner_overdue_invoices 
WITH (security_invoker = true)
AS
SELECT 
  pi.*,
  pp.name as partner_name,
  t.name as tenant_name,
  ppl.name as plan_name,
  CURRENT_DATE - pi.due_date as days_overdue
FROM public.partner_invoices pi
JOIN public.partners pp ON pp.id = pi.partner_id
JOIN public.tenants t ON t.id = pi.tenant_id
LEFT JOIN public.partner_plans ppl ON ppl.id = pi.partner_plan_id
WHERE pi.status IN ('pending', 'overdue')
AND pi.due_date < CURRENT_DATE;
