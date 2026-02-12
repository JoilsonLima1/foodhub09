import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-auth-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept token from Authorization header or x-auth-token
    let token = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }
    if (!token) {
      token = req.headers.get("x-auth-token") ?? "";
    }

    if (!token) {
      return new Response(JSON.stringify({ configured: false, reason: "UNAUTHORIZED" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      console.error("smartpos-config-status auth error:", authErr?.message);
      return new Response(JSON.stringify({ configured: false, reason: "UNAUTHORIZED" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "super_admin") {
      return new Response(JSON.stringify({ configured: false, reason: "FORBIDDEN" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("SERVER_DEVICE_SECRET") ?? "";
    if (!secret || secret.length < 32) {
      return new Response(
        JSON.stringify({ configured: false, reason: "SECRET_ABSENT" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ configured: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("smartpos-config-status error:", err);
    return new Response(
      JSON.stringify({ configured: false, reason: "INTERNAL_ERROR", detail: "check logs" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
