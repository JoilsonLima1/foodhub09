/**
 * partner-billing-cron — Hardened scheduled job with:
 * - Phase-level locking (cron_runs table)
 * - Idempotent invoice generation (RPC-based)
 * - State-based dunning (only log on change)
 * - Reversal handling for refunds
 * - Tenant trial + delinquency management
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: any) => {
  const d = details ? ` — ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-CRON] ${step}${d}`);
};

interface PhaseResult {
  phase: string;
  skipped: boolean;
  counts: Record<string, number>;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const currentPeriod = todayStr.substring(0, 7); // YYYY-MM
  const correlationId = crypto.randomUUID();

  const phaseResults: PhaseResult[] = [];

  // ── Helper: acquire phase lock ──
  async function acquirePhaseLock(phase: string): Promise<boolean> {
    // Check if already ran successfully
    const { data: existing } = await supabase
      .from('cron_runs')
      .select('id')
      .eq('job_name', 'partner-billing-cron')
      .eq('phase', phase)
      .eq('period', currentPeriod)
      .eq('status', 'success')
      .limit(1);

    if (existing && existing.length > 0) {
      log(`Phase ${phase}: already ran successfully for ${currentPeriod}, skipping`);
      return false;
    }

    // Insert running record (unique index will prevent races)
    const { error } = await supabase.from('cron_runs').insert({
      job_name: 'partner-billing-cron',
      phase,
      period: currentPeriod,
      correlation_id: correlationId,
      status: 'running',
    });

    if (error) {
      // Could be a race or already running
      log(`Phase ${phase}: lock acquisition failed`, { error: error.message });
      return false;
    }

    return true;
  }

  async function completePhaseLock(phase: string, status: 'success' | 'failed', results?: any, errorMsg?: string) {
    await supabase
      .from('cron_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        results: results || null,
        error_message: errorMsg || null,
      })
      .eq('job_name', 'partner-billing-cron')
      .eq('phase', phase)
      .eq('period', currentPeriod)
      .eq('correlation_id', correlationId);
  }

  try {
    log('Cron started', { correlationId, period: currentPeriod });

    // ========================================
    // PHASE A: Partner AR Invoice Generation (Idempotent via RPC)
    // ========================================
    const phaseA: PhaseResult = { phase: 'A_invoice_gen', skipped: false, counts: { generated: 0, idempotent_skips: 0 }, errors: [] };

    if (await acquirePhaseLock('A_invoice_gen')) {
      try {
        log('Phase A: Partner AR invoice generation');

        const { data: billingConfigs } = await supabase
          .from('partner_billing_config')
          .select('partner_id, billing_day, is_active')
          .eq('is_active', true);

        for (const cfg of billingConfigs || []) {
          try {
            const billingDay = cfg.billing_day || 1;
            if (today.getDate() !== billingDay) continue;

            // Use idempotent RPC (returns existing if already created)
            const { data, error } = await supabase.rpc('generate_partner_monthly_invoice', {
              p_partner_id: cfg.partner_id,
              p_period: currentPeriod,
            });

            if (error) {
              phaseA.errors.push(`RPC ${cfg.partner_id}: ${error.message}`);
              continue;
            }

            const result = data as any;
            if (result?.error) {
              if (result.error !== 'no_billing_config') {
                phaseA.errors.push(`RPC ${cfg.partner_id}: ${result.error}`);
              }
              continue;
            }

            if (result?.idempotent) {
              phaseA.counts.idempotent_skips++;
              log('Phase A: invoice already exists (idempotent)', { partnerId: cfg.partner_id });
            } else {
              phaseA.counts.generated++;
              log('Phase A: AR invoice created', { partnerId: cfg.partner_id, total: result?.total });
            }
          } catch (err) {
            phaseA.errors.push(`Partner ${cfg.partner_id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        await completePhaseLock('A_invoice_gen', phaseA.errors.length > 0 ? 'failed' : 'success', phaseA.counts);
      } catch (err) {
        await completePhaseLock('A_invoice_gen', 'failed', null, err instanceof Error ? err.message : String(err));
        phaseA.errors.push(err instanceof Error ? err.message : String(err));
      }
    } else {
      phaseA.skipped = true;
    }
    phaseResults.push(phaseA);

    // ========================================
    // PHASE B: Partner Dunning (State-Based)
    // ========================================
    const phaseB: PhaseResult = { phase: 'B_dunning', skipped: false, counts: { escalations: 0, reversals: 0, checked: 0 }, errors: [] };

    if (await acquirePhaseLock('B_dunning')) {
      try {
        log('Phase B: Dunning state check');

        const { data: allConfigs } = await supabase
          .from('partner_billing_config')
          .select('partner_id, current_dunning_level, dunning_policy, dunning_started_at')
          .eq('is_active', true);

        for (const cfg of allConfigs || []) {
          try {
            phaseB.counts.checked++;

            // Get overdue data for this partner
            const { data: overdueData } = await supabase
              .from('partner_ar_invoices')
              .select('id, amount, due_date')
              .eq('partner_id', cfg.partner_id)
              .in('status', ['pending', 'overdue'])
              .lt('due_date', todayStr);

            // Mark pending as overdue
            if (overdueData) {
              for (const inv of overdueData) {
                // We mark overdue only if pending and past due (this is safe to repeat)
                await supabase
                  .from('partner_ar_invoices')
                  .update({ status: 'overdue' })
                  .eq('id', inv.id)
                  .eq('status', 'pending');
              }
            }

            const overdue = overdueData || [];
            const maxDays = overdue.reduce((max, inv) => {
              const days = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / 86400000);
              return Math.max(max, days);
            }, 0);
            const totalAmount = overdue.reduce((s, inv) => s + inv.amount, 0);

            // Compute level from policy
            const policy = (cfg.dunning_policy as any) || {
              L1: { days_overdue: 1 }, L2: { days_overdue: 8 },
              L3: { days_overdue: 16 }, L4: { days_overdue: 31 },
            };

            let computedLevel = 0;
            if (overdue.length > 0) {
              if (maxDays >= (policy.L4?.days_overdue || 31)) computedLevel = 4;
              else if (maxDays >= (policy.L3?.days_overdue || 16)) computedLevel = 3;
              else if (maxDays >= (policy.L2?.days_overdue || 8)) computedLevel = 2;
              else if (maxDays >= (policy.L1?.days_overdue || 1)) computedLevel = 1;
            }

            const currentLevel = cfg.current_dunning_level || 0;

            // Only act on change
            if (computedLevel !== currentLevel) {
              const isEscalation = computedLevel > currentLevel;

              await supabase
                .from('partner_billing_config')
                .update({
                  current_dunning_level: computedLevel,
                  dunning_started_at: computedLevel > 0 && !cfg.dunning_started_at
                    ? new Date().toISOString()
                    : computedLevel === 0 ? null : cfg.dunning_started_at,
                })
                .eq('partner_id', cfg.partner_id);

              const actionMap: Record<number, string> = {
                0: 'reversal', 1: 'warning', 2: 'read_only', 3: 'partial_block', 4: 'full_block',
              };

              await supabase.from('partner_dunning_log').insert({
                partner_id: cfg.partner_id,
                invoice_id: overdue.length > 0 ? overdue[0].id : null,
                dunning_level: computedLevel,
                action: actionMap[computedLevel] || 'change',
                description: isEscalation
                  ? `Escalado L${currentLevel}→L${computedLevel}: ${overdue.length} fatura(s), ${maxDays} dias, R$ ${totalAmount.toFixed(2)}`
                  : `Revertido L${currentLevel}→L${computedLevel}: ${overdue.length === 0 ? 'todas quitadas' : `${overdue.length} fatura(s) restantes`}`,
                executed_at: new Date().toISOString(),
                metadata: { max_days: maxDays, total: totalAmount, count: overdue.length, from: currentLevel, to: computedLevel },
              });

              if (isEscalation) phaseB.counts.escalations++;
              else phaseB.counts.reversals++;

              log(`Dunning ${isEscalation ? 'escalated' : 'reversed'}`, { partnerId: cfg.partner_id, from: currentLevel, to: computedLevel });
            }
          } catch (err) {
            phaseB.errors.push(`Dunning ${cfg.partner_id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        await completePhaseLock('B_dunning', phaseB.errors.length > 0 ? 'failed' : 'success', phaseB.counts);
      } catch (err) {
        await completePhaseLock('B_dunning', 'failed', null, err instanceof Error ? err.message : String(err));
        phaseB.errors.push(err instanceof Error ? err.message : String(err));
      }
    } else {
      phaseB.skipped = true;
    }
    phaseResults.push(phaseB);

    // ========================================
    // PHASE C: Tenant Trial Expiration
    // ========================================
    const phaseC: PhaseResult = { phase: 'C_trials', skipped: false, counts: { expired: 0, charges: 0 }, errors: [] };

    if (await acquirePhaseLock('C_trials')) {
      try {
        log('Phase C: Tenant trials');

        const { data: expiredTrials } = await supabase
          .from('tenant_subscriptions')
          .select(`
            id, tenant_id, partner_plan_id, status, trial_ends_at, monthly_amount,
            plan:partner_plans!partner_plan_id (id, name, monthly_price, partner_id)
          `)
          .eq('status', 'trial')
          .lte('trial_ends_at', today.toISOString());

        for (const sub of expiredTrials || []) {
          try {
            const plan = sub.plan as any;
            if (plan?.monthly_price === 0) {
              await supabase.from('tenant_subscriptions').update({
                status: 'active',
                current_period_start: today.toISOString(),
                current_period_end: new Date(today.getTime() + 30 * 86400000).toISOString(),
              }).eq('id', sub.id);
              phaseC.counts.expired++;
              continue;
            }

            const amount = plan?.monthly_price || sub.monthly_amount || 0;
            if (amount > 0) {
              const dueDate = new Date(today.getTime() + 3 * 86400000);

              // Idempotency: check if charge already exists
              const { data: existingCharge } = await supabase
                .from('partner_invoices')
                .select('id')
                .eq('tenant_subscription_id', sub.id)
                .eq('status', 'pending')
                .limit(1);

              if (!existingCharge || existingCharge.length === 0) {
                await supabase.from('partner_invoices').insert({
                  tenant_subscription_id: sub.id,
                  tenant_id: sub.tenant_id,
                  partner_id: plan?.partner_id,
                  partner_plan_id: plan?.id,
                  amount,
                  currency: 'BRL',
                  description: `Assinatura ${plan?.name || 'Plano'} — Após período de teste`,
                  due_date: dueDate.toISOString().split('T')[0],
                  status: 'pending',
                });
                phaseC.counts.charges++;
              }

              await supabase.from('tenant_subscriptions').update({
                status: 'past_due',
                updated_at: new Date().toISOString(),
              }).eq('id', sub.id);
            }
            phaseC.counts.expired++;
          } catch (err) {
            phaseC.errors.push(`Trial ${sub.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        await completePhaseLock('C_trials', phaseC.errors.length > 0 ? 'failed' : 'success', phaseC.counts);
      } catch (err) {
        await completePhaseLock('C_trials', 'failed', null, err instanceof Error ? err.message : String(err));
        phaseC.errors.push(err instanceof Error ? err.message : String(err));
      }
    } else {
      phaseC.skipped = true;
    }
    phaseResults.push(phaseC);

    // ========================================
    // PHASE D: Tenant Delinquency
    // ========================================
    const phaseD: PhaseResult = { phase: 'D_delinquency', skipped: false, counts: { checked: 0, canceled: 0 }, errors: [] };

    if (await acquirePhaseLock('D_delinquency')) {
      try {
        log('Phase D: Tenant delinquency');

        const { data: tenantOverdue } = await supabase
          .from('partner_invoices')
          .select('id, tenant_subscription_id, tenant_id, partner_id, due_date, status')
          .in('status', ['pending', 'overdue'])
          .lt('due_date', todayStr);

        if (tenantOverdue && tenantOverdue.length > 0) {
          const partnerIds = [...new Set(tenantOverdue.map(i => i.partner_id).filter(Boolean))];
          const { data: delConfigs } = await supabase
            .from('partner_delinquency_config')
            .select('*')
            .in('partner_id', partnerIds);

          const cfgMap = new Map(delConfigs?.map((c: any) => [c.partner_id, c]) || []);

          for (const inv of tenantOverdue) {
            try {
              phaseD.counts.checked++;
              const config = cfgMap.get(inv.partner_id) || { warning_days: 1, partial_block_days: 7, full_block_days: 15 };
              const dueDate = new Date(inv.due_date!);
              const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);

              if (inv.status === 'pending') {
                await supabase.from('partner_invoices').update({ status: 'overdue' }).eq('id', inv.id);
              }

              let newStatus = 'past_due';
              if (daysOverdue >= (config as any).full_block_days) {
                newStatus = 'canceled';
                await supabase.from('tenants').update({ subscription_status: 'canceled', is_active: false }).eq('id', inv.tenant_id);
                phaseD.counts.canceled++;
              }

              await supabase.from('tenant_subscriptions').update({
                status: newStatus,
                updated_at: new Date().toISOString(),
              }).eq('id', inv.tenant_subscription_id);
            } catch (err) {
              phaseD.errors.push(`Delinquency ${inv.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }

        await completePhaseLock('D_delinquency', phaseD.errors.length > 0 ? 'failed' : 'success', phaseD.counts);
      } catch (err) {
        await completePhaseLock('D_delinquency', 'failed', null, err instanceof Error ? err.message : String(err));
        phaseD.errors.push(err instanceof Error ? err.message : String(err));
      }
    } else {
      phaseD.skipped = true;
    }
    phaseResults.push(phaseD);

    // ========================================
    // Audit Log
    // ========================================
    const allErrors = phaseResults.flatMap(p => p.errors);

    await supabase.from('cron_job_logs').insert({
      job_name: 'partner-billing-cron',
      executed_at: new Date().toISOString(),
      results: { correlationId, phases: phaseResults } as any,
      status: allErrors.length > 0 ? 'partial' : 'success',
    });

    log('Cron completed', { correlationId, phases: phaseResults.map(p => ({ phase: p.phase, skipped: p.skipped, counts: p.counts, errorCount: p.errors.length })) });

    return new Response(JSON.stringify({ success: true, correlationId, phases: phaseResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fatal error';
    log('FATAL', { message: msg, correlationId });
    return new Response(JSON.stringify({ success: false, error: msg, correlationId }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
