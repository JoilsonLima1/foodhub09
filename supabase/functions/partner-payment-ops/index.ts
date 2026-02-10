/**
 * Partner Payment Operations Edge Function
 * 
 * Handles:
 * - Partner onboarding (create Asaas subaccount)
 * - Sync onboarding status
 * - Process payout jobs
 * - Sync transfer status
 * 
 * 100% ADITIVO - não altera fluxos existentes
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
  walletId?: string;
}

async function getAsaasConfig(supabase: any): Promise<AsaasConfig | null> {
  const { data: gateway } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('provider', 'asaas')
    .eq('is_active', true)
    .single();

  if (!gateway) return null;

  // The actual API key is stored in api_key_masked (not truly masked in DB)
  // Config may optionally contain sandbox_api_key, production_api_key, environment, wallet_id
  const environment = gateway.config?.environment || 'production';
  const isProduction = environment === 'production';
  
  // Priority: config-specific key > api_key_masked
  const apiKey = isProduction 
    ? (gateway.config?.production_api_key || gateway.api_key_masked)
    : (gateway.config?.sandbox_api_key || gateway.api_key_masked);

  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: isProduction 
      ? 'https://api.asaas.com/v3' 
      : 'https://sandbox.asaas.com/api/v3',
    walletId: gateway.config?.wallet_id,
  };
}

async function createAsaasSubaccount(config: AsaasConfig, partnerData: any): Promise<any> {
  console.log('[Asaas] Creating subaccount for partner:', partnerData.partner_name);

  const response = await fetch(`${config.baseUrl}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': config.apiKey,
    },
    body: JSON.stringify({
      name: partnerData.partner_name,
      email: partnerData.partner_email,
      cpfCnpj: partnerData.partner_document?.replace(/\D/g, ''),
      companyType: partnerData.partner_document?.replace(/\D/g, '').length > 11 ? 'MEI' : null,
      mobilePhone: partnerData.partner_phone?.replace(/\D/g, ''),
    }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error('[Asaas] Error creating subaccount:', result);
    throw new Error(result.errors?.[0]?.description || 'Failed to create Asaas subaccount');
  }

  console.log('[Asaas] Subaccount created:', result.id);
  return result;
}

async function getAsaasAccountStatus(config: AsaasConfig, accountId: string): Promise<any> {
  console.log('[Asaas] Getting account status:', accountId);

  const response = await fetch(`${config.baseUrl}/accounts/${accountId}`, {
    headers: {
      'access_token': config.apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Asaas] Error getting account status:', error);
    throw new Error(error.errors?.[0]?.description || 'Failed to get account status');
  }

  return await response.json();
}

async function createAsaasTransfer(config: AsaasConfig, transferData: any): Promise<any> {
  console.log('[Asaas] Creating transfer:', transferData);

  const response = await fetch(`${config.baseUrl}/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': config.apiKey,
    },
    body: JSON.stringify({
      value: transferData.amount,
      walletId: transferData.provider_account_id,
      operationType: 'PIX',
      description: `Repasse Partner ${transferData.partner_id}`,
    }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error('[Asaas] Error creating transfer:', result);
    throw new Error(result.errors?.[0]?.description || 'Failed to create transfer');
  }

  console.log('[Asaas] Transfer created:', result.id);
  return result;
}

async function handleStartOnboarding(supabase: any, partnerId: string) {
  console.log('[Onboarding] Starting for partner:', partnerId);

  // Start onboarding in DB
  const { data: onboardingResult, error: startError } = await supabase
    .rpc('start_partner_onboarding', { p_partner_id: partnerId });

  if (startError || !onboardingResult?.success) {
    throw new Error(onboardingResult?.error || startError?.message || 'Failed to start onboarding');
  }

  // Get Asaas config
  const asaasConfig = await getAsaasConfig(supabase);
  if (!asaasConfig) {
    // Update status to pending (manual approval needed)
    await supabase.rpc('update_partner_payment_account', {
      p_partner_id: partnerId,
      p_status: 'pending',
      p_sync_error: 'Asaas gateway not configured',
    });
    return { success: true, status: 'pending', message: 'Awaiting manual configuration' };
  }

  try {
    // Create Asaas subaccount
    const subaccount = await createAsaasSubaccount(asaasConfig, onboardingResult);

    // Update with subaccount info
    await supabase.rpc('update_partner_payment_account', {
      p_partner_id: partnerId,
      p_provider_account_id: subaccount.id,
      p_status: subaccount.commercialInfoExpiration ? 'pending' : 'approved',
      p_onboarding_url: subaccount.accountNumber?.walletUrl || null,
      p_capabilities: {
        split: subaccount.transfersEnabled || false,
        transfers: subaccount.transfersEnabled || false,
        pix: subaccount.commercialInfoExpiration === null,
      },
    });

    return {
      success: true,
      status: subaccount.commercialInfoExpiration ? 'pending' : 'approved',
      provider_account_id: subaccount.id,
    };
  } catch (error: any) {
    console.error('[Onboarding] Asaas error:', error);
    
    await supabase.rpc('update_partner_payment_account', {
      p_partner_id: partnerId,
      p_status: 'rejected',
      p_sync_error: error.message,
    });

    return { success: false, error: error.message };
  }
}

async function handleSyncStatus(supabase: any, partnerId: string) {
  console.log('[Sync] Syncing status for partner:', partnerId);

  const { data: status } = await supabase
    .rpc('get_partner_onboarding_status', { p_partner_id: partnerId });

  if (!status?.provider_account_id) {
    return { success: false, error: 'No provider account found' };
  }

  const asaasConfig = await getAsaasConfig(supabase);
  if (!asaasConfig) {
    return { success: false, error: 'Asaas not configured' };
  }

  try {
    const accountStatus = await getAsaasAccountStatus(asaasConfig, status.provider_account_id);

    const newStatus = accountStatus.commercialInfoExpiration === null ? 'approved' : 'pending';
    
    await supabase.rpc('update_partner_payment_account', {
      p_partner_id: partnerId,
      p_status: newStatus,
      p_kyc_level: accountStatus.bankAccountInfoEnabled ? 'full' : 'basic',
      p_capabilities: {
        split: accountStatus.transfersEnabled || false,
        transfers: accountStatus.transfersEnabled || false,
        pix: accountStatus.commercialInfoExpiration === null,
      },
    });

    return { success: true, status: newStatus };
  } catch (error: any) {
    console.error('[Sync] Error:', error);
    return { success: false, error: error.message };
  }
}

async function handleProcessPayoutJobs(supabase: any) {
  console.log('[Payout] Processing payout jobs');

  // Step 1: Auto-enqueue from approved settlements
  const { data: enqueueResult } = await supabase.rpc('process_pending_settlements_to_payouts');
  console.log('[Payout] Auto-enqueue result:', enqueueResult);

  // Step 2: Process queued jobs
  const { data: pendingJobs } = await supabase.rpc('get_pending_payout_jobs', { p_batch_size: 5 });

  if (!pendingJobs?.jobs?.length) {
    return { success: true, processed: 0, enqueued: enqueueResult?.enqueued || 0, message: 'No jobs to process' };
  }

  const asaasConfig = await getAsaasConfig(supabase);
  if (!asaasConfig) {
    return { success: false, error: 'Asaas not configured' };
  }

  const results = [];

  for (const job of pendingJobs.jobs) {
    await supabase.rpc('mark_payout_job_processing', { p_job_id: job.job_id });

    try {
      const transfer = await createAsaasTransfer(asaasConfig, {
        amount: job.amount,
        provider_account_id: job.provider_account_id,
        partner_id: job.partner_id,
      });

      await supabase.rpc('complete_payout_job', {
        p_job_id: job.job_id,
        p_success: true,
        p_provider_transfer_id: transfer.id,
      });

      results.push({ job_id: job.job_id, status: 'done', transfer_id: transfer.id });
    } catch (error: any) {
      console.error('[Payout] Job failed:', job.job_id, error);

      await supabase.rpc('complete_payout_job', {
        p_job_id: job.job_id,
        p_success: false,
        p_error: error.message,
      });

      results.push({ job_id: job.job_id, status: 'failed', error: error.message });
    }
  }

  return { success: true, processed: results.length, enqueued: enqueueResult?.enqueued || 0, results };
}

async function handleReconcile(supabase: any, partnerId?: string) {
  console.log('[Reconcile] Running reconciliation', partnerId ? `for partner ${partnerId}` : 'global');

  const { data, error } = await supabase.rpc('reconcile_payout_transfers', {
    p_partner_id: partnerId || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

async function handleCronHealth(supabase: any) {
  const { data, error } = await supabase.rpc('check_cron_health', { p_hours_lookback: 24 });
  if (error) return { success: false, error: error.message };
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, partner_id } = await req.json();

    console.log('[PartnerPaymentOps] Action:', action, 'Partner:', partner_id);

    let result;

    switch (action) {
      case 'start_onboarding':
        if (!partner_id) throw new Error('partner_id required');
        result = await handleStartOnboarding(supabase, partner_id);
        break;

      case 'sync_status':
        if (!partner_id) throw new Error('partner_id required');
        result = await handleSyncStatus(supabase, partner_id);
        break;

      case 'process_payout_jobs':
        result = await handleProcessPayoutJobs(supabase);
        break;

      case 'reconcile':
        result = await handleReconcile(supabase, partner_id);
        break;

      case 'cron_health':
        result = await handleCronHealth(supabase);
        break;

      case 'get_status':
        if (!partner_id) throw new Error('partner_id required');
        const { data: statusData } = await supabase
          .rpc('get_partner_onboarding_status', { p_partner_id: partner_id });
        result = statusData;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[PartnerPaymentOps] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
