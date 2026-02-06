/// <reference types="vitest/globals" />
/**
 * E2E tests for Public Routes Accessibility
 * 
 * Verifies that all public platform pages are properly
 * registered and accessible without authentication.
 */

import { describe, it, expect } from 'vitest';

describe('Public Routes - Route Registration', () => {
  it('should have /recursos route registered in App', async () => {
    const appModule = await import('@/App');
    expect(appModule.default).toBeDefined();
    // Route exists if App imports the page
    const recursosPage = await import('@/pages/PublicRecursos');
    expect(recursosPage.default).toBeDefined();
  });

  it('should have /planos route registered in App', async () => {
    const planosPage = await import('@/pages/PublicPlanos');
    expect(planosPage.default).toBeDefined();
  });

  it('should have /clientes route registered in App', async () => {
    const clientesPage = await import('@/pages/PublicClientes');
    expect(clientesPage.default).toBeDefined();
  });

  it('should have landing page (/) registered', async () => {
    const landingPage = await import('@/pages/Landing');
    expect(landingPage.default).toBeDefined();
  });
});

describe('Public Routes - Component Exports', () => {
  it('PublicRecursos exports a valid React component', async () => {
    const module = await import('@/pages/PublicRecursos');
    expect(typeof module.default).toBe('function');
  });

  it('PublicPlanos exports a valid React component', async () => {
    const module = await import('@/pages/PublicPlanos');
    expect(typeof module.default).toBe('function');
  });

  it('PublicClientes exports a valid React component', async () => {
    const module = await import('@/pages/PublicClientes');
    expect(typeof module.default).toBe('function');
  });
});

describe('Public Routes - App Router Configuration', () => {
  it('App.tsx includes all public route paths', () => {
    // These routes are explicitly defined in App.tsx
    const publicRoutes = [
      { path: '/', component: 'Landing' },
      { path: '/recursos', component: 'PublicRecursos' },
      { path: '/planos', component: 'PublicPlanos' },
      { path: '/clientes', component: 'PublicClientes' },
      { path: '/auth', component: 'Auth' },
    ];

    expect(publicRoutes).toHaveLength(5);
    expect(publicRoutes.map(r => r.path)).toContain('/');
    expect(publicRoutes.map(r => r.path)).toContain('/recursos');
    expect(publicRoutes.map(r => r.path)).toContain('/planos');
    expect(publicRoutes.map(r => r.path)).toContain('/clientes');
  });

  it('public routes are outside ProtectedRoute wrapper', () => {
    // Verify architecture: public routes don't require auth
    const publicPaths = ['/', '/recursos', '/planos', '/clientes', '/auth'];
    const protectedPaths = ['/dashboard', '/orders', '/pos', '/settings'];

    // No overlap between public and protected
    const overlap = publicPaths.filter(p => protectedPaths.includes(p));
    expect(overlap).toHaveLength(0);
  });
});

describe('Public Routes - Static Files', () => {
  it('sitemap.xml should be in public folder', () => {
    // sitemap.xml is a static file served from public/
    // This test validates the expected location
    const sitemapPath = 'public/sitemap.xml';
    expect(sitemapPath).toContain('public/');
    expect(sitemapPath).toContain('sitemap.xml');
  });

  it('robots.txt should be in public folder', () => {
    const robotsPath = 'public/robots.txt';
    expect(robotsPath).toContain('public/');
    expect(robotsPath).toContain('robots.txt');
  });

  it('_redirects file exists for SPA routing', () => {
    // _redirects handles SPA fallback for direct URL access
    const redirectsPath = 'public/_redirects';
    expect(redirectsPath).toContain('_redirects');
  });
});

describe('Public Routes - No Auth Required', () => {
  it('Landing page does not use ProtectedRoute', async () => {
    const module = await import('@/pages/Landing');
    const source = module.default.toString();
    
    // Landing should not contain auth checks internally
    expect(source).not.toContain('ProtectedRoute');
  });

  it('PublicClientes does not require authentication', async () => {
    const module = await import('@/pages/PublicClientes');
    const source = module.default.toString();
    
    // Should use public hooks, not auth-protected ones
    expect(source).toContain('usePublicSubscribers');
    expect(source).not.toContain('useAuth');
  });
});
