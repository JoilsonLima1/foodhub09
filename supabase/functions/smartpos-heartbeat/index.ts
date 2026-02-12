import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getServerSecret(): string {
  return Deno.env.get("SERVER_DEVICE_SECRET") ?? "";
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

async function authenticateDevice(supabase: any, secret: string, authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  // Try HMAC-SHA256 (v2) first
  const v2Hash = await hmacHash(secret, token);
  const { data, error } = await supabase
    .from("tenant_devices")
    .select("*")
    .eq("device_key_hash", v2Hash)
    .eq("enabled", true)
    .maybeSingle();

  if (!error && data) return data;

  // Fallback: try legacy SHA-256 (v1) and auto-migrate
  const v1Hash = await plainHash(token);
  const { data: legacyDevice, error: legacyErr } = await supabase
    .from("tenant_devices")
    .select("*")
    .eq("device_key_hash", v1Hash)
    .eq("enabled", true)
    .eq("key_hash_version", 1)
    .maybeSingle();

  if (!legacyErr && legacyDevice) {
    // Auto-migrate to HMAC-SHA256
    await supabase
      .from("tenant_devices")
      .update({ device_key_hash: v2Hash, key_hash_version: 2 })
      .eq("id", legacyDevice.id);
    return legacyDevice;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = getServerSecret();
    if (!secret || secret.length < 32) {
      console.error("SERVER_DEVICE_SECRET not configured or too short");
      return new Response(
        JSON.stringify({ error: "SmartPOS não configurado. Contate o administrador para configurar o segredo do servidor.", code: "SMARTPOS_NOT_CONFIGURED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const device = await authenticateDevice(supabase, secret, req.headers.get("Authorization"));
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
