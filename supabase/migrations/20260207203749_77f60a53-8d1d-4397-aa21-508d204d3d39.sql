-- ============================================================
-- PHASE 14 & 15: SECURITY, COMPLIANCE, GROWTH & MONETIZATION
-- 100% ADDITIVE - NO CHANGES TO EXISTING STRUCTURES
-- ============================================================

-- ============================================================
-- PHASE 14: SECURITY & COMPLIANCE
-- ============================================================

-- 14.1) Access Audit Log - Track all access events
CREATE TABLE IF NOT EXISTS public.access_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id text,
    action text NOT NULL, -- login, logout, token_refresh, access_denied
    resource text, -- route or resource accessed
    resource_id text,
    ip_address inet,
    user_agent text,
    geo_country text,
    geo_city text,
    success boolean DEFAULT true,
    failure_reason text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_audit_user ON public.access_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_audit_action ON public.access_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_audit_ip ON public.access_audit_log(ip_address);

-- 14.2) Sensitive Actions Log - Critical operations audit
CREATE TABLE IF NOT EXISTS public.sensitive_actions_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role text,
    partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    action text NOT NULL, -- plan_change, cancellation, payout, reprocess, config_change
    target_type text, -- tenant, partner, invoice, payout, etc.
    target_id text,
    reason text,
    old_value jsonb,
    new_value jsonb,
    ip_address inet,
    user_agent text,
    risk_level text DEFAULT 'low', -- low, medium, high, critical
    requires_review boolean DEFAULT false,
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensitive_actions_actor ON public.sensitive_actions_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensitive_actions_target ON public.sensitive_actions_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_actions_risk ON public.sensitive_actions_log(risk_level, requires_review);

-- 14.3) LGPD / Compliance Tables
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    requester_email text NOT NULL,
    request_type text NOT NULL, -- export, deletion, access, rectification
    status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, rejected
    submitted_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    processed_by uuid REFERENCES auth.users(id),
    data_export_url text,
    rejection_reason text,
    notes text,
    deadline_at timestamptz NOT NULL DEFAULT (now() + interval '15 days'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsr_tenant ON public.data_subject_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON public.data_subject_requests(status, deadline_at);

CREATE TABLE IF NOT EXISTS public.consent_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    consent_type text NOT NULL, -- terms, privacy, marketing, analytics, cookies
    consent_version text NOT NULL,
    granted boolean NOT NULL,
    granted_at timestamptz,
    revoked_at timestamptz,
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON public.consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_tenant ON public.consent_records(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consent_unique ON public.consent_records(user_id, tenant_id, consent_type, consent_version);

CREATE TABLE IF NOT EXISTS public.data_retention_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL UNIQUE,
    retention_days integer NOT NULL DEFAULT 365,
    archive_before_delete boolean DEFAULT true,
    is_active boolean DEFAULT true,
    last_applied_at timestamptz,
    records_archived integer DEFAULT 0,
    records_deleted integer DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default retention policies
INSERT INTO public.data_retention_policies (table_name, retention_days, archive_before_delete) VALUES
    ('access_audit_log', 90, true),
    ('sensitive_actions_log', 730, true), -- 2 years for sensitive actions
    ('dispatcher_messages', 180, true),
    ('call_logs', 365, true),
    ('notification_outbox', 90, true)
ON CONFLICT (table_name) DO NOTHING;

-- ============================================================
-- PHASE 15: GROWTH & MONETIZATION
-- ============================================================

-- 15.1) Trial Events & Metrics
CREATE TABLE IF NOT EXISTS public.trial_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    event_type text NOT NULL, -- started, feature_used, limit_hit, warning_sent, converted, expired
    feature_key text,
    usage_count integer,
    limit_value integer,
    percentage_used numeric(5,2),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_events_tenant ON public.trial_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trial_events_type ON public.trial_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.trial_conversion_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL UNIQUE,
    trials_started integer DEFAULT 0,
    trials_active integer DEFAULT 0,
    trials_converted integer DEFAULT 0,
    trials_expired integer DEFAULT 0,
    conversion_rate numeric(5,2),
    avg_days_to_convert numeric(5,2),
    top_conversion_features text[],
    top_churn_reasons text[],
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 15.2) Upsell & Cross-sell
CREATE TABLE IF NOT EXISTS public.upsell_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    trigger_type text NOT NULL, -- usage_threshold, feature_attempt, time_based, behavior
    trigger_condition jsonb NOT NULL, -- e.g., {"metric": "orders", "operator": ">=", "value": 100}
    target_audience text DEFAULT 'all', -- all, trial, starter, professional
    offer_type text NOT NULL, -- upgrade, addon, coupon, custom
    offer_config jsonb NOT NULL, -- e.g., {"plan": "professional", "discount": 20}
    display_type text DEFAULT 'modal', -- modal, banner, notification, email
    priority integer DEFAULT 0,
    max_displays integer DEFAULT 3,
    cooldown_hours integer DEFAULT 24,
    is_active boolean DEFAULT true,
    start_date date,
    end_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.upsell_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    rule_id uuid REFERENCES public.upsell_rules(id) ON DELETE SET NULL,
    event_type text NOT NULL, -- triggered, displayed, dismissed, clicked, converted
    offer_type text,
    offer_value jsonb,
    display_context text,
    user_response text,
    conversion_value numeric(15,2),
    dedupe_key text UNIQUE, -- prevent duplicate events
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upsell_events_tenant ON public.upsell_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upsell_events_rule ON public.upsell_events(rule_id, event_type);

