import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Hop = {
  url: string;
  status: number;
  location: string | null;
  contentType: string | null;
  server: string | null;
  cacheControl: string | null;
  via: string | null;
  date: string | null;
  bodySnippet: string | null;
  detected: {
    metaRefreshToAuth: boolean;
    scriptRedirectToAuth: boolean;
  };
};

function resolveLocation(currentUrl: string, location: string) {
  // Supports relative redirects.
  return new URL(location, currentUrl).toString();
}

async function fetchRedirectChain(url: string, maxHops = 10): Promise<Hop[]> {
  const chain: Hop[] = [];
  let current = url;

  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        // Avoid cached redirects skewing results.
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    const location = res.headers.get("location");
    const contentType = res.headers.get("content-type");

    let bodySnippet: string | null = null;
    let metaRefreshToAuth = false;
    let scriptRedirectToAuth = false;

    // Only sample body for HTML to detect client-side redirects.
    if (contentType?.includes("text/html")) {
      const text = await res.text();
      bodySnippet = text.slice(0, 2500);
      const lower = text.toLowerCase();

      // Meta refresh to /auth
      metaRefreshToAuth =
        lower.includes("http-equiv=\"refresh\"") &&
        lower.includes("/auth");

      // Common script patterns
      scriptRedirectToAuth =
        (lower.includes("window.location") || lower.includes("location.href") || lower.includes("location.replace")) &&
        lower.includes("/auth");
    }

    chain.push({
      url: current,
      status: res.status,
      location,
      contentType,
      server: res.headers.get("server"),
      cacheControl: res.headers.get("cache-control"),
      via: res.headers.get("via"),
      date: res.headers.get("date"),
      bodySnippet,
      detected: {
        metaRefreshToAuth,
        scriptRedirectToAuth,
      },
    });

    if (location && res.status >= 300 && res.status < 400) {
      current = resolveLocation(current, location);
      continue;
    }

    break;
  }

  return chain;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, maxHops } = await req.json().catch(() => ({}));
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety: only allow a small allowlist when unauthenticated.
    const allowedHosts = new Set([
      "foodhub09.com.br",
      "www.foodhub09.com.br",
      "start-a-new-quest.lovable.app",
    ]);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowedHosts.has(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: "Host not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to authenticate (optional). If token is missing/invalid, we still proceed for allowlisted hosts.
    const authHeader = req.headers.get("Authorization") ?? "";
    let authUserId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await supabaseUser.auth.getUser();
      if (!userError && userData?.user) {
        authUserId = userData.user.id;
      }
    }

    const chain = await fetchRedirectChain(url, typeof maxHops === "number" ? maxHops : 10);

    return new Response(JSON.stringify({ chain, auth: authUserId ? "ok" : "none" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
