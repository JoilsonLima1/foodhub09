-- Tabela para controlar notificações de metas enviadas
CREATE TABLE public.goal_notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.sales_goals(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'achieved',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipients JSONB DEFAULT '[]'::jsonb,
  UNIQUE(goal_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.goal_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notifications for their tenant
CREATE POLICY "Users can view tenant goal notifications"
ON public.goal_notifications_sent
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Policy: System can insert notifications (via service role or authenticated users)
CREATE POLICY "Staff can insert goal notifications"
ON public.goal_notifications_sent
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));