-- 15.3) Soft Limits & Enforcement
CREATE TABLE IF NOT EXISTS public.usage_soft_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    feature_key text NOT NULL, -- orders, products, users, storage_mb, api_calls
    warn_threshold numeric(5,2) DEFAULT 80, -- percentage
    soft_limit_threshold numeric(5,2) DEFAULT 100,
    hard_limit_threshold numeric(5,2) DEFAULT 120,
    warn_action text DEFAULT 'notify', -- notify, banner, email
    soft_limit_action text DEFAULT 'throttle', -- throttle, degrade, warn
    hard_limit_action text DEFAULT 'block', -- block, queue, reject
    grace_period_hours integer DEFAULT 24,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.usage_enforcement_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    feature_key text NOT NULL,
    current_usage numeric(15,2),
    limit_value numeric(15,2),
    percentage_used numeric(5,2),
    enforcement_level text NOT NULL, -- warn, soft_limit, hard_limit
    action_taken text NOT NULL,
    user_notified boolean DEFAULT false,
    grace_expires_at timestamptz,
    resolved_at timestamptz,
    resolved_by text, -- upgrade, addon, manual, grace
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enforcement_tenant ON public.usage_enforcement_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enforcement_level ON public.usage_enforcement_log(enforcement_level, resolved_at);

-- 15.4) Business KPIs
CREATE TABLE IF NOT EXISTS public.business_kpis_daily (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL UNIQUE,
    -- Tenant metrics
    total_tenants integer DEFAULT 0,
    active_tenants integer DEFAULT 0,
    new_tenants integer DEFAULT 0,
    churned_tenants integer DEFAULT 0,
    -- Revenue metrics
    mrr numeric(15,2) DEFAULT 0,
    arr numeric(15,2) DEFAULT 0,
    new_mrr numeric(15,2) DEFAULT 0,
    churned_mrr numeric(15,2) DEFAULT 0,
    expansion_mrr numeric(15,2) DEFAULT 0,
    -- Trial metrics
    trials_active integer DEFAULT 0,
    trial_to_paid_rate numeric(5,2),
    -- Delinquency
    past_due_count integer DEFAULT 0,
    past_due_amount numeric(15,2) DEFAULT 0,
    -- Usage
    total_orders integer DEFAULT 0,
    total_gmv numeric(15,2) DEFAULT 0,
    -- Add-ons
    addon_attach_rate numeric(5,2),
    addon_revenue numeric(15,2) DEFAULT 0,
    -- LTV/CAC
    avg_ltv numeric(15,2),
    avg_arpu numeric(15,2),
    -- Partner metrics
    total_partners integer DEFAULT 0,
    active_partners integer DEFAULT 0,
    partner_revenue numeric(15,2) DEFAULT 0,
    -- Calculated
    net_revenue_retention numeric(5,2),
    gross_revenue_retention numeric(5,2),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversion_funnel_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL,
    funnel_stage text NOT NULL, -- visit, signup, trial_start, activation, conversion, expansion
    count integer DEFAULT 0,
    conversion_from_previous numeric(5,2),
    avg_time_to_next_stage interval,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(date, funnel_stage)
);

