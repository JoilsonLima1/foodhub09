import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key verified");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    logStep("Authorization header found");

    // Create user-authenticated client
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user token
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      logStep("Invalid token", { error: userError?.message });
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { planId } = await req.json();
    if (!planId) {
      throw new Error("Plan ID is required");
    }
    logStep("Plan ID received", { planId });

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logStep("Plan not found", { error: planError?.message });
      throw new Error("Plan not found");
    }
    logStep("Plan found", { name: plan.name, price: plan.monthly_price });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Get or create Stripe price
    let priceId = plan.stripe_price_id;
    
    if (!priceId) {
      logStep("Creating Stripe product and price");
      
      // Create product
      const product = await stripe.products.create({
        name: `FoodHub ${plan.name}`,
        description: plan.description || undefined,
        metadata: { plan_id: plan.id }
      });
      
      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.monthly_price * 100), // Convert to cents
        currency: plan.currency.toLowerCase(),
        recurring: { interval: "month" },
        metadata: { plan_id: plan.id }
      });

      priceId = price.id;

      // Update plan with Stripe IDs
      await supabase
        .from("subscription_plans")
        .update({
          stripe_product_id: product.id,
          stripe_price_id: price.id
        })
        .eq("id", plan.id);

      logStep("Stripe product and price created", { productId: product.id, priceId });
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://start-a-new-quest.lovable.app";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          plan_id: plan.id,
          user_id: user.id
        }
      },
      metadata: {
        plan_id: plan.id,
        user_id: user.id
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
