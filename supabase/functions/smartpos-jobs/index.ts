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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Routes: /smartpos-jobs/claim  or  /smartpos-jobs/:id/ack  or /smartpos-jobs/diagnostic

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

      // Update heartbeat on claim
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

      // Log claims
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

      // Verify job belongs to this device/tenant
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
          // Re-queue for retry
          updates.status = "queued";
          updates.claimed_at = null;
          updates.device_id = null;
        } else {
          updates.status = "failed";
        }
      }

      await supabase.from("print_jobs").update(updates).eq("id", jobId);

      // Log event
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
