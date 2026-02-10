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
  domainType?: "marketing" | "app";
  isPublished?: boolean;
  partnerSlug?: string;
}

async function resolveDomain(
  request: Request,
  supabase: ReturnType<typeof createClient>
): Promise<DomainInfo> {
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin") || "";
  
  // Platform domains
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
        domainType: partner.domain_type as "marketing" | "app",
        isPublished: partner.is_published,
        partnerSlug: partner.partner_slug,
      };
    }
  } catch (err) {
    console.error("[robots] Partner resolution error:", err);
  }
  
  // Fallback to platform
  return { type: "platform", canonicalDomain: "https://foodhub09.com.br" };
}

// ==================== Robots.txt Generation ====================

function generatePlatformRobots(canonicalDomain: string): string {
  return `# FoodHub09 - Platform Robots.txt
# ${canonicalDomain}

User-agent: *
Allow: /
Allow: /recursos
Allow: /planos
Allow: /clientes
Allow: /parceiros

# Disallow admin and authenticated areas
Disallow: /dashboard
Disallow: /orders
Disallow: /pos
Disallow: /kitchen
Disallow: /deliveries
Disallow: /products
Disallow: /stock
Disallow: /reports
Disallow: /settings
Disallow: /super-admin
Disallow: /courier-dashboard
Disallow: /stores
Disallow: /comandas
Disallow: /events
Disallow: /marketing
Disallow: /tables
Disallow: /partner
Disallow: /auth

# Allow specific crawlers
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

# Sitemap location
Sitemap: ${canonicalDomain}/sitemap.xml
`;
}

function generatePartnerMarketingRobots(canonicalDomain: string): string {
  return `# Partner Marketing Site - Robots.txt
# ${canonicalDomain}

User-agent: *
Allow: /
Allow: /signup

# Disallow app/authenticated areas (should be on app subdomain)
Disallow: /dashboard
Disallow: /orders
Disallow: /pos
Disallow: /kitchen
Disallow: /deliveries
Disallow: /products
Disallow: /stock
Disallow: /reports
Disallow: /settings
Disallow: /login
Disallow: /auth

# Allow specific crawlers
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

# Sitemap location
Sitemap: ${canonicalDomain}/sitemap.xml
`;
}

function generatePartnerAppRobots(canonicalDomain: string): string {
  // App domains should NOT be indexed - they contain authenticated content
  return `# Partner App - Robots.txt
# ${canonicalDomain}

# App domains should not be indexed - use marketing domain for SEO
User-agent: *
Disallow: /

# No sitemap for app domains
`;
}

function generateUnpublishedRobots(canonicalDomain: string): string {
  // Unpublished partners should not be indexed
  return `# Partner Site - Not Published
# ${canonicalDomain}

User-agent: *
Disallow: /

# Site not yet published for indexing
`;
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
    console.error("[robots] Missing Supabase credentials");
    return new Response("Server configuration error", { 
      status: 500,
      headers: corsHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const domainInfo = await resolveDomain(req, supabase);
    
    console.log(`[robots] Resolved domain:`, domainInfo);
    
    let robotsTxt: string;
    
    if (domainInfo.type === "platform") {
      robotsTxt = generatePlatformRobots(domainInfo.canonicalDomain);
      console.log(`[robots] Generated platform robots.txt for ${domainInfo.canonicalDomain}`);
    } else {
      // Partner domain
      if (!domainInfo.isPublished) {
        robotsTxt = generateUnpublishedRobots(domainInfo.canonicalDomain);
        console.log(`[robots] Partner ${domainInfo.partnerSlug} not published, blocking indexing`);
      } else if (domainInfo.domainType === "app") {
        robotsTxt = generatePartnerAppRobots(domainInfo.canonicalDomain);
        console.log(`[robots] Generated app robots.txt (noindex) for ${domainInfo.partnerSlug}`);
      } else {
        robotsTxt = generatePartnerMarketingRobots(domainInfo.canonicalDomain);
        console.log(`[robots] Generated marketing robots.txt for ${domainInfo.partnerSlug}`);
      }
    }

    return new Response(robotsTxt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("[robots] Error:", error);
    return new Response("Error generating robots.txt", { 
      status: 500,
      headers: corsHeaders,
    });
  }
});
