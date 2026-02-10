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
  robots?: string | null;
}

async function fetchPlatformPages(
  supabase: ReturnType<typeof createClient>
): Promise<PlatformPage[]> {
  try {
    // Only include pages where:
    // 1. is_active = true (page is enabled)
    // 2. is_indexable = true (robots allow indexing)
    // 3. include_in_sitemap = true (explicitly marked for sitemap)
    const { data, error } = await supabase
      .from("platform_seo_pages")
      .select("path, sitemap_priority, sitemap_changefreq, robots")
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

    // Filter out any pages with noindex in robots directive
    const validPages = data.filter((page: any) => {
      const robots = (page.robots || '').toLowerCase();
      // Exclude if robots contains 'noindex'
      if (robots.includes('noindex')) {
        console.log(`[sitemap] Excluding ${page.path} due to noindex directive`);
        return false;
      }
      // Exclude technical routes that shouldn't be indexed
      const excludedPaths = ['/auth', '/super-admin', '/dashboard', '/partner', '/pos', '/kitchen', '/settings'];
      if (excludedPaths.some(excluded => page.path.startsWith(excluded))) {
        console.log(`[sitemap] Excluding ${page.path} - technical route`);
        return false;
      }
      return true;
    });

    console.log(`[sitemap] Loaded ${validPages.length} platform pages from database (filtered from ${data.length})`);
    return validPages as PlatformPage[];
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

// ==================== Published Partner Profiles (for platform sitemap) ====================

interface PublishedPartnerSlug {
  slug: string;
  updated_at: string;
  marketing_domain: string | null;
}

async function fetchPublishedPartnerSlugs(supabase: ReturnType<typeof createClient>): Promise<PublishedPartnerSlug[]> {
  try {
    const { data, error } = await supabase
      .from("partners")
      .select("slug, updated_at, domains")
      .eq("is_active", true)
      .eq("is_suspended", false);

    if (error || !data) return [];

    // Filter to only those with published marketing pages
    const slugs: string[] = data.map((p: any) => p.slug).filter(Boolean);
    if (slugs.length === 0) return [];

    const { data: pages } = await supabase
      .from("partner_marketing_pages")
      .select("partner_id")
      .eq("published", true);

    if (!pages || pages.length === 0) return [];

    const publishedPartnerIds = new Set(pages.map((p: any) => p.partner_id));

    // Also need partner_id for cross-ref
    const { data: partners } = await supabase
      .from("partners")
      .select("id, slug, updated_at, domains")
      .eq("is_active", true)
      .eq("is_suspended", false);

    if (!partners) return [];

    return partners
      .filter((p: any) => publishedPartnerIds.has(p.id) && p.slug)
      .map((p: any) => ({
        slug: p.slug,
        updated_at: p.updated_at || new Date().toISOString(),
        marketing_domain: p.domains?.marketing || null,
      }));
  } catch (err) {
    console.error("[sitemap] Error fetching published partner slugs:", err);
    return [];
  }
}

// ==================== Sitemap Generation ====================

function generatePlatformSitemap(baseUrl: string, pages: PlatformPage[], partnerSlugs: PublishedPartnerSlug[] = []): string {
  const today = new Date().toISOString().split("T")[0];
  
  const pageUrls = pages.map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path === "/" ? "" : page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.sitemap_changefreq || "weekly"}</changefreq>
    <priority>${page.sitemap_priority ?? 0.5}</priority>
  </url>`
  ).join("\n");

  const partnerUrls = partnerSlugs.map(
    (p) => {
      // If partner has own marketing domain, use that as canonical
      const loc = p.marketing_domain
        ? `https://${p.marketing_domain}`
        : `${baseUrl}/parceiros/${p.slug}`;
      const lastmod = p.updated_at.split("T")[0];
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }
  ).join("\n");

  const allUrls = [pageUrls, partnerUrls].filter(Boolean).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls}
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
      // Platform sitemap - includes published partner profile pages
      const [pages, partnerSlugs] = await Promise.all([
        fetchPlatformPages(supabase),
        fetchPublishedPartnerSlugs(supabase),
      ]);
      sitemap = generatePlatformSitemap(domainInfo.canonicalDomain, pages, partnerSlugs);
      console.log(`[sitemap] Generated platform sitemap for ${domainInfo.canonicalDomain} with ${pages.length} pages + ${partnerSlugs.length} partner profiles`);
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
