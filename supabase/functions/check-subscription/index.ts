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

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    // If no Stripe customer exists, check for automatic trial based on user creation date
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking automatic trial");
      
      // Get trial period from system settings
      const { data: trialSettings, error: settingsError } = await supabaseClient.rpc('get_public_settings');
      
      let trialDays = 14; // Default trial period
      if (!settingsError && trialSettings) {
        const trialPeriodSetting = trialSettings.find((s: { setting_key: string; setting_value: unknown }) => s.setting_key === 'trial_period');
        if (trialPeriodSetting?.setting_value) {
          const trialValue = trialPeriodSetting.setting_value as { days?: number };
          trialDays = trialValue.days ?? 14;
        }
      }
      logStep("Trial period from settings", { trialDays });

      // Calculate trial end date based on user creation
      const userCreatedAt = new Date(user.created_at);
      const trialEndDate = new Date(userCreatedAt.getTime() + (trialDays * 24 * 60 * 60 * 1000));
      const now = new Date();
      
      const isTrialActive = trialEndDate > now;
      
      logStep("Automatic trial status", { 
        userCreatedAt: userCreatedAt.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        isTrialActive 
      });

      return new Response(JSON.stringify({ 
        subscribed: isTrialActive, // User has access during trial
        is_trialing: isTrialActive,
        trial_end: trialEndDate.toISOString(),
        subscription_end: null,
        product_id: null,
        status: isTrialActive ? 'trialing' : 'expired'
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
      
      // Get trial period from system settings for fallback trial check
      const { data: trialSettings } = await supabaseClient.rpc('get_public_settings');
      
      let trialDays = 14;
      if (trialSettings) {
        const trialPeriodSetting = trialSettings.find((s: { setting_key: string; setting_value: unknown }) => s.setting_key === 'trial_period');
        if (trialPeriodSetting?.setting_value) {
          const trialValue = trialPeriodSetting.setting_value as { days?: number };
          trialDays = trialValue.days ?? 14;
        }
      }

      // Calculate trial end date based on user creation
      const userCreatedAt = new Date(user.created_at);
      const trialEndDate = new Date(userCreatedAt.getTime() + (trialDays * 24 * 60 * 60 * 1000));
      const now = new Date();
      
      const isTrialActive = trialEndDate > now;
      
      logStep("Fallback trial check", { 
        userCreatedAt: userCreatedAt.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        isTrialActive 
      });

      return new Response(JSON.stringify({ 
        subscribed: isTrialActive,
        is_trialing: isTrialActive,
        trial_end: trialEndDate.toISOString(),
        subscription_end: null,
        product_id: null,
        status: isTrialActive ? 'trialing' : 'expired'
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
    return new Response(JSON.stringify({ error: "An error occurred while checking subscription status" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
