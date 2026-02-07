-- =====================================================
-- PHASE 10 PART 2: RPCs para Onboarding, Charge V2, Payout Jobs
-- 100% ADITIVO
-- =====================================================

-- =====================================================
-- 1. RPC: get_partner_onboarding_status
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_partner_onboarding_status(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
  v_config RECORD;
  v_partner RECORD;
BEGIN
  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id;
  IF v_partner IS NULL THEN
    RETURN jsonb_build_object('error', 'Partner not found');
  END IF;

  SELECT * INTO v_account FROM public.partner_payment_accounts WHERE partner_id = p_partner_id;
  SELECT * INTO v_config FROM public.partner_settlement_configs WHERE partner_id = p_partner_id;

  RETURN jsonb_build_object(
    'partner_id', p_partner_id,
    'partner_name', v_partner.name,
    'has_payment_account', v_account IS NOT NULL,
    'account_status', COALESCE(v_account.status, 'not_started'),
    'kyc_level', COALESCE(v_account.kyc_level, 'none'),
    'capabilities', COALESCE(v_account.capabilities, '{"split": false, "transfers": false}'::jsonb),
    'provider_account_id', v_account.provider_account_id,
    'onboarding_url', v_account.onboarding_url,
    'last_sync_at', v_account.last_sync_at,
    'settlement_mode', COALESCE(v_config.settlement_mode, 'invoice'),
    'payout_schedule', COALESCE(v_config.payout_schedule, 'weekly'),
    'payout_min_amount', COALESCE(v_config.payout_min_amount, 100.00),
    'auto_payout_enabled', COALESCE(v_config.auto_payout_enabled, false),
    'can_use_split', COALESCE((v_account.capabilities->>'split')::boolean, false) AND v_account.status = 'approved'
  );
END;
$$;

-- =====================================================
-- 2. RPC: start_partner_onboarding
-- =====================================================
CREATE OR REPLACE FUNCTION public.start_partner_onboarding(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
  v_partner RECORD;
BEGIN
  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id;
  IF v_partner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner not found');
  END IF;

  SELECT * INTO v_account FROM public.partner_payment_accounts WHERE partner_id = p_partner_id;
  
  IF v_account IS NOT NULL AND v_account.status NOT IN ('not_started', 'rejected') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Onboarding already in progress or completed',
      'status', v_account.status
    );
  END IF;

  INSERT INTO public.partner_payment_accounts (partner_id, status, provider)
  VALUES (p_partner_id, 'pending', 'asaas')
  ON CONFLICT (partner_id) DO UPDATE SET
    status = 'pending',
    updated_at = now();

  INSERT INTO public.partner_settlement_configs (partner_id)
  VALUES (p_partner_id)
  ON CONFLICT (partner_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'partner_id', p_partner_id,
    'partner_name', v_partner.name,
    'partner_email', v_partner.email,
    'partner_document', v_partner.document,
    'status', 'pending',
    'message', 'Onboarding initiated, awaiting provider account creation'
  );
END;
$$;

-- =====================================================
-- 3. RPC: update_partner_payment_account
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_partner_payment_account(
  p_partner_id UUID,
  p_provider_account_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_kyc_level TEXT DEFAULT NULL,
  p_capabilities JSONB DEFAULT NULL,
  p_onboarding_url TEXT DEFAULT NULL,
  p_sync_error TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
BEGIN
  SELECT * INTO v_account FROM public.partner_payment_accounts WHERE partner_id = p_partner_id;
  
  IF v_account IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment account not found');
  END IF;

  UPDATE public.partner_payment_accounts SET
    provider_account_id = COALESCE(p_provider_account_id, provider_account_id),
    status = COALESCE(p_status, status),
    kyc_level = COALESCE(p_kyc_level, kyc_level),
    capabilities = COALESCE(p_capabilities, capabilities),
    onboarding_url = COALESCE(p_onboarding_url, onboarding_url),
    sync_error = p_sync_error,
    last_sync_at = now(),
    updated_at = now()
  WHERE partner_id = p_partner_id;

  RETURN jsonb_build_object(
    'success', true,
    'partner_id', p_partner_id,
    'status', COALESCE(p_status, v_account.status)
  );
END;
$$;

-- =====================================================
-- 4. RPC: enqueue_payout_job (Idempotente)
-- =====================================================
CREATE OR REPLACE FUNCTION public.enqueue_payout_job(
  p_partner_id UUID,
  p_settlement_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedupe_key TEXT;
  v_config RECORD;
  v_account RECORD;
  v_amount NUMERIC;
  v_job_id UUID;
  v_existing_job RECORD;
BEGIN
  IF p_settlement_id IS NOT NULL THEN
    v_dedupe_key := p_partner_id::text || '::' || p_settlement_id::text;
  ELSE
    v_dedupe_key := p_partner_id::text || '::' || to_char(now(), 'YYYY-MM-DD');
  END IF;

  SELECT * INTO v_existing_job FROM public.payout_jobs 
  WHERE dedupe_key = v_dedupe_key AND status NOT IN ('failed', 'cancelled');
  
  IF v_existing_job IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'job_id', v_existing_job.id,
      'status', v_existing_job.status,
      'message', 'Job already exists (idempotent)'
    );
  END IF;

  SELECT * INTO v_config FROM public.partner_settlement_configs WHERE partner_id = p_partner_id;
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settlement config not found');
  END IF;

  SELECT * INTO v_account FROM public.partner_payment_accounts WHERE partner_id = p_partner_id;
  IF v_account IS NULL OR v_account.status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner payment account not approved');
  END IF;

  IF p_amount IS NOT NULL THEN
    v_amount := p_amount;
  ELSIF p_settlement_id IS NOT NULL THEN
    SELECT partner_amount INTO v_amount FROM public.settlements WHERE id = p_settlement_id;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_amount 
    FROM public.partner_earnings 
    WHERE partner_id = p_partner_id AND payout_id IS NULL;
  END IF;

  IF v_amount < v_config.payout_min_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Amount below minimum',
      'amount', v_amount,
      'minimum', v_config.payout_min_amount
    );
  END IF;

  INSERT INTO public.payout_jobs (
    partner_id, settlement_id, dedupe_key, amount, scheduled_at
  ) VALUES (
    p_partner_id, p_settlement_id, v_dedupe_key, v_amount, now()
  )
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'amount', v_amount,
    'status', 'queued'
  );
