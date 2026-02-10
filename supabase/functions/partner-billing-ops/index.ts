/**
 * partner-billing-ops — Edge function for partner billing operations (Passo 5)
 * Actions: generate_gateway_invoice, mark_invoice_paid, run_monthly_billing
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, partner_id, invoice_id, period } = await req.json();

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) throw new Error('Unauthorized');
    }

    let result: any;

    switch (action) {
      case 'generate_invoice': {
        // Generate monthly AR invoice for a partner
        if (!partner_id || !period) throw new Error('partner_id and period required');

        const { data, error } = await supabase.rpc('generate_partner_monthly_invoice', {
          p_partner_id: partner_id,
          p_period: period,
        });
        if (error) throw error;
        result = data;
        break;
      }

      case 'create_gateway_charge': {
        // Create payment via Asaas for an AR invoice
        if (!invoice_id) throw new Error('invoice_id required');

        const { data: invoice, error: invErr } = await supabase
          .from('partner_ar_invoices')
          .select('*, partner:partners(id, name, email, document)')
          .eq('id', invoice_id)
          .single();
        if (invErr) throw invErr;

        // Check if Asaas key is configured
        const asaasKey = Deno.env.get('ASAAS_API_KEY');
        if (!asaasKey) {
          result = { ok: false, error: 'asaas_not_configured', message: 'ASAAS_API_KEY not set' };
          break;
        }

        const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3';

        // Get or create Asaas customer for partner
        const { data: billingConfig } = await supabase
          .from('partner_billing_config')
          .select('*')
          .eq('partner_id', invoice.partner_id)
          .single();

        let asaasCustomerId: string | null = null;

        // Check existing gateway metadata
        const existingMeta = (billingConfig as any)?.notes;
        if (existingMeta) {
          try {
            const parsed = JSON.parse(existingMeta);
            asaasCustomerId = parsed.asaas_customer_id || null;
          } catch { /* ignore */ }
        }

        // Create customer if needed
        if (!asaasCustomerId && invoice.partner) {
          const customerRes = await fetch(`${asaasBaseUrl}/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'access_token': asaasKey,
            },
            body: JSON.stringify({
              name: invoice.partner.name,
              email: invoice.partner.email,
              cpfCnpj: invoice.partner.document?.replace(/\D/g, ''),
              notificationDisabled: false,
            }),
          });
          const customerData = await customerRes.json();
          if (customerData.id) {
            asaasCustomerId = customerData.id;
            // Save to notes as JSON
            await supabase
              .from('partner_billing_config')
              .update({ notes: JSON.stringify({ asaas_customer_id: asaasCustomerId }) })
              .eq('partner_id', invoice.partner_id);
          }
        }

        if (!asaasCustomerId) {
          result = { ok: false, error: 'customer_creation_failed' };
          break;
        }

        // Determine billing type from collection_mode
        const billingTypeMap: Record<string, string> = {
          'PIX': 'PIX',
          'BOLETO': 'BOLETO',
          'CARD': 'CREDIT_CARD',
          'INVOICE': 'BOLETO',
        };

        const billingType = billingTypeMap[billingConfig?.collection_mode || 'BOLETO'] || 'BOLETO';

        // Create payment in Asaas
        const paymentRes = await fetch(`${asaasBaseUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': asaasKey,
          },
          body: JSON.stringify({
            customer: asaasCustomerId,
            billingType,
            value: invoice.amount,
            dueDate: invoice.due_date,
            description: invoice.description || `Fatura ${invoice.invoice_number}`,
            externalReference: invoice.id,
          }),
        });
        const paymentData = await paymentRes.json();

        if (paymentData.id) {
          // Update invoice with gateway info
          await supabase
            .from('partner_ar_invoices')
            .update({
              gateway_payment_id: paymentData.id,
              gateway_invoice_url: paymentData.invoiceUrl || paymentData.bankSlipUrl || null,
              payment_method: billingType,
            })
            .eq('id', invoice_id);

          result = {
            ok: true,
            payment_id: paymentData.id,
            invoice_url: paymentData.invoiceUrl || paymentData.bankSlipUrl,
            billing_type: billingType,
          };
        } else {
          result = { ok: false, error: 'payment_creation_failed', details: paymentData };
        }
        break;
      }

      case 'mark_paid': {
        // Manually mark an AR invoice as paid
        if (!invoice_id) throw new Error('invoice_id required');

        const { error } = await supabase
          .from('partner_ar_invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', invoice_id);
        if (error) throw error;

        // Update ledger entries
        await supabase
          .from('partner_fee_ledger')
          .update({ status: 'paid' })
          .eq('ar_invoice_id', invoice_id);

        // Refresh access state
        const { data: inv } = await supabase
          .from('partner_ar_invoices')
          .select('partner_id')
          .eq('id', invoice_id)
          .single();

        if (inv) {
          await supabase.rpc('get_partner_access_state', { p_partner_id: inv.partner_id });
        }

        result = { ok: true, status: 'paid' };
        break;
      }

      case 'run_monthly_billing': {
        // Batch: generate invoices for all active partners for a period
        if (!period) throw new Error('period required');

        const { data: configs } = await supabase
          .from('partner_billing_config')
          .select('partner_id')
          .eq('is_active', true);

        const results: any[] = [];
        for (const cfg of configs || []) {
          const { data } = await supabase.rpc('generate_partner_monthly_invoice', {
            p_partner_id: cfg.partner_id,
            p_period: period,
          });
          results.push({ partner_id: cfg.partner_id, result: data });
        }

        result = { ok: true, processed: results.length, results };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
