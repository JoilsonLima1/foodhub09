/**
 * partner-billing-cron - Scheduled job for trial expiration and delinquency management
 * 
 * Runs daily to:
 * 1. Expire trials and generate charges
 * 2. Apply delinquency rules (warning, partial block, full block)
 * 3. Update subscription statuses
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PARTNER-BILLING-CRON] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results = {
    tenantsChecked: 0,
    trialsExpired: 0,
    chargesGenerated: 0,
    warningsSent: 0,
    partialBlocks: 0,
    fullBlocks: 0,
    errors: [] as string[],
  };

  try {
    logStep("Cron job started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ===========================================
    // STEP 1: Process Expired Trials
    // ===========================================
    logStep("Processing expired trials");

    const { data: expiredTrials, error: trialsError } = await supabase
      .from('tenant_subscriptions')
      .select(`
        id,
        tenant_id,
        partner_plan_id,
        status,
        trial_ends_at,
        monthly_amount,
        tenant:tenants!tenant_id (id, name, email),
        plan:partner_plans!partner_plan_id (id, name, monthly_price, partner_id)
      `)
      .eq('status', 'trial')
      .lte('trial_ends_at', today.toISOString());

    if (trialsError) {
      logStep("Error fetching expired trials", { error: trialsError.message });
      results.errors.push(`Trials fetch error: ${trialsError.message}`);
    } else if (expiredTrials && expiredTrials.length > 0) {
      logStep("Found expired trials", { count: expiredTrials.length });

      for (const subscription of expiredTrials) {
        try {
          const plan = subscription.plan as any;
          const tenant = subscription.tenant as any;
          
          // Check if plan is free
          if (plan?.monthly_price === 0) {
            // Activate directly for free plans
            await supabase
              .from('tenant_subscriptions')
              .update({
                status: 'active',
                current_period_start: today.toISOString(),
                current_period_end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('id', subscription.id);
            
            results.trialsExpired++;
            logStep("Free plan auto-activated", { subscriptionId: subscription.id });
            continue;
          }

          // For paid plans, generate a charge
          const amount = plan?.monthly_price || subscription.monthly_amount || 0;
          
          if (amount > 0) {
            // Create invoice record
            const dueDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
            
            const { data: invoice, error: invoiceError } = await supabase
              .from('partner_invoices')
              .insert({
                tenant_subscription_id: subscription.id,
                tenant_id: subscription.tenant_id,
                partner_id: plan?.partner_id,
                partner_plan_id: plan?.id,
                amount,
                currency: 'BRL',
                description: `Assinatura ${plan?.name || 'Plano'} - Após período de teste`,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending',
              })
              .select()
              .single();

            if (invoiceError) {
              logStep("Error creating invoice", { error: invoiceError.message, subscriptionId: subscription.id });
              results.errors.push(`Invoice error for ${subscription.id}: ${invoiceError.message}`);
            } else {
              results.chargesGenerated++;
              logStep("Invoice created for expired trial", { 
                invoiceId: invoice?.id, 
                subscriptionId: subscription.id,
                amount 
              });
            }

            // Update subscription status to past_due (awaiting payment)
            await supabase
              .from('tenant_subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscription.id);
          }

          results.trialsExpired++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logStep("Error processing trial", { subscriptionId: subscription.id, error: errMsg });
          results.errors.push(`Trial ${subscription.id}: ${errMsg}`);
        }
      }
    }

    // ===========================================
    // STEP 2: Process Delinquency
    // ===========================================
    logStep("Processing delinquency rules");

    // Get all overdue invoices with partner delinquency configs
    const { data: overdueInvoices, error: overdueError } = await supabase
      .from('partner_invoices')
      .select(`
        id,
        tenant_subscription_id,
        tenant_id,
        partner_id,
        due_date,
        status,
        created_at
      `)
      .in('status', ['pending', 'overdue'])
      .lt('due_date', today.toISOString().split('T')[0]);

    if (overdueError) {
      logStep("Error fetching overdue invoices", { error: overdueError.message });
      results.errors.push(`Overdue fetch error: ${overdueError.message}`);
    } else if (overdueInvoices && overdueInvoices.length > 0) {
      logStep("Found overdue invoices", { count: overdueInvoices.length });

      // Get delinquency configs for each partner
      const partnerIds = [...new Set(overdueInvoices.map(i => i.partner_id).filter(Boolean))];
      
      const { data: delinquencyConfigs } = await supabase
        .from('partner_delinquency_config')
        .select('*')
        .in('partner_id', partnerIds);

      const configMap = new Map(delinquencyConfigs?.map(c => [c.partner_id, c]) || []);

      for (const invoice of overdueInvoices) {
        try {
          results.tenantsChecked++;

          const config = configMap.get(invoice.partner_id) || {
            warning_days: 1,
            partial_block_days: 7,
            full_block_days: 15,
          };

          const dueDate = new Date(invoice.due_date!);
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          logStep("Processing overdue invoice", { 
            invoiceId: invoice.id, 
            daysOverdue, 
            config 
          });

          // Update invoice status to overdue if still pending
          if (invoice.status === 'pending') {
            await supabase
              .from('partner_invoices')
              .update({ status: 'overdue' })
              .eq('id', invoice.id);
          }

          // Apply delinquency rules
          let newStatus = 'past_due';
          let blockLevel: 'none' | 'warning' | 'partial' | 'full' = 'none';

          if (daysOverdue >= config.full_block_days) {
            newStatus = 'canceled';
            blockLevel = 'full';
            results.fullBlocks++;
          } else if (daysOverdue >= config.partial_block_days) {
            newStatus = 'past_due';
            blockLevel = 'partial';
            results.partialBlocks++;
          } else if (daysOverdue >= config.warning_days) {
            newStatus = 'past_due';
            blockLevel = 'warning';
            results.warningsSent++;
          }

          // Update subscription status
          await supabase
            .from('tenant_subscriptions')
            .update({
              status: newStatus,
              delinquency_stage: blockLevel,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.tenant_subscription_id);

          // Update tenant subscription status for full blocks
          if (blockLevel === 'full') {
            await supabase
              .from('tenants')
              .update({
                subscription_status: 'canceled',
                is_active: false,
              })
              .eq('id', invoice.tenant_id);
          }

          logStep("Delinquency rule applied", { 
            invoiceId: invoice.id, 
            daysOverdue, 
            blockLevel, 
            newStatus 
          });

        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logStep("Error processing delinquency", { invoiceId: invoice.id, error: errMsg });
          results.errors.push(`Delinquency ${invoice.id}: ${errMsg}`);
        }
      }
    }

    // ===========================================
    // STEP 3: Log audit entry
    // ===========================================
    await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'partner-billing-cron',
        executed_at: new Date().toISOString(),
        results: results,
        status: results.errors.length > 0 ? 'partial' : 'success',
      });

    logStep("Cron job completed", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Billing cron job completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Cron job failed";
    logStep("FATAL ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
