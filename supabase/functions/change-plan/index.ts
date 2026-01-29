import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChangePlanRequest {
  targetPlanId: string;
  changeType: "upgrade" | "downgrade";
  currentPlanId: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[change-plan] No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the user's token
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("[change-plan] Invalid token:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log("[change-plan] User authenticated:", userId);

    // Parse request body
    const body: ChangePlanRequest = await req.json();
    const { targetPlanId, changeType, currentPlanId } = body;

    console.log("[change-plan] Request:", { targetPlanId, changeType, currentPlanId });

    if (!targetPlanId) {
      return new Response(
        JSON.stringify({ error: "Target plan ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's profile and tenant
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.tenant_id) {
      console.error("[change-plan] Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = profile.tenant_id;
    console.log("[change-plan] Tenant ID:", tenantId);

    // Get current tenant data
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("subscription_plan_id, subscription_status")
      .eq("id", tenantId)
      .single();

    if (tenantError) {
      console.error("[change-plan] Tenant not found:", tenantError);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the current plan matches (security check)
    if (currentPlanId && tenant.subscription_plan_id !== currentPlanId) {
      console.error("[change-plan] Plan mismatch:", { 
        expected: currentPlanId, 
        actual: tenant.subscription_plan_id 
      });
      return new Response(
        JSON.stringify({ error: "Current plan mismatch. Please refresh and try again." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify target plan exists and is active
    const { data: targetPlan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, name, slug, is_active, monthly_price, display_order")
      .eq("id", targetPlanId)
      .single();

    if (planError || !targetPlan) {
      console.error("[change-plan] Target plan not found:", planError);
      return new Response(
        JSON.stringify({ error: "Target plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetPlan.is_active) {
      return new Response(
        JSON.stringify({ error: "Target plan is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current plan details for comparison
    let currentPlanOrder = 0;
    if (tenant.subscription_plan_id) {
      const { data: currentPlan } = await supabaseAdmin
        .from("subscription_plans")
        .select("display_order, monthly_price")
        .eq("id", tenant.subscription_plan_id)
        .single();
      
      if (currentPlan) {
        currentPlanOrder = currentPlan.display_order ?? currentPlan.monthly_price;
      }
    }

    const targetPlanOrder = targetPlan.display_order ?? targetPlan.monthly_price;
    
    // Verify change type is correct (security check)
    const actualChangeType = targetPlanOrder > currentPlanOrder ? "upgrade" : "downgrade";
    
    if (changeType !== actualChangeType && tenant.subscription_plan_id) {
      console.error("[change-plan] Change type mismatch:", { expected: changeType, actual: actualChangeType });
      return new Response(
        JSON.stringify({ error: "Change type mismatch. Please refresh and try again." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update tenant's subscription plan
    const updateData: Record<string, any> = {
      subscription_plan_id: targetPlanId,
      updated_at: new Date().toISOString(),
    };

    // If this is a new subscription (no current plan), also set status
    if (!tenant.subscription_plan_id || tenant.subscription_status !== 'active') {
      updateData.subscription_status = 'active';
    }

    const { error: updateError } = await supabaseAdmin
      .from("tenants")
      .update(updateData)
      .eq("id", tenantId);

    if (updateError) {
      console.error("[change-plan] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[change-plan] Plan updated successfully:", {
      tenantId,
      newPlanId: targetPlanId,
      changeType: actualChangeType,
    });

    // Log the plan change for audit
    try {
      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        user_id: userId,
        entity_type: "subscription",
        entity_id: tenantId,
        action: changeType === "upgrade" ? "plan_upgrade" : "plan_downgrade",
        old_data: { plan_id: tenant.subscription_plan_id },
        new_data: { plan_id: targetPlanId, plan_name: targetPlan.name },
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error("[change-plan] Audit log error:", auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plan ${changeType === "upgrade" ? "upgraded" : "changed"} successfully`,
        newPlanId: targetPlanId,
        newPlanName: targetPlan.name,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("[change-plan] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
