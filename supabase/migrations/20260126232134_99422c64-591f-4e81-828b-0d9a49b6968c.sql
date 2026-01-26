-- Tabela para armazenar histórico de previsões para comparação futura
CREATE TABLE public.sales_forecast_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  target_date DATE NOT NULL,
  predicted_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC DEFAULT NULL,
  confidence NUMERIC DEFAULT 0.7,
  accuracy_percentage NUMERIC DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, forecast_date, target_date)
);

-- Enable RLS
ALTER TABLE public.sales_forecast_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their tenant's forecast history
CREATE POLICY "Users can view tenant forecast history"
ON public.sales_forecast_history
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Policy: System can insert forecast history
CREATE POLICY "Staff can insert forecast history"
ON public.sales_forecast_history
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Policy: System can update forecast history (for adding actual values)
CREATE POLICY "Staff can update forecast history"
ON public.sales_forecast_history
FOR UPDATE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Index for efficient queries
CREATE INDEX idx_forecast_history_tenant_target ON public.sales_forecast_history(tenant_id, target_date);
CREATE INDEX idx_forecast_history_tenant_forecast ON public.sales_forecast_history(tenant_id, forecast_date);

-- Trigger for updated_at
CREATE TRIGGER update_forecast_history_updated_at
BEFORE UPDATE ON public.sales_forecast_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();