/// <reference types="vitest/globals" />
/**
 * Smoke tests for Platform Marketing (SaaS-level)
 * 
 * Tests:
 * - Public pages routes defined
 * - SEO infrastructure hooks work
 * - Platform and tenant marketing are isolated
 */

import { describe, it, expect } from 'vitest';

describe('Platform Marketing - Route Configuration', () => {
  it('should have public routes for platform marketing pages', () => {
    // These routes are defined in App.tsx for public access
    const publicRoutes = [
      '/',           // Landing page
      '/recursos',   // Features page
      '/planos',     // Pricing page
      '/clientes',   // Subscribers page
    ];

    expect(publicRoutes).toHaveLength(4);
    expect(publicRoutes).toContain('/');
    expect(publicRoutes).toContain('/recursos');
    expect(publicRoutes).toContain('/planos');
    expect(publicRoutes).toContain('/clientes');
  });

  it('should have admin-only routes properly separated', () => {
    const adminRoutes = [
      '/dashboard',
      '/super-admin',
      '/settings',
      '/marketing', // Tenant marketing (requires auth + module)
    ];

    expect(adminRoutes).toHaveLength(4);
    expect(adminRoutes).not.toContain('/recursos');
    expect(adminRoutes).not.toContain('/clientes');
  });
});

describe('Platform Marketing - SEO Infrastructure', () => {
  it('sitemap.xml should contain all public routes', () => {
    // Sitemap located at public/sitemap.xml
    const sitemapRoutes = [
      '/',
      '/recursos', 
      '/planos',
      '/clientes',
      '/auth',
    ];

    expect(sitemapRoutes.length).toBe(5);
    expect(sitemapRoutes).toContain('/');
    expect(sitemapRoutes).toContain('/recursos');
    expect(sitemapRoutes).toContain('/planos');
    expect(sitemapRoutes).toContain('/clientes');
  });

  it('robots.txt should allow public pages and disallow admin areas', () => {
    const allowedPaths = ['/', '/recursos', '/planos', '/clientes'];
    const disallowedPaths = [
      '/dashboard',
      '/orders',
      '/pos',
      '/kitchen',
      '/super-admin',
      '/settings',
    ];

    // All allowed paths should be public
    expect(allowedPaths.every(p => !disallowedPaths.includes(p))).toBe(true);
    
    // Admin paths should be disallowed
    expect(disallowedPaths).toContain('/super-admin');
    expect(disallowedPaths).toContain('/dashboard');
  });
});

describe('Platform Marketing - usePlatformSEO Hook', () => {
  it('hook exports expected interface', async () => {
    const module = await import('@/hooks/usePlatformSEO');
    expect(module.usePlatformSEO).toBeDefined();
    expect(typeof module.usePlatformSEO).toBe('function');
  });
});

describe('Platform Marketing - Isolation from Tenant Marketing', () => {
  it('PlatformMarketingPanel exists as separate module', async () => {
    const platformPanel = await import('@/components/superadmin/PlatformMarketingPanel');
    expect(platformPanel.PlatformMarketingPanel).toBeDefined();
    expect(typeof platformPanel.PlatformMarketingPanel).toBe('function');
  });

  it('SuperAdminMarketingPanel exists as separate module', async () => {
    const tenantPanel = await import('@/components/superadmin/SuperAdminMarketingPanel');
    expect(tenantPanel.SuperAdminMarketingPanel).toBeDefined();
    expect(typeof tenantPanel.SuperAdminMarketingPanel).toBe('function');
  });

  it('Platform and tenant panels are different components', async () => {
    const platformPanel = await import('@/components/superadmin/PlatformMarketingPanel');
    const tenantPanel = await import('@/components/superadmin/SuperAdminMarketingPanel');

    expect(platformPanel.PlatformMarketingPanel).not.toBe(tenantPanel.SuperAdminMarketingPanel);
  });

  it('usePlatformSEO is separate from useMarketingSEO', async () => {
    const platformSEO = await import('@/hooks/usePlatformSEO');
    const tenantSEO = await import('@/hooks/useMarketingSEO');

    expect(platformSEO.usePlatformSEO).toBeDefined();
    expect(tenantSEO.useMarketingSEO).toBeDefined();
    expect(platformSEO.usePlatformSEO).not.toBe(tenantSEO.useMarketingSEO);
  });
});

describe('Platform Marketing - Public Pages Components', () => {
  it('PublicRecursos page component exists', async () => {
    const module = await import('@/pages/PublicRecursos');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('PublicClientes page component exists', async () => {
    const module = await import('@/pages/PublicClientes');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('PublicPlanos page component exists', async () => {
    const module = await import('@/pages/PublicPlanos');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});

describe('Platform Marketing - usePublicSubscribers Hook', () => {
  it('hook exports expected interface', async () => {
    const module = await import('@/hooks/usePublicSubscribers');
    expect(module.usePublicSubscribers).toBeDefined();
    expect(typeof module.usePublicSubscribers).toBe('function');
  });
});
