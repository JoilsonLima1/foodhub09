/**
 * PlatformSEOHead - Dynamic SEO meta tags for public platform pages
 * 
 * Uses React Helmet to inject dynamic meta tags based on:
 * 1. Page-specific SEO settings from platform_seo_pages
 * 2. Global SEO settings from platform_seo_settings
 */

import { Helmet } from 'react-helmet-async';
import { usePlatformSEO } from '@/hooks/usePlatformSEO';

export function PlatformSEOHead() {
  const { seo, isPublicRoute, isLoading } = usePlatformSEO();

  // Only render for public routes and when we have data
  if (!isPublicRoute || isLoading || !seo) {
    return null;
  }

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{seo.title}</title>
      <meta name="title" content={seo.title} />
      <meta name="description" content={seo.description} />
      {seo.keywords.length > 0 && (
        <meta name="keywords" content={seo.keywords.join(', ')} />
      )}
      <meta name="robots" content={seo.robots} />
      <link rel="canonical" href={seo.canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seo.ogType} />
      <meta property="og:url" content={seo.canonicalUrl} />
      <meta property="og:title" content={seo.ogTitle} />
      <meta property="og:description" content={seo.ogDescription} />
      <meta property="og:image" content={seo.ogImage} />
      <meta property="og:site_name" content={seo.siteName} />
      <meta property="og:locale" content={seo.ogLocale} />

      {/* Twitter */}
      <meta name="twitter:card" content={seo.twitterCard} />
      <meta name="twitter:url" content={seo.canonicalUrl} />
      <meta name="twitter:title" content={seo.ogTitle} />
      <meta name="twitter:description" content={seo.ogDescription} />
      <meta name="twitter:image" content={seo.ogImage} />
      {seo.twitterSite && <meta name="twitter:site" content={seo.twitterSite} />}
      {seo.twitterCreator && <meta name="twitter:creator" content={seo.twitterCreator} />}

      {/* Theme & App */}
      <meta name="theme-color" content={seo.themeColor} />
      <meta name="apple-mobile-web-app-title" content={seo.siteName} />
      <meta name="application-name" content={seo.siteName} />

      {/* Verification */}
      {seo.googleVerification && (
        <meta name="google-site-verification" content={seo.googleVerification} />
      )}
      {seo.bingVerification && (
        <meta name="msvalidate.01" content={seo.bingVerification} />
      )}

      {/* Schema.org - Organization */}
      {seo.organizationSchema && (
        <script type="application/ld+json">
          {JSON.stringify(seo.organizationSchema)}
        </script>
      )}

      {/* Schema.org - SoftwareApplication */}
      {seo.softwareAppSchema && (
        <script type="application/ld+json">
          {JSON.stringify(seo.softwareAppSchema)}
        </script>
      )}

      {/* Schema.org - Page-specific */}
      {seo.pageSchema && (
        <script type="application/ld+json">
          {JSON.stringify(seo.pageSchema)}
        </script>
      )}
    </Helmet>
  );
}
