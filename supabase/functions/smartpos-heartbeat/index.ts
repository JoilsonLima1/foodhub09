import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function authenticateDevice(supabase: any, authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data, error } = await supabase
    .from("tenant_devices")
    .select("*")
    .eq("device_key_hash", tokenHash)
    .eq("enabled", true)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const device = await authenticateDevice(supabase, req.headers.get("Authorization"));
    if (!device) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update device status
    await supabase
      .from("tenant_devices")
      .update({ status: "online", last_seen_at: new Date().toISOString() })
      .eq("id", device.id);

    // Parse optional meta from body
    let meta: any = null;
    try {
      const body = await req.json();
      meta = body?.meta || null;
    } catch {
      // No body is fine
    }

    // Log heartbeat event
    await supabase.from("device_events").insert({
      tenant_id: device.tenant_id,
      device_id: device.id,
      event_type: "heartbeat",
      message: "Device heartbeat",
      meta,
    });

    return new Response(
      JSON.stringify({ ok: true, server_time: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("smartpos-heartbeat error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
