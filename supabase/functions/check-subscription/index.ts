import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

async function getGlobalTrialDays(supabaseClient: any): Promise<number> {
  try {
    const { data, error } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'trial_period')
      .maybeSingle();

    if (error) {
      logStep('Trial period settings lookup error', { message: error.message });
      return 14;
    }

    const days = (data?.setting_value as { days?: number } | null)?.days;
    return typeof days === 'number' && Number.isFinite(days) ? days : 14;
  } catch (e) {
    logStep('Trial period settings lookup exception', { error: String(e) });
    return 14;
  }
}

interface TrialInfo {
  trialStartDate: string;
  trialEndDate: string;
  totalTrialDays: number;
  daysUsed: number;
  daysRemaining: number;
  isTrialActive: boolean;
}

function computeTrialInfo(createdAtIso: string, trialDays: number): TrialInfo {
  const trialStart = new Date(createdAtIso);
  const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  const daysUsed = Math.max(0, Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, trialDays - daysUsed);
  const isTrialActive = trialEnd > now;
  
  return {
    trialStartDate: trialStart.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    totalTrialDays: trialDays,
    daysUsed,
    daysRemaining,
    isTrialActive,
  };
}

function computeNextPaymentDate(subscriptionDate: string, daysRemainingFromTrial: number): string {
  const subDate = new Date(subscriptionDate);
  // Next payment = subscription date + remaining trial days + 30 days (billing cycle)
  const nextPayment = new Date(subDate.getTime() + (daysRemainingFromTrial + 30) * 24 * 60 * 60 * 1000);
  return nextPayment.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get global trial config
    const globalTrialDays = await getGlobalTrialDays(supabaseClient);
    
    // Compute trial info based on user registration date
    const trialInfo = computeTrialInfo(user.created_at, globalTrialDays);
    logStep('Trial info computed', {
      trialStart: trialInfo.trialStartDate,
      trialEnd: trialInfo.trialEndDate,
      daysUsed: trialInfo.daysUsed,
      daysRemaining: trialInfo.daysRemaining,
      isActive: trialInfo.isTrialActive,
    });

    // Get tenant info
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    let tenantPlanId: string | null = null;
    let subscriptionDate: string | null = null;
    let tenant: any = null;

    if (profile?.tenant_id) {
      const { data: tenantData } = await supabaseClient
        .from('tenants')
        .select('subscription_status, subscription_plan_id, subscription_current_period_start, subscription_current_period_end, trial_ends_at, asaas_payment_id, created_at')
        .eq('id', profile.tenant_id)
        .single();

      tenant = tenantData;
      tenantPlanId = tenant?.subscription_plan_id || null;
      
      logStep("Tenant found", { 
        tenantId: profile.tenant_id, 
        status: tenant?.subscription_status,
        planId: tenant?.subscription_plan_id,
        hasAsaasPayment: !!tenant?.asaas_payment_id
      });

      // If tenant has an active subscription via Asaas (or any other local method)
      if (tenant?.subscription_status === 'active' && tenant?.subscription_plan_id) {
        subscriptionDate = tenant.subscription_current_period_start;
        const periodEnd = tenant.subscription_current_period_end 
          ? new Date(tenant.subscription_current_period_end)
          : null;
        const now = new Date();

        // Check if subscription is still valid
        if (!periodEnd || periodEnd > now) {
          // Calculate next payment considering remaining trial benefit
          let nextPaymentDate = periodEnd?.toISOString() || null;
          
          // If subscription started during trial, user still benefits from remaining trial days
          if (subscriptionDate && trialInfo.daysRemaining > 0) {
            nextPaymentDate = computeNextPaymentDate(subscriptionDate, trialInfo.daysRemaining);
          }

          logStep("Active Asaas/local subscription found", {
            planId: tenant.subscription_plan_id,
            periodEnd: periodEnd?.toISOString(),
            nextPayment: nextPaymentDate
          });

          return new Response(JSON.stringify({
            subscribed: true,
            is_trialing: false,
            trial_start: trialInfo.trialStartDate,
            trial_end: trialInfo.trialEndDate,
            total_trial_days: trialInfo.totalTrialDays,
            days_used: trialInfo.daysUsed,
            days_remaining: trialInfo.daysRemaining,
            subscription_start: subscriptionDate,
            subscription_end: nextPaymentDate,
            product_id: tenant.subscription_plan_id,
            status: 'active',
            has_trial_benefit: trialInfo.daysRemaining > 0,
            trial_benefit_message: trialInfo.daysRemaining > 0 
              ? `Você utilizou ${trialInfo.daysUsed} dias do período de teste e ainda possui ${trialInfo.daysRemaining} dias gratuitos restantes.`
              : null
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      // User has contracted a plan but is still in trial period
      if (tenant?.subscription_plan_id && tenant?.subscription_status !== 'active' && trialInfo.isTrialActive) {
        const subDate = tenant.subscription_current_period_start || new Date().toISOString();
        const nextPaymentDate = computeNextPaymentDate(subDate, trialInfo.daysRemaining);

        return new Response(JSON.stringify({
          subscribed: true,
          is_trialing: true,
          trial_start: trialInfo.trialStartDate,
          trial_end: trialInfo.trialEndDate,
          total_trial_days: trialInfo.totalTrialDays,
          days_used: trialInfo.daysUsed,
          days_remaining: trialInfo.daysRemaining,
          subscription_start: subscriptionDate,
          subscription_end: nextPaymentDate,
          product_id: tenant.subscription_plan_id,
          status: 'trialing',
          has_contracted_plan: true,
          has_trial_benefit: true,
          trial_benefit_message: `Você utilizou ${trialInfo.daysUsed} dias do período de teste e ainda possui ${trialInfo.daysRemaining} dias gratuitos restantes.`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Pure trial without any plan contracted
      if (tenant?.subscription_status !== 'active' && !tenant?.subscription_plan_id) {
        if (trialInfo.isTrialActive) {
          return new Response(JSON.stringify({
            subscribed: true,
            is_trialing: true,
            trial_start: trialInfo.trialStartDate,
            trial_end: trialInfo.trialEndDate,
            total_trial_days: trialInfo.totalTrialDays,
            days_used: trialInfo.daysUsed,
            days_remaining: trialInfo.daysRemaining,
            subscription_start: null,
            subscription_end: null,
            product_id: null,
            status: 'trialing',
            has_contracted_plan: false,
            has_trial_benefit: false,
            trial_benefit_message: null
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    // SECOND: Check Stripe for subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    // If no Stripe customer exists, return trial info
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
        subscribed: trialInfo.isTrialActive,
        is_trialing: trialInfo.isTrialActive,
        trial_start: trialInfo.trialStartDate,
        trial_end: trialInfo.trialEndDate,
        total_trial_days: trialInfo.totalTrialDays,
        days_used: trialInfo.daysUsed,
        days_remaining: trialInfo.daysRemaining,
        subscription_start: null,
        subscription_end: null,
        product_id: tenantPlanId,
        status: trialInfo.isTrialActive ? 'trialing' : 'expired',
        has_contracted_plan: !!tenantPlanId,
        has_trial_benefit: false,
        trial_benefit_message: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for any active or trialing subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    // Find active or trialing subscription
    const activeSubscription = subscriptions.data.find(
      (sub: Stripe.Subscription) => sub.status === 'active' || sub.status === 'trialing'
    );

    if (!activeSubscription) {
      logStep("No active subscription found for Stripe customer");

      return new Response(JSON.stringify({ 
        subscribed: trialInfo.isTrialActive,
        is_trialing: trialInfo.isTrialActive,
        trial_start: trialInfo.trialStartDate,
        trial_end: trialInfo.trialEndDate,
        total_trial_days: trialInfo.totalTrialDays,
        days_used: trialInfo.daysUsed,
        days_remaining: trialInfo.daysRemaining,
        subscription_start: null,
        subscription_end: null,
        product_id: tenantPlanId,
        status: trialInfo.isTrialActive ? 'trialing' : 'expired',
        has_contracted_plan: !!tenantPlanId,
        has_trial_benefit: false,
        trial_benefit_message: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const isStripeTrialing = activeSubscription.status === 'trialing';
    const stripeTrialEnd = activeSubscription.trial_end 
      ? new Date(activeSubscription.trial_end * 1000).toISOString()
      : null;
    const subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
    const subscriptionStart = new Date(activeSubscription.current_period_start * 1000).toISOString();
    const productId = activeSubscription.items.data[0]?.price.product as string;

    // Calculate next payment with trial benefit
    let nextPaymentDate = subscriptionEnd;
    if (trialInfo.daysRemaining > 0 && subscriptionStart) {
      nextPaymentDate = computeNextPaymentDate(subscriptionStart, trialInfo.daysRemaining);
    }

    logStep("Subscription found", { 
      status: activeSubscription.status,
      isTrialing: isStripeTrialing,
      trialEnd: stripeTrialEnd,
      subscriptionEnd,
      productId
    });

    return new Response(JSON.stringify({
      subscribed: true,
      is_trialing: isStripeTrialing,
      trial_start: trialInfo.trialStartDate,
      trial_end: stripeTrialEnd || trialInfo.trialEndDate,
      total_trial_days: trialInfo.totalTrialDays,
      days_used: trialInfo.daysUsed,
      days_remaining: trialInfo.daysRemaining,
      subscription_start: subscriptionStart,
      subscription_end: nextPaymentDate,
      product_id: productId,
      status: activeSubscription.status,
      has_trial_benefit: trialInfo.daysRemaining > 0,
      trial_benefit_message: trialInfo.daysRemaining > 0 
        ? `Você utilizou ${trialInfo.daysUsed} dias do período de teste e ainda possui ${trialInfo.daysRemaining} dias gratuitos restantes.`
        : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    
    // For temporary auth/session errors, return trial status as fallback
    if (errorMessage.toLowerCase().includes('session') || 
        errorMessage.toLowerCase().includes('auth') ||
        errorMessage.toLowerCase().includes('token')) {
      logStep("Returning trial fallback due to auth error");
      return new Response(JSON.stringify({
        subscribed: true,
        is_trialing: true,
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        total_trial_days: 30,
        days_used: 0,
        days_remaining: 30,
        subscription_start: null,
        subscription_end: null,
        product_id: null,
        status: 'trialing',
        has_trial_benefit: false,
        trial_benefit_message: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    return new Response(JSON.stringify({ error: "An error occurred while checking subscription status" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
