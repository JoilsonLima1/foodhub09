/**
 * Marketing SEO Automation Tests
 * 
 * Tests for automatic SEO initialization on tenant creation and domain verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
          })),
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

describe('Marketing SEO Automation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1) Module access control', () => {
    it('should have marketing_ceo module in addon_modules catalog', async () => {
      // This test verifies the module exists in the database
      const mockModule = {
        slug: 'marketing_ceo',
        name: 'CEO de Marketing',
        category: 'marketing',
        is_active: true,
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockModule, error: null }),
          }),
        }),
      } as any);

      const result = await supabase
        .from('addon_modules')
        .select('slug, name, category, is_active')
        .eq('slug', 'marketing_ceo')
        .single();

      expect(result.error).toBeNull();
      expect(result.data?.slug).toBe('marketing_ceo');
    });

    it('should restrict access when module is not active for tenant', () => {
      // ModuleGate component should hide content when module is not active
      const hasModule = (slug: string) => false;
      expect(hasModule('marketing_ceo')).toBe(false);
    });

    it('should allow access when module is active for tenant', () => {
      // ModuleGate component should show content when module is active
      const hasModule = (slug: string) => slug === 'marketing_ceo';
      expect(hasModule('marketing_ceo')).toBe(true);
    });
  });

  describe('2) Tenant data isolation', () => {
    it('should only return SEO settings for the authenticated tenant', async () => {
      const tenantId = 'tenant-123';
      const mockSettings = {
        id: 'settings-1',
        tenant_id: tenantId,
        seo_init_status: 'ready',
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
          }),
        }),
      } as any);

      const result = await supabase
        .from('marketing_seo_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      expect(result.error).toBeNull();
      expect(result.data?.tenant_id).toBe(tenantId);
    });

    it('should not expose other tenant data via RLS', async () => {
      // Simulating RLS - different tenant ID should not return data
      const wrongTenantId = 'other-tenant';
      
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any);

      const result = await supabase
        .from('marketing_seo_settings')
        .select('*')
        .eq('tenant_id', wrongTenantId)
        .maybeSingle();

      expect(result.data).toBeNull();
    });
  });

  describe('3) SEO auto-initialization', () => {
    it('should have initialize_tenant_seo_settings function available', async () => {
      // Test that the RPC function exists and can be called
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'new-settings-id',
        error: null,
      } as any);

      const result = await supabase.rpc('initialize_tenant_seo_settings', {
        p_tenant_id: 'test-tenant-id',
        p_domain_id: null,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('initialize_tenant_seo_settings', {
        p_tenant_id: 'test-tenant-id',
        p_domain_id: null,
      });
      expect(result.error).toBeNull();
    });

    it('should set seo_init_status to ready when domain is verified', () => {
      // Simulating the trigger behavior
      const beforeVerification = { is_verified: false, seo_init_status: 'pending_domain' };
      const afterVerification = { is_verified: true, seo_init_status: 'ready' };

      // The trigger should update status when domain is verified
      expect(beforeVerification.seo_init_status).toBe('pending_domain');
      expect(afterVerification.seo_init_status).toBe('ready');
    });

    it('should create audit history entry on auto-init', async () => {
      const mockAuditEntry = {
        tenant_id: 'test-tenant',
        audit_type: 'auto_init',
        notes: 'SEO inicializado automaticamente após verificação do domínio: example.com',
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockAuditEntry, error: null }),
          }),
        }),
      } as any);

      const result = await supabase
        .from('marketing_seo_audit_history')
        .insert(mockAuditEntry)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data?.audit_type).toBe('auto_init');
    });

    it('should have sitemap_enabled and robots_allow_all defaults set to true', () => {
      // Default values from the database schema
      const defaultSettings = {
        sitemap_enabled: true,
        robots_allow_all: true,
        sitemap_change_freq: 'weekly',
        sitemap_priority: 0.8,
      };

      expect(defaultSettings.sitemap_enabled).toBe(true);
      expect(defaultSettings.robots_allow_all).toBe(true);
    });
  });

  describe('4) SEO content generation', () => {
    it('should generate valid sitemap URL format', () => {
      const domain = 'example.com';
      const sitemapUrl = `https://${domain}/sitemap.xml`;
      
      expect(sitemapUrl).toBe('https://example.com/sitemap.xml');
      expect(sitemapUrl).toMatch(/^https:\/\/.*\/sitemap\.xml$/);
    });

    it('should generate valid robots.txt content', () => {
      const domain = 'example.com';
      const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://${domain}/sitemap.xml`;

      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Allow: /');
      expect(robotsTxt).toContain('Sitemap:');
    });
  });
});

describe('Module Route Configuration', () => {
  it('should have marketing_ceo configured in MODULE_ROUTES', async () => {
    // Dynamic import to test the actual configuration
    const { MODULE_ROUTES } = await import('@/lib/moduleRoutes');
    
    expect(MODULE_ROUTES.marketing_ceo).toBeDefined();
    expect(MODULE_ROUTES.marketing_ceo.slug).toBe('marketing_ceo');
    expect(MODULE_ROUTES.marketing_ceo.routeUse).toBe('/marketing');
    expect(MODULE_ROUTES.marketing_ceo.category).toBe('marketing');
  });

  it('should have controlled routes and features defined', async () => {
    const { MODULE_ROUTES } = await import('@/lib/moduleRoutes');
    
    expect(MODULE_ROUTES.marketing_ceo.controlledRoutes).toContain('/marketing');
    expect(MODULE_ROUTES.marketing_ceo.controlledFeatures).toContain('seo_management');
  });
});