-- 15.5) Self-Service Actions
CREATE TABLE IF NOT EXISTS public.self_service_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_key text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    actor_types text[] NOT NULL, -- ['tenant', 'partner', 'user']
    requires_confirmation boolean DEFAULT true,
    confirmation_type text DEFAULT 'checkbox', -- checkbox, password, code
    cooldown_minutes integer DEFAULT 0,
    is_active boolean DEFAULT true,
    help_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.self_service_actions (action_key, name, description, actor_types) VALUES
    ('change_plan', 'Alterar Plano', 'Upgrade ou downgrade do plano atual', ARRAY['tenant']),
    ('cancel_subscription', 'Cancelar Assinatura', 'Cancelar assinatura ativa', ARRAY['tenant']),
    ('export_data', 'Exportar Dados', 'Exportar todos os dados da organização', ARRAY['tenant']),
    ('regenerate_api_key', 'Regenerar API Key', 'Gerar nova chave de API', ARRAY['tenant']),
    ('invite_user', 'Convidar Usuário', 'Adicionar novo usuário à organização', ARRAY['tenant', 'partner']),
    ('remove_user', 'Remover Usuário', 'Remover usuário da organização', ARRAY['tenant', 'partner']),
    ('apply_coupon', 'Aplicar Cupom', 'Aplicar cupom de desconto', ARRAY['tenant']),
    ('request_invoice', 'Solicitar Fatura', 'Gerar segunda via de fatura', ARRAY['tenant']),
    ('update_billing', 'Atualizar Faturamento', 'Alterar dados de cobrança', ARRAY['tenant']),
    ('pause_subscription', 'Pausar Assinatura', 'Pausar temporariamente a assinatura', ARRAY['tenant'])
