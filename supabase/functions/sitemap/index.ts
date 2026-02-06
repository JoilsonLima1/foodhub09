import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PLATFORM_PAGES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/recursos", priority: "0.9", changefreq: "weekly" },
  { path: "/planos", priority: "0.9", changefreq: "weekly" },
  { path: "/clientes", priority: "0.8", changefreq: "daily" },
  { path: "/auth", priority: "0.5", changefreq: "monthly" },
];

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

function generateSitemap(baseUrl: string): string {
  const today = new Date().toISOString().split("T")[0];
  
  const urls = PLATFORM_PAGES.map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
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
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const canonicalDomain = getCanonicalDomain(req);
    const sitemap = generateSitemap(canonicalDomain);

    console.log(`Generating sitemap for domain: ${canonicalDomain}`);

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response("Error generating sitemap", { status: 500 });
  }
});
