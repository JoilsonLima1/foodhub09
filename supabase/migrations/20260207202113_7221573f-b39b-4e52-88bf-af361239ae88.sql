-- ============================================================
-- PHASE 13: WHITE-LABEL NOTIFICATION SYSTEM
-- 100% ADDITIVE - NO CHANGES TO EXISTING TABLES
-- ============================================================

-- ==================== ENUMS ====================

CREATE TYPE public.notification_channel AS ENUM ('email', 'whatsapp', 'inapp', 'sms');
CREATE TYPE public.notification_outbox_status AS ENUM ('queued', 'sending', 'sent', 'failed', 'dead');
CREATE TYPE public.notification_delivery_status AS ENUM ('accepted', 'delivered', 'bounced', 'complained', 'failed');

-- ==================== TABLE: notification_templates ====================

CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL DEFAULT 'email',
  template_key TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_template UNIQUE(partner_id, channel, template_key)
);

-- Indexes
CREATE INDEX idx_notification_templates_partner ON public.notification_templates(partner_id);
CREATE INDEX idx_notification_templates_key ON public.notification_templates(template_key);
CREATE INDEX idx_notification_templates_active ON public.notification_templates(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can manage their own templates"
  ON public.notification_templates FOR ALL
  USING (
    partner_id IS NULL OR
    partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Super admins can manage all templates"
  ON public.notification_templates FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'super_admin')
  );

-- ==================== TABLE: notification_outbox (queue) ====================

CREATE TABLE public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.tenant_invoices(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.payment_events(id) ON DELETE SET NULL,
  channel public.notification_channel NOT NULL DEFAULT 'email',
  template_key TEXT NOT NULL,
  to_address TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.notification_outbox_status NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_error TEXT,
  correlation_id UUID DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_dedupe UNIQUE(dedupe_key)
);

-- Indexes for queue processing
CREATE INDEX idx_notification_outbox_status ON public.notification_outbox(status);
CREATE INDEX idx_notification_outbox_next_attempt ON public.notification_outbox(next_attempt_at) WHERE status IN ('queued', 'failed');
CREATE INDEX idx_notification_outbox_tenant ON public.notification_outbox(tenant_id);
CREATE INDEX idx_notification_outbox_partner ON public.notification_outbox(partner_id);
CREATE INDEX idx_notification_outbox_correlation ON public.notification_outbox(correlation_id);
CREATE INDEX idx_notification_outbox_dead ON public.notification_outbox(status) WHERE status = 'dead';

-- RLS
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all outbox"
  ON public.notification_outbox FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'super_admin')
  );

