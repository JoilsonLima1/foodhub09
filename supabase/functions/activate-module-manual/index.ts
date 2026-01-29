import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-MODULE-MANUAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    // Create clients
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user is super_admin
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error("Authentication required");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Check super_admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      logStep("Unauthorized - not super_admin");
      return new Response(
        JSON.stringify({ error: "Apenas Super Admins podem ativar módulos manualmente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get request body
    const { 
      tenantId, 
      moduleId, 
      pricePaid, 
      paymentMethod = 'pix',
      paymentProvider = 'asaas',
      asaasPaymentId,
      notes
    } = await req.json();

    if (!tenantId || !moduleId) {
      throw new Error("tenantId e moduleId são obrigatórios");
    }

    logStep("Activation request", { tenantId, moduleId, pricePaid, paymentMethod });

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error("Tenant não encontrado");
    }

    // Verify module exists
    const { data: module, error: moduleError } = await supabase
      .from("addon_modules")
      .select("id, name, monthly_price, slug")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      throw new Error("Módulo não encontrado");
    }

    logStep("Entities verified", { tenant: tenant.name, module: module.name });

    // Check if already active
    const { data: existingSub } = await supabase
      .from("tenant_addon_subscriptions")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("addon_module_id", moduleId)
      .in("status", ["active", "trial"])
      .maybeSingle();

    if (existingSub) {
      logStep("Module already active", { subscriptionId: existingSub.id });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Módulo já está ativo para este tenant",
          existingSubscription: existingSub.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Calculate dates
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);
    const nextBillingDate = new Date(expiresAt);

    // Create or update subscription
    const { data: subscription, error: upsertError } = await supabase
      .from("tenant_addon_subscriptions")
      .upsert({
        tenant_id: tenantId,
        addon_module_id: moduleId,
        status: 'active',
        source: 'purchase',
        is_free: false,
        price_paid: pricePaid || module.monthly_price,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        purchased_at: now.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        asaas_payment_id: asaasPaymentId || null,
        billing_mode: 'separate'
      }, {
        onConflict: 'tenant_id,addon_module_id'
      })
      .select()
      .single();

    if (upsertError) {
      logStep("Failed to create subscription", { error: upsertError.message });
      throw new Error("Falha ao ativar módulo: " + upsertError.message);
    }

    logStep("Module activated successfully", { 
      subscriptionId: subscription.id,
      tenant: tenant.name,
      module: module.name,
      pricePaid: pricePaid || module.monthly_price,
      expiresAt: expiresAt.toISOString()
    });

    // Log to audit
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      entity_type: "tenant_addon_subscription",
      entity_id: subscription.id,
      action: "manual_activation",
      user_id: user.id,
      new_data: {
        module_name: module.name,
        module_slug: module.slug,
        price_paid: pricePaid || module.monthly_price,
        payment_method: paymentMethod,
        payment_provider: paymentProvider,
        asaas_payment_id: asaasPaymentId,
        notes: notes,
        activated_by: user.email
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Módulo "${module.name}" ativado com sucesso para "${tenant.name}"`,
        subscription: {
          id: subscription.id,
          module: module.name,
          tenant: tenant.name,
          status: 'active',
          price_paid: pricePaid || module.monthly_price,
          expires_at: expiresAt.toISOString(),
          next_billing_date: nextBillingDate.toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Activation failed";
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
