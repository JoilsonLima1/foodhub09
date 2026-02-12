import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getDeviceSecret(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "smartpos_device_secret")
    .maybeSingle();
  if (error || !data) return null;
  const val = data.setting_value as unknown as string;
  return val && val.length > 0 ? val : null;
}

async function hmacHash(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function plainHash(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(message));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function authenticateDevice(supabase: any, authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  // Try HMAC-SHA256 first (if secret configured), fallback to plain SHA-256
  const secret = await getDeviceSecret(supabase);
  const tokenHash = secret
    ? await hmacHash(secret, token)
    : await plainHash(token);

  const { data, error } = await supabase
    .from("tenant_devices")
    .select("*")
    .eq("device_key_hash", tokenHash)
    .eq("enabled", true)
    .maybeSingle();

  if (error || !data) {
    // If HMAC failed and secret exists, also try plain hash for backwards compat
    if (secret) {
      const fallbackHash = await plainHash(token);
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from("tenant_devices")
        .select("*")
        .eq("device_key_hash", fallbackHash)
        .eq("enabled", true)
        .maybeSingle();
      if (!fallbackErr && fallbackData) return fallbackData;
    }
    return null;
  }
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
