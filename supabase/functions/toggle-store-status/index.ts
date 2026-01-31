import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ToggleRequest {
  store_id: string;
  is_active: boolean;
}

interface ToggleResponse {
  success: boolean;
  message?: string;
  blockReason?: "headquarters" | "active_orders" | "no_permission";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, message: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's tenant and roles
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(
        JSON.stringify({ success: false, message: "Usuário sem tenant associado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user roles
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map((r) => r.role) || [];
    const canManage = userRoles.includes("admin") || userRoles.includes("manager");

    if (!canManage) {
      const response: ToggleResponse = {
        success: false,
        message: "Você não tem permissão para alterar o status da loja.",
        blockReason: "no_permission",
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { store_id, is_active }: ToggleRequest = await req.json();

    if (!store_id) {
      return new Response(
        JSON.stringify({ success: false, message: "ID da loja é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the store
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("id", store_id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (storeError || !store) {
      console.error("Store fetch error:", storeError);
      return new Response(
        JSON.stringify({ success: false, message: "Loja não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validation: Cannot deactivate headquarters
    if (!is_active && store.is_headquarters) {
      const response: ToggleResponse = {
        success: false,
        message: "A loja matriz não pode ser desativada.",
        blockReason: "headquarters",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validation: Check for active orders when deactivating
    if (!is_active) {
      const { data: activeOrders, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("store_id", store_id)
        .in("status", ["confirmed", "preparing", "ready", "out_for_delivery"])
        .limit(1);

      if (ordersError) {
        console.error("Orders check error:", ordersError);
      }

      if (activeOrders && activeOrders.length > 0) {
        const response: ToggleResponse = {
          success: false,
          message: "Não é possível desativar esta loja pois existem pedidos em andamento.",
          blockReason: "active_orders",
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Perform the update
    const { error: updateError } = await supabaseAdmin
      .from("stores")
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", store_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao atualizar status da loja" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to audit_logs
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      entity_type: "store",
      entity_id: store_id,
      action: is_active ? "store_activated" : "store_deactivated",
      old_data: { is_active: !is_active, store_name: store.name },
      new_data: { is_active, store_name: store.name },
    });

    console.log(`Store ${store_id} status changed to ${is_active ? "active" : "inactive"} by user ${user.id}`);

    const response: ToggleResponse = {
      success: true,
      message: is_active ? "Loja ativada com sucesso" : "Loja desativada com sucesso",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
