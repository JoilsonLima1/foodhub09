/**
 * partner-billing-cron - Scheduled job for:
 * 1. Partner AR invoice generation (monthly fees + tx fees from ledger)
 * 2. Partner dunning escalation (L1→L4)
 * 3. Tenant trial expiration and delinquency
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const results = {
    partnerInvoicesGenerated: 0,
    dunningEscalations: 0,
    dunningReversals: 0,
    trialsExpired: 0,
    tenantChargesGenerated: 0,
    tenantsChecked: 0,
    errors: [] as string[],
  };

  try {
    log('Cron started');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const currentPeriod = todayStr.substring(0, 7); // YYYY-MM

    // ========================================
    // PHASE A: Partner AR Invoice Generation
    // ========================================
    log('Phase A: Partner AR invoice generation');

    const { data: billingConfigs } = await supabase
      .from('partner_billing_config')
      .select('*, partner:partners(id, name, email)')
      .eq('is_active', true);

    for (const cfg of billingConfigs || []) {
      try {
        // Skip if already invoiced for this period
        if (cfg.last_invoice_period === currentPeriod) continue;

        // Check if today is the billing day
        const billingDay = cfg.billing_day || 1;
        if (today.getDate() !== billingDay) continue;

        // Calculate amounts
        let totalAmount = 0;
        const lineItems: any[] = [];

        // Monthly fee
        if (cfg.monthly_fee_cents > 0) {
          const monthlyFee = cfg.monthly_fee_cents / 100;
          totalAmount += monthlyFee;
          lineItems.push({
            description: 'Mensalidade da plataforma',
            amount: monthlyFee,
            type: 'monthly_fee',
          });
        }

        // Transaction fees from unbilled ledger entries
        const { data: unbilledFees } = await supabase
          .from('partner_fee_ledger')
          .select('*')
          .eq('partner_id', cfg.partner_id)
          .is('ar_invoice_id', null)
          .eq('status', 'pending');

        if (unbilledFees && unbilledFees.length > 0) {
          const txTotal = unbilledFees.reduce((s: number, f: any) => s + (f.platform_fee || 0), 0);
          if (txTotal > 0) {
            totalAmount += txTotal;
            lineItems.push({
              description: `Taxas de transação (${unbilledFees.length} transações)`,
              amount: txTotal,
              type: 'tx_fees',
              count: unbilledFees.length,
            });
          }
        }

        // Skip if nothing to invoice
        if (totalAmount <= 0) continue;

        // Generate invoice number
        const invoiceNumber = `AR-${cfg.partner_id.substring(0, 6).toUpperCase()}-${currentPeriod.replace('-', '')}`;

        // Calculate due date based on grace days
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + (cfg.grace_days || 10));

        // Period boundaries
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Create AR invoice
        const { data: newInvoice, error: invErr } = await supabase
          .from('partner_ar_invoices')
          .insert({
            partner_id: cfg.partner_id,
            invoice_number: invoiceNumber,
            amount: totalAmount,
            currency: 'BRL',
            description: `Faturamento ${currentPeriod}`,
            reference_period_start: periodStart.toISOString().split('T')[0],
            reference_period_end: periodEnd.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending',
            line_items: lineItems,
          })
          .select()
          .single();

        if (invErr) {
          results.errors.push(`Invoice gen ${cfg.partner_id}: ${invErr.message}`);
          continue;
        }

        // Link ledger entries to this invoice
        if (unbilledFees && unbilledFees.length > 0 && newInvoice) {
          const ledgerIds = unbilledFees.map((f: any) => f.id);
          await supabase
            .from('partner_fee_ledger')
            .update({ ar_invoice_id: newInvoice.id, status: 'invoiced' })
            .in('id', ledgerIds);
        }

        // Update last invoice period
        await supabase
          .from('partner_billing_config')
          .update({ last_invoice_period: currentPeriod })
          .eq('partner_id', cfg.partner_id);

        results.partnerInvoicesGenerated++;
        log('AR invoice created', { partnerId: cfg.partner_id, amount: totalAmount, invoiceNumber });

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Partner ${cfg.partner_id}: ${msg}`);
      }
    }

    // ========================================
    // PHASE B: Partner Dunning Escalation
    // ========================================
    log('Phase B: Dunning escalation');

    const { data: overdueInvoices } = await supabase
      .from('partner_ar_invoices')
      .select('*')
      .in('status', ['pending', 'overdue'])
      .lt('due_date', todayStr);

    // Group overdue by partner
    const partnerOverdue = new Map<string, { maxDays: number; totalAmount: number; count: number; invoiceIds: string[] }>();

    for (const inv of overdueInvoices || []) {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (86400000));
      const existing = partnerOverdue.get(inv.partner_id) || { maxDays: 0, totalAmount: 0, count: 0, invoiceIds: [] };
      existing.maxDays = Math.max(existing.maxDays, daysOverdue);
      existing.totalAmount += inv.amount;
      existing.count++;
      existing.invoiceIds.push(inv.id);
      partnerOverdue.set(inv.partner_id, existing);

      // Mark as overdue if still pending
      if (inv.status === 'pending') {
        await supabase
          .from('partner_ar_invoices')
          .update({ status: 'overdue' })
          .eq('id', inv.id);
      }
    }

    for (const [partnerId, info] of partnerOverdue.entries()) {
      try {
        const { data: cfg } = await supabase
          .from('partner_billing_config')
          .select('dunning_policy, current_dunning_level')
          .eq('partner_id', partnerId)
          .single();

        const policy = (cfg?.dunning_policy as any) || {
          L1: { days_overdue: 1 },
          L2: { days_overdue: 8 },
          L3: { days_overdue: 16 },
          L4: { days_overdue: 31 },
        };

        let newLevel = 0;
        if (info.maxDays >= (policy.L4?.days_overdue || 31)) newLevel = 4;
        else if (info.maxDays >= (policy.L3?.days_overdue || 16)) newLevel = 3;
        else if (info.maxDays >= (policy.L2?.days_overdue || 8)) newLevel = 2;
        else if (info.maxDays >= (policy.L1?.days_overdue || 1)) newLevel = 1;

        const currentLevel = cfg?.current_dunning_level || 0;

        if (newLevel > currentLevel) {
          // Escalate
          await supabase
            .from('partner_billing_config')
            .update({
              current_dunning_level: newLevel,
              dunning_started_at: currentLevel === 0 ? new Date().toISOString() : undefined,
            })
            .eq('partner_id', partnerId);

          const actionMap: Record<number, string> = {
            1: 'warning',
            2: 'read_only',
            3: 'partial_block',
            4: 'full_block',
          };

          await supabase.from('partner_dunning_log').insert({
            partner_id: partnerId,
            invoice_id: info.invoiceIds[0],
            dunning_level: newLevel,
            action: actionMap[newLevel] || 'escalation',
            description: `Escalado para L${newLevel}: ${info.count} fatura(s) vencida(s), ${info.maxDays} dias, total ${info.totalAmount.toFixed(2)}`,
            executed_at: new Date().toISOString(),
            metadata: { max_days: info.maxDays, total: info.totalAmount, count: info.count },
          });

          results.dunningEscalations++;
          log('Dunning escalated', { partnerId, from: currentLevel, to: newLevel });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Dunning ${partnerId}: ${msg}`);
      }
    }

    // Check for partners that should have dunning reversed (all invoices paid)
    if (billingConfigs) {
      for (const cfg of billingConfigs) {
        if ((cfg.current_dunning_level || 0) === 0) continue;
        if (partnerOverdue.has(cfg.partner_id)) continue; // still has overdue

        // No overdue invoices — reverse dunning
        await supabase
          .from('partner_billing_config')
          .update({ current_dunning_level: 0, dunning_started_at: null })
          .eq('partner_id', cfg.partner_id);

        await supabase.from('partner_dunning_log').insert({
          partner_id: cfg.partner_id,
          dunning_level: 0,
          action: 'reversal',
          description: 'Todas as faturas quitadas — acesso restaurado',
          executed_at: new Date().toISOString(),
        });

        results.dunningReversals++;
        log('Dunning reversed', { partnerId: cfg.partner_id });
      }
    }

    // ========================================
    // PHASE C: Tenant Trial Expiration
    // ========================================
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
          results.trialsExpired++;
          continue;
        }

        const amount = plan?.monthly_price || sub.monthly_amount || 0;
        if (amount > 0) {
          const dueDate = new Date(today.getTime() + 3 * 86400000);
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
          results.tenantChargesGenerated++;

          await supabase.from('tenant_subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('id', sub.id);
        }
        results.trialsExpired++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Trial ${sub.id}: ${msg}`);
      }
    }

    // ========================================
    // PHASE D: Tenant Delinquency
    // ========================================
    log('Phase D: Tenant delinquency');

    const { data: tenantOverdue } = await supabase
      .from('partner_invoices')
      .select('id, tenant_subscription_id, tenant_id, partner_id, due_date, status')
      .in('status', ['pending', 'overdue'])
      .lt('due_date', todayStr);

    if (tenantOverdue) {
      const partnerIds = [...new Set(tenantOverdue.map(i => i.partner_id).filter(Boolean))];
      const { data: delConfigs } = await supabase
        .from('partner_delinquency_config')
        .select('*')
        .in('partner_id', partnerIds);

      const cfgMap = new Map(delConfigs?.map(c => [c.partner_id, c]) || []);

      for (const inv of tenantOverdue) {
        try {
          results.tenantsChecked++;
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
          }

          await supabase.from('tenant_subscriptions').update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          }).eq('id', inv.tenant_subscription_id);

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.errors.push(`TenantDelinquency ${inv.id}: ${msg}`);
        }
      }
    }

    // ========================================
    // Audit Log
    // ========================================
    await supabase.from('cron_job_logs').insert({
      job_name: 'partner-billing-cron',
      executed_at: new Date().toISOString(),
      results: results as any,
      status: results.errors.length > 0 ? 'partial' : 'success',
    });

    log('Cron completed', results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fatal error';
    log('FATAL', { message: msg });
    return new Response(JSON.stringify({ success: false, error: msg, results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
