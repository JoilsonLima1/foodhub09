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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    const secondLast = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : null;

    // ─── CLAIM ───
    if (lastPart === "claim" && req.method === "POST") {
      let limit = 5;
      try {
        const body = await req.json();
        if (body?.limit && Number(body.limit) > 0 && Number(body.limit) <= 20) {
          limit = Number(body.limit);
        }
      } catch {}

      await supabase
        .from("tenant_devices")
        .update({ status: "online", last_seen_at: new Date().toISOString() })
        .eq("id", device.id);

      const { data: jobs, error: claimError } = await supabase.rpc("claim_print_jobs", {
        p_tenant_id: device.tenant_id,
        p_device_id: device.id,
        p_limit: limit,
      });

      if (claimError) {
        console.error("Claim error:", claimError);
        return new Response(
          JSON.stringify({ error: "Failed to claim jobs" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (jobs && jobs.length > 0) {
        const events = jobs.map((j: any) => ({
          tenant_id: device.tenant_id,
          device_id: device.id,
          event_type: "job_claimed",
          message: `Claimed job ${j.id} (${j.job_type})`,
          meta: { job_id: j.id, job_type: j.job_type },
        }));
        await supabase.from("device_events").insert(events);
      }

      return new Response(JSON.stringify({ jobs: jobs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACK ───
    if (lastPart === "ack" && secondLast && req.method === "POST") {
      const jobId = secondLast;
      const body = await req.json();
      const { status, error: ackError } = body;

      if (!status || !["printing", "printed", "failed"].includes(status)) {
        return new Response(
          JSON.stringify({ error: "status must be printing|printed|failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: job, error: fetchErr } = await supabase
        .from("print_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("tenant_id", device.tenant_id)
        .maybeSingle();

      if (fetchErr || !job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      if (status === "printing") {
        updates.status = "printing";
      } else if (status === "printed") {
        updates.status = "printed";
        updates.printed_at = new Date().toISOString();
      } else if (status === "failed") {
        const newAttempts = (job.attempts || 0) + 1;
        updates.attempts = newAttempts;
        updates.last_error = ackError || "Unknown error";
        if (newAttempts < job.max_attempts) {
          updates.status = "queued";
          updates.claimed_at = null;
          updates.device_id = null;
          const backoffMs = Math.pow(2, newAttempts) * 5000;
          updates.available_at = new Date(Date.now() + backoffMs).toISOString();
        } else {
          updates.status = "failed";
        }
      }

      await supabase.from("print_jobs").update(updates).eq("id", jobId);

      await supabase.from("device_events").insert({
        tenant_id: device.tenant_id,
        device_id: device.id,
        event_type: status === "printed" ? "job_printed" : status === "failed" ? "job_failed" : "job_printing",
        level: status === "failed" ? "error" : "info",
        message: `Job ${jobId} -> ${status}`,
        meta: { job_id: jobId, error: ackError || null, attempts: updates.attempts },
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DIAGNOSTIC ───
    if (lastPart === "diagnostic" && req.method === "GET") {
      const { data: counts } = await supabase
        .from("print_jobs")
        .select("status")
        .eq("tenant_id", device.tenant_id)
        .in("status", ["queued", "claimed", "failed"]);

      const summary = { queued: 0, claimed: 0, failed: 0 };
      (counts || []).forEach((r: any) => {
        if (summary[r.status as keyof typeof summary] !== undefined) {
          summary[r.status as keyof typeof summary]++;
        }
      });

      return new Response(
        JSON.stringify({
          device: { id: device.id, name: device.name, model: device.model, status: device.status },
          jobs: summary,
          server_time: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("smartpos-jobs error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
