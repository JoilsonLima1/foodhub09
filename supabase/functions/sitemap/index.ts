import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getCanonicalDomain(request: Request): string {
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin") || "";
  
  // Production custom domains - prioritize these
  if (host.includes("foodhub09.com.br")) {
    return "https://foodhub09.com.br";
  }
  
  // Check origin header as fallback
  if (origin.includes("foodhub09.com.br")) {
    return "https://foodhub09.com.br";
  }
  
  // For Lovable preview/editor environments
  if (host.includes("lovable.app") || host.includes("lovable.dev")) {
    return `https://${host}`;
  }
  
  // Fallback to production domain
  return "https://foodhub09.com.br";
}

interface SitemapPage {
  path: string;
  sitemap_priority: number | null;
  sitemap_changefreq: string | null;
}

async function fetchPagesFromDatabase(): Promise<SitemapPage[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[sitemap] Missing Supabase credentials");
    return getDefaultPages();
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from("platform_seo_pages")
      .select("path, sitemap_priority, sitemap_changefreq")
      .eq("is_active", true)
      .eq("include_in_sitemap", true)
      .eq("is_indexable", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[sitemap] Database error:", error);
      return getDefaultPages();
    }

    if (!data || data.length === 0) {
      console.log("[sitemap] No pages found, using defaults");
      return getDefaultPages();
    }

    console.log(`[sitemap] Loaded ${data.length} pages from database`);
    return data as SitemapPage[];
  } catch (err) {
    console.error("[sitemap] Exception fetching pages:", err);
    return getDefaultPages();
  }
}

function getDefaultPages(): SitemapPage[] {
  return [
    { path: "/", sitemap_priority: 1.0, sitemap_changefreq: "weekly" },
    { path: "/recursos", sitemap_priority: 0.9, sitemap_changefreq: "weekly" },
    { path: "/planos", sitemap_priority: 0.9, sitemap_changefreq: "weekly" },
    { path: "/clientes", sitemap_priority: 0.8, sitemap_changefreq: "daily" },
  ];
}

function generateSitemap(baseUrl: string, pages: SitemapPage[]): string {
  const today = new Date().toISOString().split("T")[0];
  
  const urls = pages.map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path === "/" ? "" : page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.sitemap_changefreq || "weekly"}</changefreq>
    <priority>${page.sitemap_priority ?? 0.5}</priority>
  </url>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const canonicalDomain = getCanonicalDomain(req);
    const pages = await fetchPagesFromDatabase();
    const sitemap = generateSitemap(canonicalDomain, pages);

    console.log(`[sitemap] Generated for ${canonicalDomain} with ${pages.length} pages`);

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("[sitemap] Error:", error);
    return new Response("Error generating sitemap", { 
      status: 500,
      headers: corsHeaders,
    });
  }
});
