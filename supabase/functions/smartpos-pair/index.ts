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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, deviceInfo } = await req.json();

    if (!code || !deviceInfo?.name) {
      return new Response(
        JSON.stringify({ error: "code and deviceInfo.name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find valid pairing code
    const { data: pairingCode, error: pcError } = await supabase
      .from("device_pairing_codes")
      .select("*")
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pcError || !pairingCode) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired pairing code" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate device API key (raw token)
    const rawBytes = new Uint8Array(32);
    crypto.getRandomValues(rawBytes);
    const deviceApiKey = Array.from(rawBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Hash using HMAC if secret configured, otherwise plain SHA-256
    const secret = await getDeviceSecret(supabase);
    const deviceKeyHash = secret
      ? await hmacHash(secret, deviceApiKey)
      : await plainHash(deviceApiKey);

    // Create device
    const { data: device, error: devError } = await supabase
      .from("tenant_devices")
      .insert({
        tenant_id: pairingCode.tenant_id,
        name: deviceInfo.name,
        model: deviceInfo.model || null,
        serial: deviceInfo.serial || null,
        platform: "smartpos",
        device_key_hash: deviceKeyHash,
        status: "online",
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (devError) {
      console.error("Device creation error:", devError);
      return new Response(
        JSON.stringify({ error: "Failed to create device" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark pairing code as used
    await supabase
      .from("device_pairing_codes")
      .update({ used_at: new Date().toISOString(), used_by_device_id: device.id })
      .eq("id", pairingCode.id);

    // Log pairing event
    await supabase.from("device_events").insert({
      tenant_id: pairingCode.tenant_id,
      device_id: device.id,
      event_type: "paired",
      message: `Device ${deviceInfo.name} paired successfully`,
      meta: { model: deviceInfo.model, serial: deviceInfo.serial },
    });

    return new Response(
      JSON.stringify({
        device_id: device.id,
        tenant_id: pairingCode.tenant_id,
        device_api_key: deviceApiKey,
        config: {
          polling_interval_sec: 5,
          api_base: Deno.env.get("SUPABASE_URL") + "/functions/v1",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("smartpos-pair error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
