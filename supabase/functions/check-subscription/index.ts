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
  // Source of truth: Super Admin -> system_settings.trial_period
  // Fallback: 14 days
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

function computeTrialEndFromUserCreatedAt(userCreatedAtIso: string, trialDays: number): string {
  const userCreatedAt = new Date(userCreatedAtIso);
  const trialEndDate = new Date(userCreatedAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
  return trialEndDate.toISOString();
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

    // Global trial config (Super Admin) is the single source of truth
    const globalTrialDays = await getGlobalTrialDays(supabaseClient);
    const globalTrialEndIso = computeTrialEndFromUserCreatedAt(user.created_at, globalTrialDays);
    const now = new Date();
    const globalTrialEnd = new Date(globalTrialEndIso);
    const isGlobalTrialActive = globalTrialEnd > now;
    logStep('Global trial computed', {
      globalTrialDays,
      trialEnd: globalTrialEndIso,
      isActive: isGlobalTrialActive,
    });

    // FIRST: Check tenant status in database (for Asaas or any local subscription)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (profile?.tenant_id) {
      const { data: tenant } = await supabaseClient
        .from('tenants')
        .select('subscription_status, subscription_plan_id, subscription_current_period_start, subscription_current_period_end, trial_ends_at, asaas_payment_id')
        .eq('id', profile.tenant_id)
        .single();

      logStep("Tenant found", { 
        tenantId: profile.tenant_id, 
        status: tenant?.subscription_status,
        planId: tenant?.subscription_plan_id,
        hasAsaasPayment: !!tenant?.asaas_payment_id
      });

      // If tenant has an active subscription via Asaas (or any other local method)
      if (tenant?.subscription_status === 'active' && tenant?.subscription_plan_id) {
        const periodEnd = tenant.subscription_current_period_end 
          ? new Date(tenant.subscription_current_period_end)
          : null;
        const now = new Date();

        // Check if subscription is still valid
        if (!periodEnd || periodEnd > now) {
          logStep("Active Asaas/local subscription found", {
            planId: tenant.subscription_plan_id,
            periodEnd: periodEnd?.toISOString()
          });

          return new Response(JSON.stringify({
            subscribed: true,
            is_trialing: false,
            trial_end: null,
            subscription_end: periodEnd?.toISOString() || null,
            product_id: tenant.subscription_plan_id,
            status: 'active'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      // Trial status: ALWAYS computed from Super Admin config (system_settings.trial_period)
      // This prevents inconsistent trial_end dates coming from defaults in the tenants table.
      if (tenant?.subscription_status !== 'active') {
        if (isGlobalTrialActive) {
          return new Response(
            JSON.stringify({
              subscribed: true,
              is_trialing: true,
              trial_end: globalTrialEndIso,
              subscription_end: null,
              product_id: tenant?.subscription_plan_id || null,
              status: 'trialing',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          );
        }
      }
    }

    // SECOND: Check Stripe for subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    // If no Stripe customer exists, fallback to global trial based on Super Admin settings
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
        subscribed: isGlobalTrialActive,
        is_trialing: isGlobalTrialActive,
        trial_end: globalTrialEndIso,
        subscription_end: null,
        product_id: null,
        status: isGlobalTrialActive ? 'trialing' : 'expired'
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
      // Customer exists in Stripe but no active subscription - check if they had a trial
      logStep("No active subscription found for Stripe customer");

      return new Response(JSON.stringify({ 
        subscribed: isGlobalTrialActive,
        is_trialing: isGlobalTrialActive,
        trial_end: globalTrialEndIso,
        subscription_end: null,
        product_id: null,
        status: isGlobalTrialActive ? 'trialing' : 'expired'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const isTrialing = activeSubscription.status === 'trialing';
    const trialEnd = activeSubscription.trial_end 
      ? new Date(activeSubscription.trial_end * 1000).toISOString()
      : null;
    const subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
    const productId = activeSubscription.items.data[0]?.price.product as string;

    logStep("Subscription found", { 
      status: activeSubscription.status,
      isTrialing,
      trialEnd,
      subscriptionEnd,
      productId
    });

    return new Response(JSON.stringify({
      subscribed: true,
      is_trialing: isTrialing,
      trial_end: trialEnd,
      subscription_end: subscriptionEnd,
      product_id: productId,
      status: activeSubscription.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    
    // For temporary auth/session errors, return trial status as fallback
    // This prevents blocking the user due to timing issues during signup
    if (errorMessage.toLowerCase().includes('session') || 
        errorMessage.toLowerCase().includes('auth') ||
        errorMessage.toLowerCase().includes('token')) {
      logStep("Returning trial fallback due to auth error");
      return new Response(JSON.stringify({
        subscribed: true,
        is_trialing: true,
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_end: null,
        product_id: null,
        status: 'trialing'
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