END;
$$;

-- =====================================================
-- 5. RPC: get_pending_payout_jobs
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_pending_payout_jobs(p_batch_size INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jobs JSONB;
BEGIN
  SELECT jsonb_agg(job_data) INTO v_jobs
  FROM (
    SELECT jsonb_build_object(
      'job_id', pj.id,
      'partner_id', pj.partner_id,
      'amount', pj.amount,
      'settlement_id', pj.settlement_id,
      'attempts', pj.attempts,
      'provider_account_id', ppa.provider_account_id
    ) as job_data
    FROM public.payout_jobs pj
    JOIN public.partner_payment_accounts ppa ON ppa.partner_id = pj.partner_id
    WHERE pj.status IN ('queued', 'failed')
      AND (pj.next_attempt_at IS NULL OR pj.next_attempt_at <= now())
      AND pj.attempts < pj.max_attempts
      AND ppa.status = 'approved'
    ORDER BY pj.scheduled_at
    LIMIT p_batch_size
  ) sub;

  RETURN jsonb_build_object(
    'jobs', COALESCE(v_jobs, '[]'::jsonb),
    'count', COALESCE(jsonb_array_length(v_jobs), 0)
  );
END;
$$;

-- =====================================================
-- 6. RPC: mark_payout_job_processing
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_payout_job_processing(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payout_jobs SET 
    status = 'processing',
    attempts = attempts + 1,
    updated_at = now()
  WHERE id = p_job_id AND status IN ('queued', 'failed');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found or not eligible');
  END IF;

  RETURN jsonb_build_object('success', true, 'job_id', p_job_id);
END;
$$;

-- =====================================================
-- 7. RPC: complete_payout_job
-- =====================================================
CREATE OR REPLACE FUNCTION public.complete_payout_job(
  p_job_id UUID,
  p_success BOOLEAN,
  p_provider_transfer_id TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT * INTO v_job FROM public.payout_jobs WHERE id = p_job_id;
  IF v_job IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  IF p_success THEN
    UPDATE public.payout_jobs SET
      status = 'done',
      provider_transfer_id = p_provider_transfer_id,
      completed_at = now(),
      updated_at = now()
    WHERE id = p_job_id;

    -- Create transfer record
    IF p_provider_transfer_id IS NOT NULL THEN
      INSERT INTO public.provider_transfers (
        provider, provider_transfer_id, partner_id, settlement_id, payout_job_id,
        amount, status, transfer_type
      ) VALUES (
        'asaas', p_provider_transfer_id, v_job.partner_id, v_job.settlement_id, p_job_id,
        v_job.amount, 'requested', 'payout'
      ) ON CONFLICT (provider, provider_transfer_id) DO NOTHING;
    END IF;
  ELSE
    UPDATE public.payout_jobs SET
      status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'failed' END,
      last_error = p_error,
      next_attempt_at = now() + (power(2, attempts) * interval '1 minute'),
      updated_at = now()
    WHERE id = p_job_id;

    IF v_job.attempts >= v_job.max_attempts - 1 THEN
      INSERT INTO public.operational_alerts (
        alert_type, severity, title, message, metadata, dedupe_key
      ) VALUES (
        'payout_failure', 'high',
        'Payout job failed after max attempts',
        format('Partner %s payout of R$ %s failed: %s', v_job.partner_id, v_job.amount, p_error),
        jsonb_build_object('job_id', p_job_id, 'partner_id', v_job.partner_id, 'amount', v_job.amount),
        'payout_failure::' || p_job_id::text
      ) ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'job_status', CASE WHEN p_success THEN 'done' ELSE 'failed' END
  );
END;
$$;

-- =====================================================
-- 8. RPC: sync_provider_transfers_status
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_provider_transfers_status(
  p_partner_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending INTEGER;
  v_confirmed INTEGER;
  v_failed INTEGER;
  v_transfers JSONB;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('requested', 'pending')) as pending,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
  INTO v_pending, v_confirmed, v_failed
  FROM public.provider_transfers
  WHERE (p_partner_id IS NULL OR partner_id = p_partner_id);

  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'provider_transfer_id', provider_transfer_id,
    'partner_id', partner_id,
    'amount', amount,
    'status', status,
    'created_at', created_at
  )) INTO v_transfers
  FROM public.provider_transfers
  WHERE status IN ('requested', 'pending')
    AND (p_partner_id IS NULL OR partner_id = p_partner_id)
  LIMIT 100;

  RETURN jsonb_build_object(
    'pending_sync', v_pending,
    'confirmed', v_confirmed,
    'failed', v_failed,
    'transfers', COALESCE(v_transfers, '[]'::jsonb)
  );