CREATE POLICY "Partners can view their tenant notifications"
  ON public.notification_outbox FOR SELECT
  USING (
    partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- ==================== TABLE: notification_delivery (tracking) ====================

CREATE TABLE public.notification_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id UUID NOT NULL REFERENCES public.notification_outbox(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status public.notification_delivery_status NOT NULL DEFAULT 'accepted',
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notification_delivery_outbox ON public.notification_delivery(outbox_id);
CREATE INDEX idx_notification_delivery_provider ON public.notification_delivery(provider);
CREATE INDEX idx_notification_delivery_status ON public.notification_delivery(status);
CREATE INDEX idx_notification_delivery_message_id ON public.notification_delivery(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- RLS
ALTER TABLE public.notification_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all deliveries"
  ON public.notification_delivery FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'super_admin')
  );

-- ==================== TRIGGER: updated_at ====================

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_outbox_updated_at
  BEFORE UPDATE ON public.notification_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_delivery_updated_at
  BEFORE UPDATE ON public.notification_delivery
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== RPC: upsert_notification_template ====================

CREATE OR REPLACE FUNCTION public.upsert_notification_template(
  p_partner_id UUID,
  p_channel public.notification_channel,
  p_template_key TEXT,
  p_subject TEXT,
  p_body TEXT,
  p_is_active BOOLEAN DEFAULT true,
  p_variables JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notification_templates (partner_id, channel, template_key, subject, body, is_active, variables)
  VALUES (p_partner_id, p_channel, p_template_key, p_subject, p_body, p_is_active, p_variables)
  ON CONFLICT ON CONSTRAINT uq_notification_template
  DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    is_active = EXCLUDED.is_active,
    variables = EXCLUDED.variables,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ==================== RPC: resolve_notification_template ====================

CREATE OR REPLACE FUNCTION public.resolve_notification_template(
  p_partner_id UUID,
  p_channel public.notification_channel,
  p_template_key TEXT
)
RETURNS TABLE(
  id UUID,
  partner_id UUID,
  channel public.notification_channel,
  template_key TEXT,
  subject TEXT,
  body TEXT,
  variables JSONB,
  is_default BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try partner-specific template first
  RETURN QUERY
  SELECT 
    t.id, t.partner_id, t.channel, t.template_key, t.subject, t.body, t.variables, false AS is_default
  FROM public.notification_templates t
  WHERE t.partner_id = p_partner_id
    AND t.channel = p_channel
    AND t.template_key = p_template_key
    AND t.is_active = true
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- Fallback to platform default (partner_id IS NULL)
  RETURN QUERY
  SELECT 
    t.id, t.partner_id, t.channel, t.template_key, t.subject, t.body, t.variables, true AS is_default
  FROM public.notification_templates t
  WHERE t.partner_id IS NULL
    AND t.channel = p_channel
    AND t.template_key = p_template_key
    AND t.is_active = true
  LIMIT 1;
END;
$$;

-- ==================== RPC: enqueue_notification (IDEMPOTENT) ====================

CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_tenant_id UUID,
  p_partner_id UUID,
  p_channel public.notification_channel,
  p_template_key TEXT,
  p_to_address TEXT,
  p_payload JSONB,
  p_invoice_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_dedupe_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedupe TEXT;
  v_id UUID;
BEGIN
  -- Generate dedupe key if not provided
  v_dedupe := COALESCE(p_dedupe_key, 
    md5(COALESCE(p_tenant_id::text,'') || p_template_key || p_to_address || COALESCE(p_invoice_id::text,'') || COALESCE(p_event_id::text,''))
  );
  
  -- Idempotent insert
  INSERT INTO public.notification_outbox (
    tenant_id, partner_id, invoice_id, event_id, channel, template_key, 
    to_address, payload, dedupe_key
  )
  VALUES (
    p_tenant_id, p_partner_id, p_invoice_id, p_event_id, p_channel, p_template_key,
    p_to_address, p_payload, v_dedupe
  )
  ON CONFLICT ON CONSTRAINT uq_notification_dedupe DO NOTHING
  RETURNING id INTO v_id;
  
  -- Return existing ID if duplicate
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.notification_outbox WHERE dedupe_key = v_dedupe;
  END IF;
  
  RETURN v_id;
END;
$$;

-- ==================== RPC: process_notification_outbox ====================

CREATE OR REPLACE FUNCTION public.process_notification_outbox(
  p_batch_size INT DEFAULT 50
)
RETURNS TABLE(
  processed INT,
  sent INT,
  failed INT,
  dead INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_sent INT := 0;
  v_failed INT := 0;
  v_dead INT := 0;
  v_record RECORD;
  v_template RECORD;
BEGIN
  -- Lock and fetch queued items ready for processing
  FOR v_record IN
    SELECT o.*
    FROM public.notification_outbox o
    WHERE o.status IN ('queued', 'failed')
      AND o.next_attempt_at <= now()
      AND o.attempts < o.max_attempts
    ORDER BY o.next_attempt_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;
    
    -- Resolve template
    SELECT * INTO v_template
    FROM public.resolve_notification_template(v_record.partner_id, v_record.channel, v_record.template_key);
    
    IF v_template.id IS NULL THEN
      -- No template found - mark as failed
      UPDATE public.notification_outbox
      SET status = 'failed', 
          last_error = 'Template not found: ' || v_record.template_key,
          attempts = attempts + 1,
          next_attempt_at = now() + (POWER(2, attempts + 1) * INTERVAL '1 minute')
      WHERE id = v_record.id;
      
      v_failed := v_failed + 1;
      CONTINUE;
    END IF;
    
    -- Mock send (real provider integration in edge function)
    -- Mark as sending first
    UPDATE public.notification_outbox
    SET status = 'sending', attempts = attempts + 1, updated_at = now()
    WHERE id = v_record.id;
    
    -- For MVP: mark as sent and create delivery record
    UPDATE public.notification_outbox
    SET status = 'sent', updated_at = now()
    WHERE id = v_record.id;
    
    INSERT INTO public.notification_delivery (outbox_id, provider, provider_message_id, status, raw)
    VALUES (v_record.id, 'mock', 'mock-' || gen_random_uuid()::text, 'delivered', 
      jsonb_build_object('template_id', v_template.id, 'sent_at', now(), 'mock', true));
    
    v_sent := v_sent + 1;
  END LOOP;
  
  -- Mark dead letters (exceeded max attempts)
  UPDATE public.notification_outbox
  SET status = 'dead', updated_at = now()
  WHERE status = 'failed' 
    AND attempts >= max_attempts
    AND updated_at < now() - INTERVAL '1 minute';
  
  GET DIAGNOSTICS v_dead = ROW_COUNT;
  
  RETURN QUERY SELECT v_processed, v_sent, v_failed, v_dead;
END;
$$;

-- ==================== RPC: mark_notification_delivery ====================

CREATE OR REPLACE FUNCTION public.mark_notification_delivery(
  p_outbox_id UUID,
  p_provider TEXT,
  p_provider_message_id TEXT,
  p_status public.notification_delivery_status,
  p_raw JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notification_delivery (outbox_id, provider, provider_message_id, status, raw)
  VALUES (p_outbox_id, p_provider, p_provider_message_id, p_status, p_raw)
  RETURNING id INTO v_id;
  
  -- Update outbox status based on delivery
  UPDATE public.notification_outbox
  SET status = CASE 
    WHEN p_status IN ('delivered', 'accepted') THEN 'sent'::public.notification_outbox_status
    WHEN p_status IN ('bounced', 'complained', 'failed') THEN 'failed'::public.notification_outbox_status
    ELSE status
  END,
  updated_at = now()
  WHERE id = p_outbox_id;
  
  RETURN v_id;
END;
$$;

-- ==================== RPC: preview_notification ====================

CREATE OR REPLACE FUNCTION public.preview_notification(
  p_partner_id UUID,
  p_channel public.notification_channel,
  p_template_key TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  template_id UUID,
  is_default BOOLEAN,
  subject TEXT,
  body TEXT,
  rendered_subject TEXT,
  rendered_body TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_subject TEXT;
  v_body TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Resolve template
  SELECT * INTO v_template
  FROM public.resolve_notification_template(p_partner_id, p_channel, p_template_key);
  
  IF v_template.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Simple variable replacement {{key}} -> value
  v_subject := v_template.subject;
  v_body := v_template.body;
  
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_payload)
  LOOP
    v_subject := REPLACE(v_subject, '{{' || v_key || '}}', v_value);
    v_body := REPLACE(v_body, '{{' || v_key || '}}', v_value);
  END LOOP;
  
  RETURN QUERY SELECT 
    v_template.id,
    v_template.is_default,
    v_template.subject,
    v_template.body,
    v_subject,
    v_body;
END;
$$;

-- ==================== RPC: emit_billing_notifications ====================

CREATE OR REPLACE FUNCTION public.emit_billing_notifications(
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '1 day',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  enqueued INT,
  skipped INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enqueued INT := 0;
  v_skipped INT := 0;
  v_invoice RECORD;
  v_result UUID;
  v_email TEXT;
BEGIN
  -- Process invoices created in date range
  FOR v_invoice IN
    SELECT 
      i.id, i.tenant_id, i.status, i.total, i.due_date, i.created_at,
      t.partner_id,
      s.company_name AS tenant_name
    FROM public.tenant_invoices i
    JOIN public.tenants t ON t.id = i.tenant_id
    LEFT JOIN public.subscribers s ON s.tenant_id = t.id
    WHERE i.created_at::date BETWEEN p_date_from AND p_date_to
      AND i.status IN ('pending', 'overdue')
  LOOP
    -- Get tenant admin email
    SELECT email INTO v_email 
    FROM auth.users u 
    JOIN public.subscribers sub ON sub.tenant_id = v_invoice.tenant_id
    WHERE u.id = sub.id
    LIMIT 1;
    
    IF v_email IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Determine template key based on status
    IF v_invoice.status = 'overdue' THEN
      -- Overdue notification
      SELECT public.enqueue_notification(
        v_invoice.tenant_id,
        v_invoice.partner_id,
        'email'::public.notification_channel,
        'invoice_overdue',
        v_email,
        jsonb_build_object(
          'invoice_id', v_invoice.id,
          'tenant_name', COALESCE(v_invoice.tenant_name, 'Cliente'),
          'total', v_invoice.total,
          'due_date', v_invoice.due_date
        ),
        v_invoice.id,
        NULL,
        'invoice_overdue_' || v_invoice.id::text
      ) INTO v_result;
    ELSE
      -- Invoice created notification
      SELECT public.enqueue_notification(
        v_invoice.tenant_id,
        v_invoice.partner_id,
        'email'::public.notification_channel,
        'invoice_created',
        v_email,
        jsonb_build_object(
          'invoice_id', v_invoice.id,
          'tenant_name', COALESCE(v_invoice.tenant_name, 'Cliente'),
          'total', v_invoice.total,
          'due_date', v_invoice.due_date
        ),
        v_invoice.id,
        NULL,
        'invoice_created_' || v_invoice.id::text
      ) INTO v_result;
    END IF;
    
    IF v_result IS NOT NULL THEN
      v_enqueued := v_enqueued + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_enqueued, v_skipped;
END;
$$;

-- ==================== RPC: requeue_dead_notification ====================

CREATE OR REPLACE FUNCTION public.requeue_dead_notification(
  p_outbox_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notification_outbox
  SET status = 'queued',
      attempts = 0,
      next_attempt_at = now(),
      last_error = NULL,
      updated_at = now()
  WHERE id = p_outbox_id
    AND status = 'dead';
  
  RETURN FOUND;
END;
$$;

-- ==================== DEFAULT TEMPLATES (Platform) ====================

INSERT INTO public.notification_templates (partner_id, channel, template_key, subject, body, variables) VALUES
(NULL, 'email', 'invoice_created', 'Sua fatura foi gerada - {{tenant_name}}', 
  '<h1>Olá, {{tenant_name}}!</h1><p>Sua fatura no valor de <strong>R$ {{total}}</strong> foi gerada.</p><p>Vencimento: {{due_date}}</p><p>Acesse seu painel para visualizar e pagar.</p>',
  '["tenant_name", "total", "due_date", "invoice_id"]'::jsonb),

(NULL, 'email', 'invoice_overdue', 'Fatura em atraso - Ação necessária', 
  '<h1>Atenção, {{tenant_name}}!</h1><p>Sua fatura no valor de <strong>R$ {{total}}</strong> está <strong>vencida</strong> desde {{due_date}}.</p><p>Regularize para evitar suspensão do serviço.</p>',
  '["tenant_name", "total", "due_date", "invoice_id"]'::jsonb),

(NULL, 'email', 'dunning_warning', 'Aviso: Suspensão iminente - {{tenant_name}}', 
  '<h1>Último aviso, {{tenant_name}}</h1><p>Sua conta será suspensa em breve devido a faturas não pagas.</p><p>Total pendente: <strong>R$ {{total}}</strong></p><p>Regularize imediatamente.</p>',
  '["tenant_name", "total", "days_overdue"]'::jsonb),

(NULL, 'email', 'subscription_suspended', 'Conta suspensa - {{tenant_name}}', 
  '<h1>{{tenant_name}}, sua conta foi suspensa</h1><p>Devido a faturas não pagas, seu acesso foi temporariamente suspenso.</p><p>Regularize os pagamentos para reativar.</p>',
  '["tenant_name", "total_due"]'::jsonb),

(NULL, 'email', 'subscription_reactivated', 'Conta reativada - {{tenant_name}}', 
  '<h1>Bem-vindo de volta, {{tenant_name}}!</h1><p>Seu pagamento foi confirmado e sua conta foi reativada com sucesso.</p><p>Obrigado por continuar conosco!</p>',
  '["tenant_name"]'::jsonb),

(NULL, 'email', 'payment_confirmed', 'Pagamento confirmado - R$ {{amount}}', 
  '<h1>Pagamento recebido!</h1><p>Olá, {{tenant_name}}.</p><p>Confirmamos o recebimento de <strong>R$ {{amount}}</strong>.</p><p>Obrigado!</p>',
  '["tenant_name", "amount", "payment_date"]'::jsonb),

(NULL, 'email', 'addon_subscribed', 'Módulo ativado: {{addon_name}}', 
  '<h1>{{addon_name}} ativado!</h1><p>Olá, {{tenant_name}}.</p><p>O módulo <strong>{{addon_name}}</strong> foi ativado na sua conta.</p><p>Valor mensal: R$ {{price}}</p>',
  '["tenant_name", "addon_name", "price"]'::jsonb),

(NULL, 'email', 'addon_cancelled', 'Módulo cancelado: {{addon_name}}', 
  '<h1>Módulo cancelado</h1><p>Olá, {{tenant_name}}.</p><p>O módulo <strong>{{addon_name}}</strong> foi cancelado e será removido ao final do período.</p>',
  '["tenant_name", "addon_name"]'::jsonb),

(NULL, 'email', 'coupon_applied', 'Cupom aplicado: {{coupon_code}}', 
  '<h1>Desconto aplicado!</h1><p>Olá, {{tenant_name}}.</p><p>O cupom <strong>{{coupon_code}}</strong> foi aplicado com sucesso.</p><p>Desconto: {{discount_description}}</p>',
  '["tenant_name", "coupon_code", "discount_description"]'::jsonb),

(NULL, 'email', 'chargeback_alert', 'ALERTA: Chargeback recebido', 
  '<h1>Chargeback detectado</h1><p>Uma disputa foi aberta para o pagamento de <strong>R$ {{amount}}</strong>.</p><p>Motivo: {{reason}}</p><p>Ação imediata necessária.</p>',
  '["tenant_name", "amount", "reason"]'::jsonb)

ON CONFLICT ON CONSTRAINT uq_notification_template DO NOTHING;