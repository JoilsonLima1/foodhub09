-- Table to link addon modules to subscription plans (free modules per plan)
CREATE TABLE public.plan_addon_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  addon_module_id UUID NOT NULL REFERENCES public.addon_modules(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(plan_id, addon_module_id)
);

-- Enable RLS
ALTER TABLE public.plan_addon_modules ENABLE ROW LEVEL SECURITY;

-- Super admins can manage plan addon modules
CREATE POLICY "Super admins can manage plan addon modules"
ON public.plan_addon_modules
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone authenticated can view plan addon modules (needed for landing page/signup)
CREATE POLICY "Authenticated users can view plan addon modules"
ON public.plan_addon_modules
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add columns to tenant_addon_subscriptions to track pricing
ALTER TABLE public.tenant_addon_subscriptions 
ADD COLUMN IF NOT EXISTS price_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add comment to explain source values
COMMENT ON COLUMN public.tenant_addon_subscriptions.source IS 'Source of subscription: manual, plan_included, purchase';

-- Function to get plan included addons
CREATE OR REPLACE FUNCTION public.get_plan_addon_modules(p_plan_id UUID)
RETURNS TABLE(
  addon_module_id UUID,
  addon_name TEXT,
  addon_slug TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    am.id as addon_module_id,
    am.name as addon_name,
    am.slug as addon_slug
  FROM public.plan_addon_modules pam
  JOIN public.addon_modules am ON am.id = pam.addon_module_id
  WHERE pam.plan_id = p_plan_id
    AND am.is_active = true
$$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plan_addon_modules_plan_id ON public.plan_addon_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_addon_modules_addon_id ON public.plan_addon_modules(addon_module_id);
CREATE INDEX IF NOT EXISTS idx_tenant_addon_source ON public.tenant_addon_subscriptions(source);