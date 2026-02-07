import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function buildBingSiteAuthXml(code: string) {
  const safe = code.trim();
  return `<?xml version="1.0"?>\n<users>\n  <user>${safe}</user>\n</users>\n`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[site-verification] Missing backend credentials");
    return new Response("Server configuration error", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from("platform_seo_settings")
      .select("bing_site_verification")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[site-verification] DB error:", error);
      return new Response("Error", { status: 500, headers: corsHeaders });
    }

    const code = (data?.bing_site_verification ?? "").trim();

    if (!code) {
      console.log("[site-verification] No Bing verification code configured");
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const xml = buildBingSiteAuthXml(code);

    console.log("[site-verification] Served BingSiteAuth.xml");

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("[site-verification] Unexpected error:", err);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
