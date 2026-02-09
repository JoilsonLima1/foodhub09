import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MANIFEST = {
  name: "FoodHub09",
  short_name: "FoodHub09",
  description: "Sistema de Gestão para Restaurantes e Lanchonetes",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  theme_color: "#f97316",
  background_color: "#ffffff",
  icons: [
    { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  ],
  categories: ["food", "business"],
  lang: "pt-BR",
  dir: "ltr",
};

function hslToHex(hsl: string): string {
  const match = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%?\s+(\d+\.?\d*)%?/);
  if (!match) return "#f97316";
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const a2 = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain") || "";

    // If no domain param, return default manifest
    if (!domain) {
      return new Response(JSON.stringify(DEFAULT_MANIFEST, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/manifest+json",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    // Look up partner by domain
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.rpc("get_partner_by_domain", {
      p_domain: domain,
    });

    if (error || !data || data.length === 0) {
      // Fallback to default manifest
      return new Response(JSON.stringify(DEFAULT_MANIFEST, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/manifest+json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const partner = data[0];
    const branding = partner.branding as Record<string, unknown> | null;

    const themeColor = branding?.primary_color
      ? typeof branding.primary_color === "string" && branding.primary_color.startsWith("#")
        ? branding.primary_color
        : hslToHex(String(branding.primary_color))
      : DEFAULT_MANIFEST.theme_color;

    const logoUrl = branding?.logo_url as string | null;
    const faviconUrl = branding?.favicon_url as string | null;
    const pwaIconUrl = branding?.pwa_icon_url as string | null;
    const iconSrc = pwaIconUrl || logoUrl || faviconUrl;

    const icons = iconSrc
      ? [
          { src: iconSrc, sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: iconSrc, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ]
      : DEFAULT_MANIFEST.icons;

    const manifest = {
      name: (branding?.platform_name as string) || partner.partner_name || DEFAULT_MANIFEST.name,
      short_name: (branding?.platform_name as string) || partner.partner_name || DEFAULT_MANIFEST.short_name,
      description: DEFAULT_MANIFEST.description,
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      theme_color: themeColor,
      background_color: DEFAULT_MANIFEST.background_color,
      icons,
      categories: DEFAULT_MANIFEST.categories,
      lang: "pt-BR",
      dir: "ltr",
    };

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[pwa-manifest] Error:", err);
    return new Response(JSON.stringify(DEFAULT_MANIFEST, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
});
