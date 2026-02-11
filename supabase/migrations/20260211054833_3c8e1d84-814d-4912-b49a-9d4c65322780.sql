
-- ============================================================
-- Tabela de comissões da plataforma
-- ============================================================
CREATE TABLE public.platform_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  order_id UUID NULL,
  pix_transaction_id UUID NULL,
  gross_amount NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  commission_rate NUMERIC NULL,
  status TEXT NOT NULL DEFAULT 'calculated',
  metadata JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_commissions_tenant ON public.platform_commissions(tenant_id);
CREATE INDEX idx_platform_commissions_status ON public.platform_commissions(status);
CREATE INDEX idx_platform_commissions_created ON public.platform_commissions(created_at DESC);

ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own commissions"
  ON public.platform_commissions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Service role manages commissions"
  ON public.platform_commissions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_platform_commissions_updated_at
  BEFORE UPDATE ON public.platform_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Configurações globais de split (singleton)
-- ============================================================
CREATE TABLE public.pix_split_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_commission_percent NUMERIC NOT NULL DEFAULT 1.0,
  default_commission_fixed NUMERIC NOT NULL DEFAULT 0,
  auto_split_enabled BOOLEAN NOT NULL DEFAULT true,
  manual_fallback_enabled BOOLEAN NOT NULL DEFAULT true,
  platform_woovi_account_id TEXT NULL,
  auto_create_subaccounts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_split_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages split settings"
  ON public.pix_split_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Super admins can read split settings"
  ON public.pix_split_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

CREATE TRIGGER update_pix_split_settings_updated_at
  BEFORE UPDATE ON public.pix_split_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pix_split_settings (default_commission_percent, default_commission_fixed)
VALUES (1.0, 0);