ON CONFLICT (action_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.guided_flows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_key text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    target_audience text[] DEFAULT ARRAY['all'], -- trial, new, returning, churning
    steps jsonb NOT NULL, -- [{step: 1, title, description, action, completed_when}]
    completion_reward text, -- coupon, feature_unlock, badge
    reward_config jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.guided_flows (flow_key, name, description, target_audience, steps) VALUES
    ('onboarding', 'Onboarding Inicial', 'Primeiros passos na plataforma', ARRAY['new', 'trial'], 
     '[{"step":1,"title":"Complete seu perfil","action":"profile"},{"step":2,"title":"Adicione seu primeiro produto","action":"product"},{"step":3,"title":"Configure pagamentos","action":"payment"},{"step":4,"title":"Faça sua primeira venda","action":"order"}]'::jsonb),
    ('upgrade_journey', 'Jornada de Upgrade', 'Descoberta de recursos premium', ARRAY['trial', 'starter'],
     '[{"step":1,"title":"Explore relatórios avançados","action":"reports"},{"step":2,"title":"Configure integrações","action":"integrations"},{"step":3,"title":"Ative módulos extras","action":"addons"}]'::jsonb)
ON CONFLICT (flow_key) DO NOTHING;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_conversion_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_soft_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_enforcement_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_kpis_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_funnel_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_service_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_flows ENABLE ROW LEVEL SECURITY;

-- Super Admin full access to all security/compliance tables
CREATE POLICY "Super admin full access to access_audit_log"
ON public.access_audit_log FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access to sensitive_actions_log"
ON public.sensitive_actions_log FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages data_subject_requests"
ON public.data_subject_requests FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users view own consent_records"
ON public.consent_records FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admin manages consent_records"
ON public.consent_records FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages retention_policies"
ON public.data_retention_policies FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access to trial_events"
ON public.trial_events FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages trial_conversion_metrics"
ON public.trial_conversion_metrics FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages upsell_rules"
ON public.upsell_rules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access to upsell_events"
ON public.upsell_events FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages usage_soft_limits"
ON public.usage_soft_limits FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin full access to usage_enforcement_log"
ON public.usage_enforcement_log FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages business_kpis_daily"
ON public.business_kpis_daily FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages conversion_funnel_metrics"
ON public.conversion_funnel_metrics FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can read self_service_actions"
ON public.self_service_actions FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Super admin manages self_service_actions"
ON public.self_service_actions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can read guided_flows"
ON public.guided_flows FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Super admin manages guided_flows"
ON public.guided_flows FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- SECURITY RPCs
-- ============================================================

-- Validate actor permission (deep security check)
CREATE OR REPLACE FUNCTION public.validate_actor_permission(
    p_actor_id uuid,
    p_action text,
    p_scope text DEFAULT NULL
)
RETURNS TABLE(allowed boolean, reason text, risk_level text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_roles text[];
    v_is_super_admin boolean;
    v_is_partner_user boolean;
    v_partner_id uuid;
BEGIN
    -- Get actor roles
    SELECT array_agg(role::text) INTO v_roles
    FROM public.user_roles
    WHERE user_id = p_actor_id;
    
    v_is_super_admin := 'super_admin' = ANY(v_roles);
    
    -- Check if partner user
    SELECT pu.partner_id INTO v_partner_id
    FROM public.partner_users pu
    WHERE pu.user_id = p_actor_id AND pu.is_active = true;
    
    v_is_partner_user := v_partner_id IS NOT NULL;
    
    -- Super admin has all permissions
    IF v_is_super_admin THEN
        RETURN QUERY SELECT true, 'super_admin_access'::text, 'low'::text;
        RETURN;
    END IF;
    
    -- Action-specific checks
    CASE p_action
        WHEN 'payout_approve' THEN
            IF v_is_super_admin THEN
                RETURN QUERY SELECT true, 'authorized'::text, 'high'::text;
            ELSE
                RETURN QUERY SELECT false, 'requires_super_admin'::text, 'critical'::text;
            END IF;
        
        WHEN 'config_change' THEN
            IF v_is_super_admin THEN
                RETURN QUERY SELECT true, 'authorized'::text, 'high'::text;
            ELSE
                RETURN QUERY SELECT false, 'requires_super_admin'::text, 'high'::text;
            END IF;
        
        WHEN 'tenant_delete' THEN
            IF v_is_super_admin OR v_is_partner_user THEN
                RETURN QUERY SELECT true, 'authorized'::text, 'critical'::text;
            ELSE
                RETURN QUERY SELECT false, 'requires_elevated_access'::text, 'critical'::text;
            END IF;
        
        WHEN 'data_export' THEN
            RETURN QUERY SELECT true, 'self_service_allowed'::text, 'medium'::text;
        
        ELSE
            -- Default: allow for authenticated users
            IF p_actor_id IS NOT NULL THEN
                RETURN QUERY SELECT true, 'default_allow'::text, 'low'::text;
            ELSE
                RETURN QUERY SELECT false, 'unauthenticated'::text, 'critical'::text;
            END IF;
    END CASE;
    
    RETURN;
END;
$$;

-- Assert partner scope (verify actor belongs to partner)
CREATE OR REPLACE FUNCTION public.assert_partner_scope(
    p_actor_id uuid,
    p_partner_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_super_admin boolean;
    v_actor_partner_id uuid;
BEGIN
    -- Super admin bypasses scope
    SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = p_actor_id AND role = 'super_admin')
    INTO v_is_super_admin;
    
    IF v_is_super_admin THEN
        RETURN true;
    END IF;
    
    -- Check if actor belongs to the partner
    SELECT partner_id INTO v_actor_partner_id
    FROM public.partner_users
    WHERE user_id = p_actor_id AND is_active = true;
    
    RETURN v_actor_partner_id = p_partner_id;
END;
$$;

-- Assert tenant scope (verify actor can access tenant)
CREATE OR REPLACE FUNCTION public.assert_tenant_scope(
    p_actor_id uuid,
    p_tenant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_super_admin boolean;
    v_is_tenant_user boolean;
    v_is_partner_of_tenant boolean;
BEGIN
    -- Super admin bypasses scope
    SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = p_actor_id AND role = 'super_admin')
    INTO v_is_super_admin;
    
    IF v_is_super_admin THEN
        RETURN true;
    END IF;
    
    -- Check if actor is a user of this tenant
    SELECT EXISTS(
        SELECT 1 FROM public.tenant_users
        WHERE user_id = p_actor_id AND tenant_id = p_tenant_id AND is_active = true
    ) INTO v_is_tenant_user;
    
    IF v_is_tenant_user THEN
        RETURN true;
    END IF;
    
    -- Check if actor is a partner admin of the tenant's partner
    SELECT EXISTS(
        SELECT 1 
        FROM public.partner_users pu
        JOIN public.tenants t ON t.partner_id = pu.partner_id
        WHERE pu.user_id = p_actor_id 
          AND pu.is_active = true 
          AND t.id = p_tenant_id
    ) INTO v_is_partner_of_tenant;
    
    RETURN v_is_partner_of_tenant;
END;
$$;

-- Log sensitive action
CREATE OR REPLACE FUNCTION public.log_sensitive_action(
    p_action text,
    p_target_type text,
    p_target_id text,
    p_reason text DEFAULT NULL,
    p_old_value jsonb DEFAULT NULL,
    p_new_value jsonb DEFAULT NULL,
    p_risk_level text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id uuid;
    v_actor_role text;
    v_log_id uuid;
BEGIN
    v_actor_id := auth.uid();
    
    -- Get actor role
    SELECT role::text INTO v_actor_role
    FROM public.user_roles
    WHERE user_id = v_actor_id
    LIMIT 1;
    
    INSERT INTO public.sensitive_actions_log (
        actor_id, actor_role, action, target_type, target_id,
        reason, old_value, new_value, risk_level,
        requires_review
    ) VALUES (
        v_actor_id, v_actor_role, p_action, p_target_type, p_target_id,
        p_reason, p_old_value, p_new_value, p_risk_level,
        p_risk_level IN ('high', 'critical')
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- LGPD: Request data export
CREATE OR REPLACE FUNCTION public.request_data_export(
    p_tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_id uuid;
    v_tenant_email text;
BEGIN
    -- Get tenant email
    SELECT email INTO v_tenant_email
    FROM public.tenants
    WHERE id = p_tenant_id;
    
    IF v_tenant_email IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;
    
    -- Check for existing pending request
    IF EXISTS(
        SELECT 1 FROM public.data_subject_requests
        WHERE tenant_id = p_tenant_id
          AND request_type = 'export'
          AND status IN ('pending', 'processing')
    ) THEN
        RAISE EXCEPTION 'Export request already in progress';
    END IF;
    
    -- Create request
    INSERT INTO public.data_subject_requests (
        tenant_id, requester_email, request_type, status
    ) VALUES (
        p_tenant_id, v_tenant_email, 'export', 'pending'
    )
    RETURNING id INTO v_request_id;
    
    -- Log sensitive action
    PERFORM public.log_sensitive_action(
        'data_export_requested', 'tenant', p_tenant_id::text,
        'LGPD data export request', NULL, NULL, 'medium'
    );
    
    RETURN v_request_id;
END;
$$;

-- LGPD: Request data deletion
CREATE OR REPLACE FUNCTION public.request_data_deletion(
    p_tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_id uuid;
    v_tenant_email text;
BEGIN
    -- Get tenant email
    SELECT email INTO v_tenant_email
    FROM public.tenants
    WHERE id = p_tenant_id;
    
    IF v_tenant_email IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;
    
    -- Check for existing pending request
    IF EXISTS(
        SELECT 1 FROM public.data_subject_requests
        WHERE tenant_id = p_tenant_id
          AND request_type = 'deletion'
          AND status IN ('pending', 'processing')
    ) THEN
        RAISE EXCEPTION 'Deletion request already in progress';
    END IF;
    
    -- Create request
    INSERT INTO public.data_subject_requests (
        tenant_id, requester_email, request_type, status
    ) VALUES (
        p_tenant_id, v_tenant_email, 'deletion', 'pending'
    )
    RETURNING id INTO v_request_id;
    
    -- Log sensitive action
    PERFORM public.log_sensitive_action(
        'data_deletion_requested', 'tenant', p_tenant_id::text,
        'LGPD data deletion request', NULL, NULL, 'critical'
    );
    
    RETURN v_request_id;
END;
$$;

-- Apply retention policy
CREATE OR REPLACE FUNCTION public.apply_retention_policy()
RETURNS TABLE(table_name text, archived integer, deleted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_policy record;
    v_archived integer;
    v_deleted integer;
BEGIN
    FOR v_policy IN 
        SELECT * FROM public.data_retention_policies WHERE is_active = true
    LOOP
        -- For now, just return the policy info
        -- Actual archiving/deletion would be implemented per table
        table_name := v_policy.table_name;
        archived := 0;
        deleted := 0;
        
        -- Update last applied
        UPDATE public.data_retention_policies
        SET last_applied_at = now()
        WHERE id = v_policy.id;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$;

-- ============================================================
-- GROWTH RPCs
-- ============================================================

-- Record trial event
CREATE OR REPLACE FUNCTION public.record_trial_event(
    p_tenant_id uuid,
    p_event_type text,
    p_feature_key text DEFAULT NULL,
    p_usage_count integer DEFAULT NULL,
    p_limit_value integer DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_percentage numeric;
BEGIN
    -- Calculate percentage if applicable
    IF p_usage_count IS NOT NULL AND p_limit_value IS NOT NULL AND p_limit_value > 0 THEN
        v_percentage := (p_usage_count::numeric / p_limit_value::numeric) * 100;
    END IF;
    
    INSERT INTO public.trial_events (
        tenant_id, event_type, feature_key, usage_count, 
        limit_value, percentage_used, metadata
    ) VALUES (
        p_tenant_id, p_event_type, p_feature_key, p_usage_count,
        p_limit_value, v_percentage, p_metadata
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- Record upsell event (idempotent via dedupe_key)
CREATE OR REPLACE FUNCTION public.record_upsell_event(
    p_tenant_id uuid,
    p_rule_id uuid,
    p_event_type text,
    p_offer_type text DEFAULT NULL,
    p_offer_value jsonb DEFAULT NULL,
    p_dedupe_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_actual_dedupe text;
BEGIN
    -- Generate dedupe key if not provided
    v_actual_dedupe := COALESCE(p_dedupe_key, p_tenant_id::text || '_' || p_rule_id::text || '_' || p_event_type || '_' || date_trunc('hour', now())::text);
    
    -- Upsert with dedupe
    INSERT INTO public.upsell_events (
        tenant_id, rule_id, event_type, offer_type, offer_value, dedupe_key
    ) VALUES (
        p_tenant_id, p_rule_id, p_event_type, p_offer_type, p_offer_value, v_actual_dedupe
    )
    ON CONFLICT (dedupe_key) DO UPDATE SET
        event_type = EXCLUDED.event_type,
        offer_value = EXCLUDED.offer_value
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- Check and enforce usage limits
CREATE OR REPLACE FUNCTION public.check_usage_limit(
    p_tenant_id uuid,
    p_feature_key text,
    p_current_usage numeric
)
RETURNS TABLE(
    enforcement_level text,
    action_required text,
    percentage_used numeric,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_id uuid;
    v_limit record;
    v_percentage numeric;
BEGIN
    -- Get tenant's plan
    SELECT plan_id INTO v_plan_id
    FROM public.tenant_subscriptions
    WHERE tenant_id = p_tenant_id AND status = 'active'
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RETURN QUERY SELECT 'none'::text, 'none'::text, 0::numeric, 'No active plan'::text;
        RETURN;
    END IF;
    
    -- Get soft limit config
    SELECT * INTO v_limit
    FROM public.usage_soft_limits
    WHERE plan_id = v_plan_id AND feature_key = p_feature_key AND is_active = true;
    
    IF v_limit IS NULL THEN
        RETURN QUERY SELECT 'none'::text, 'none'::text, 0::numeric, 'No limits configured'::text;
        RETURN;
    END IF;
    
    -- Calculate percentage (assuming limit_value would come from plan features)
    -- For now, use 100 as a placeholder base
    v_percentage := p_current_usage;
    
    -- Determine enforcement level
    IF v_percentage >= v_limit.hard_limit_threshold THEN
        RETURN QUERY SELECT 
            'hard_limit'::text, 
            v_limit.hard_limit_action,
            v_percentage,
            'Limite máximo atingido. Ação bloqueada.'::text;
    ELSIF v_percentage >= v_limit.soft_limit_threshold THEN
        RETURN QUERY SELECT 
            'soft_limit'::text, 
            v_limit.soft_limit_action,
            v_percentage,
            'Limite atingido. Considere fazer upgrade.'::text;
    ELSIF v_percentage >= v_limit.warn_threshold THEN
        RETURN QUERY SELECT 
            'warning'::text, 
            v_limit.warn_action,
            v_percentage,
            'Você está próximo do limite.'::text;
    ELSE
        RETURN QUERY SELECT 'none'::text, 'none'::text, v_percentage, 'Uso normal'::text;
    END IF;
    
    RETURN;
END;
$$;

-- Calculate daily business KPIs
CREATE OR REPLACE FUNCTION public.calculate_daily_kpis(
    p_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kpi_id uuid;
    v_total_tenants integer;
    v_active_tenants integer;
    v_mrr numeric;
    v_trials_active integer;
    v_past_due_count integer;
    v_past_due_amount numeric;
    v_total_partners integer;
BEGIN
    -- Count tenants
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    INTO v_total_tenants, v_active_tenants
    FROM public.tenants;
    
    -- Calculate MRR from active subscriptions
    SELECT COALESCE(SUM(sp.price), 0)
    INTO v_mrr
    FROM public.tenant_subscriptions ts
    JOIN public.subscription_plans sp ON sp.id = ts.plan_id
    WHERE ts.status = 'active';
    
    -- Count trials
    SELECT COUNT(*)
    INTO v_trials_active
    FROM public.tenant_subscriptions
    WHERE status = 'trialing';
    
    -- Past due
    SELECT COUNT(*), COALESCE(SUM(ti.total), 0)
    INTO v_past_due_count, v_past_due_amount
    FROM public.tenant_invoices ti
    WHERE ti.status = 'overdue';
    
    -- Partners
    SELECT COUNT(*) FILTER (WHERE is_active = true)
    INTO v_total_partners
    FROM public.partners;
    
    -- Upsert KPI record
    INSERT INTO public.business_kpis_daily (
        date, total_tenants, active_tenants, mrr, arr,
        trials_active, past_due_count, past_due_amount,
        total_partners, active_partners
    ) VALUES (
        p_date, v_total_tenants, v_active_tenants, v_mrr, v_mrr * 12,
        v_trials_active, v_past_due_count, v_past_due_amount,
        v_total_partners, v_total_partners
    )
    ON CONFLICT (date) DO UPDATE SET
        total_tenants = EXCLUDED.total_tenants,
        active_tenants = EXCLUDED.active_tenants,
        mrr = EXCLUDED.mrr,
        arr = EXCLUDED.arr,
        trials_active = EXCLUDED.trials_active,
        past_due_count = EXCLUDED.past_due_count,
        past_due_amount = EXCLUDED.past_due_amount,
        total_partners = EXCLUDED.total_partners,
        active_partners = EXCLUDED.active_partners
    RETURNING id INTO v_kpi_id;
    
    RETURN v_kpi_id;
END;
$$;