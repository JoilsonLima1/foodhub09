import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ==================== Domain Resolution ====================

interface DomainInfo {
  type: "platform" | "partner";
  canonicalDomain: string;
  partnerId?: string;
  partnerSlug?: string;
  isPublished?: boolean;
}

async function resolveDomain(
  request: Request,
  supabase: ReturnType<typeof createClient>
): Promise<DomainInfo> {
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin") || "";
  
  // Platform domains - always serve platform sitemap
  const platformDomains = [
    "foodhub09.com.br",
    "www.foodhub09.com.br",
    "localhost",
    "127.0.0.1",
  ];
  
  // Check if it's a Lovable preview domain
  const isLovablePreview = host.includes(".lovable.app") || 
                           host.includes(".lovableproject.com") ||
                           host.includes("lovable.dev");
  
  if (platformDomains.some(d => host.includes(d)) || isLovablePreview) {
    const canonicalDomain = host.includes("foodhub09.com.br") 
      ? "https://foodhub09.com.br"
      : `https://${host}`;
    return { type: "platform", canonicalDomain };
  }
  
  // Check origin header as fallback for platform
  if (origin.includes("foodhub09.com.br")) {
    return { type: "platform", canonicalDomain: "https://foodhub09.com.br" };
  }
  
  // Try to resolve as partner domain
  try {
    const { data, error } = await supabase
      .rpc("get_partner_seo_by_domain", { p_domain: host });
    
    if (!error && data && data.length > 0) {
      const partner = data[0];
      return {
        type: "partner",
        canonicalDomain: `https://${partner.canonical_domain}`,
        partnerId: partner.partner_id,
        partnerSlug: partner.partner_slug,
        isPublished: partner.is_published,
      };
    }
  } catch (err) {
    console.error("[sitemap] Partner resolution error:", err);
  }
  
  // Fallback to platform
  return { type: "platform", canonicalDomain: "https://foodhub09.com.br" };
}

// ==================== Platform Sitemap ====================

interface PlatformPage {
  path: string;
  sitemap_priority: number | null;
  sitemap_changefreq: string | null;
}

async function fetchPlatformPages(
  supabase: ReturnType<typeof createClient>
): Promise<PlatformPage[]> {
  try {
    const { data, error } = await supabase
      .from("platform_seo_pages")
      .select("path, sitemap_priority, sitemap_changefreq")
      .eq("is_active", true)
      .eq("include_in_sitemap", true)
      .eq("is_indexable", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[sitemap] Database error:", error);
      return getDefaultPlatformPages();
    }

    if (!data || data.length === 0) {
      console.log("[sitemap] No platform pages found, using defaults");
      return getDefaultPlatformPages();
    }

    console.log(`[sitemap] Loaded ${data.length} platform pages from database`);
    return data as PlatformPage[];
  } catch (err) {
    console.error("[sitemap] Exception fetching platform pages:", err);
    return getDefaultPlatformPages();
  }
}

function getDefaultPlatformPages(): PlatformPage[] {
  return [
    { path: "/", sitemap_priority: 1.0, sitemap_changefreq: "weekly" },
    { path: "/recursos", sitemap_priority: 0.9, sitemap_changefreq: "weekly" },
    { path: "/planos", sitemap_priority: 0.9, sitemap_changefreq: "weekly" },
    { path: "/clientes", sitemap_priority: 0.8, sitemap_changefreq: "daily" },
  ];
}

// ==================== Partner Sitemap ====================

interface PartnerPage {
  path: string;
  sitemap_priority: number;
  sitemap_changefreq: string;
  lastmod: string;
}

async function fetchPartnerPages(
  supabase: ReturnType<typeof createClient>,
  partnerId: string
): Promise<PartnerPage[]> {
  try {
    const { data, error } = await supabase
      .rpc("get_partner_sitemap_pages", { p_partner_id: partnerId });

    if (error) {
      console.error("[sitemap] Partner pages error:", error);
      return getDefaultPartnerPages();
    }

    if (!data || data.length === 0) {
      console.log("[sitemap] No partner pages found, using defaults");
      return getDefaultPartnerPages();
    }

    console.log(`[sitemap] Loaded ${data.length} partner pages`);
    return data as PartnerPage[];
  } catch (err) {
    console.error("[sitemap] Exception fetching partner pages:", err);
    return getDefaultPartnerPages();
  }
}

function getDefaultPartnerPages(): PartnerPage[] {
  const today = new Date().toISOString().split("T")[0];
  return [
    { path: "/", sitemap_priority: 1.0, sitemap_changefreq: "weekly", lastmod: today },
    { path: "/signup", sitemap_priority: 0.9, sitemap_changefreq: "weekly", lastmod: today },
  ];
}

// ==================== Sitemap Generation ====================

function generatePlatformSitemap(baseUrl: string, pages: PlatformPage[]): string {
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

function generatePartnerSitemap(baseUrl: string, pages: PartnerPage[]): string {
  const urls = pages.map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path === "/" ? "" : page.path}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.sitemap_changefreq || "weekly"}</changefreq>
    <priority>${page.sitemap_priority ?? 0.5}</priority>
  </url>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function generateEmptySitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
}

// ==================== Main Handler ====================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[sitemap] Missing Supabase credentials");
    return new Response("Server configuration error", { 
      status: 500,
      headers: corsHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const domainInfo = await resolveDomain(req, supabase);
    
    console.log(`[sitemap] Resolved domain:`, domainInfo);
    
    let sitemap: string;
    
    if (domainInfo.type === "platform") {
      // Platform sitemap
      const pages = await fetchPlatformPages(supabase);
      sitemap = generatePlatformSitemap(domainInfo.canonicalDomain, pages);
      console.log(`[sitemap] Generated platform sitemap for ${domainInfo.canonicalDomain} with ${pages.length} pages`);
    } else {
      // Partner sitemap
      if (!domainInfo.isPublished) {
        // Partner not published - return empty sitemap (no indexing)
        console.log(`[sitemap] Partner ${domainInfo.partnerSlug} not published, returning empty sitemap`);
        sitemap = generateEmptySitemap();
      } else if (!domainInfo.partnerId) {
        // No partner ID - fallback to empty
        sitemap = generateEmptySitemap();
      } else {
        const pages = await fetchPartnerPages(supabase, domainInfo.partnerId);
        sitemap = generatePartnerSitemap(domainInfo.canonicalDomain, pages);
        console.log(`[sitemap] Generated partner sitemap for ${domainInfo.partnerSlug} with ${pages.length} pages`);
      }
    }

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