END;
$$;

-- =====================================================
-- 9. RPC: update_provider_transfer_status
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_provider_transfer_status(
  p_transfer_id UUID,
  p_status TEXT,
  p_net_amount NUMERIC DEFAULT NULL,
  p_fee NUMERIC DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.provider_transfers SET
    status = p_status,
    net_amount = COALESCE(p_net_amount, net_amount),
    fee = COALESCE(p_fee, fee),
    error_message = p_error_message,
    confirmed_at = CASE WHEN p_status = 'confirmed' THEN now() ELSE confirmed_at END,
    updated_at = now()
  WHERE id = p_transfer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', p_status);
END;
$$;

-- =====================================================
-- 10. RPC: create_provider_charge_v2 (com suporte a split)
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_provider_charge_v2(
  p_tenant_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_partner_id UUID;
  v_partner_account RECORD;
  v_config RECORD;
  v_use_split BOOLEAN := false;
  v_split_enabled BOOLEAN;
BEGIN
  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant not found');
  END IF;

  v_partner_id := v_tenant.partner_id;
  
  SELECT enabled INTO v_split_enabled 
  FROM public.system_feature_flags 
  WHERE flag_key = 'split_payments_enabled';

  IF v_partner_id IS NOT NULL AND COALESCE(v_split_enabled, false) THEN
    SELECT * INTO v_partner_account 
    FROM public.partner_payment_accounts 
    WHERE partner_id = v_partner_id;

    SELECT * INTO v_config 
    FROM public.partner_settlement_configs 
    WHERE partner_id = v_partner_id;

    IF v_partner_account IS NOT NULL 
       AND v_partner_account.status = 'approved'
       AND (v_partner_account.capabilities->>'split')::boolean = true
       AND v_config IS NOT NULL
       AND v_config.settlement_mode = 'split' 
    THEN
      v_use_split := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'partner_id', v_partner_id,
    'amount', p_amount,
    'description', COALESCE(p_description, 'Cobrança FoodHub09'),
    'use_split', v_use_split,
    'provider_account_id', v_partner_account.provider_account_id,
    'metadata', p_metadata || jsonb_build_object(
      'tenant_id', p_tenant_id,
      'partner_id', v_partner_id,
      'split_enabled', v_use_split
    )
  );
END;
$$;

-- =====================================================
-- 11. RPC: get_partners_payment_status (Super Admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_partners_payment_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'partner_id', p.id,
      'partner_name', p.name,
      'is_active', p.is_active,
      'account_status', COALESCE(ppa.status, 'not_started'),
      'kyc_level', COALESCE(ppa.kyc_level, 'none'),
      'capabilities', COALESCE(ppa.capabilities, '{}'::jsonb),
      'settlement_mode', COALESCE(psc.settlement_mode, 'invoice'),
      'auto_payout_enabled', COALESCE(psc.auto_payout_enabled, false),
      'last_sync_at', ppa.last_sync_at,
      'pending_payout_jobs', (
        SELECT COUNT(*) FROM public.payout_jobs pj 
        WHERE pj.partner_id = p.id AND pj.status IN ('queued', 'processing')
      )
    ))
    FROM public.partners p
    LEFT JOIN public.partner_payment_accounts ppa ON ppa.partner_id = p.id
    LEFT JOIN public.partner_settlement_configs psc ON psc.partner_id = p.id
    ORDER BY p.name
  );
END;
$$;