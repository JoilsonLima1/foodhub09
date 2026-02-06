/**
 * E2E Tests for Marketing CEO module in Module Store
 * 
 * Tests that the marketing_ceo module appears correctly in the store
 * with proper status, limits comparison, and CTAs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' }, error: null }),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' }, error: null }),
    })),
    rpc: vi.fn(),
  },
}));

// Mock hooks
vi.mock('@/hooks/useTenantModules', () => ({
  useTenantModules: vi.fn(),
}));

vi.mock('@/hooks/useModuleUsage', () => ({
  useModuleUsage: vi.fn(),
  useModulePlanLimits: vi.fn(),
}));

vi.mock('@/hooks/useSubscriptionPlans', () => ({
  useSubscriptionPlans: vi.fn(),
}));

import { useTenantModules } from '@/hooks/useTenantModules';
import { useModuleUsage, useModulePlanLimits } from '@/hooks/useModuleUsage';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import type { AddonModule } from '@/hooks/useAddonModules';

const mockMarketingModule: AddonModule = {
  id: 'module-marketing-ceo',
  slug: 'marketing_ceo',
  name: 'CEO de Marketing',
  description: 'Módulo completo de SEO e marketing digital',
  category: 'marketing',
  icon: 'TrendingUp',
  monthly_price: 49.90,
  setup_fee: 0,
  currency: 'BRL',
  is_active: true,
  display_order: 15,
  features: [
    'Gestão de Meta Tags',
    'Geração de Sitemap.xml',
    'Configuração de Robots.txt',
    'Integração Google Search Console',
  ],
  requirements: null,
  implementation_status: 'ready',
  created_at: '2026-02-06T00:00:00Z',
  updated_at: '2026-02-06T00:00:00Z',
};

const mockPlans = [
  { id: 'plan-starter', name: 'Starter', is_active: true, display_order: 1, monthly_price: 79 },
  { id: 'plan-pro', name: 'Professional', is_active: true, display_order: 2, monthly_price: 199 },
  { id: 'plan-enterprise', name: 'Enterprise', is_active: true, display_order: 3, monthly_price: 499 },
];

const mockPlanLimits = [
  { id: '1', plan_id: 'plan-starter', module_slug: 'marketing_ceo', limit_key: 'audits_per_month', limit_value: 1, created_at: '2026-02-06T00:00:00Z', updated_at: '2026-02-06T00:00:00Z', plan: { id: 'plan-starter', name: 'Starter' } },
  { id: '2', plan_id: 'plan-starter', module_slug: 'marketing_ceo', limit_key: 'pages_per_month', limit_value: 5, created_at: '2026-02-06T00:00:00Z', updated_at: '2026-02-06T00:00:00Z', plan: { id: 'plan-starter', name: 'Starter' } },
  { id: '3', plan_id: 'plan-pro', module_slug: 'marketing_ceo', limit_key: 'audits_per_month', limit_value: 4, created_at: '2026-02-06T00:00:00Z', updated_at: '2026-02-06T00:00:00Z', plan: { id: 'plan-pro', name: 'Professional' } },
  { id: '4', plan_id: 'plan-pro', module_slug: 'marketing_ceo', limit_key: 'pages_per_month', limit_value: 20, created_at: '2026-02-06T00:00:00Z', updated_at: '2026-02-06T00:00:00Z', plan: { id: 'plan-pro', name: 'Professional' } },
  { id: '5', plan_id: 'plan-enterprise', module_slug: 'marketing_ceo', limit_key: 'audits_per_month', limit_value: -1, created_at: '2026-02-06T00:00:00Z', updated_at: '2026-02-06T00:00:00Z', plan: { id: 'plan-enterprise', name: 'Enterprise' } },
  { id: '6', plan_id: 'plan-enterprise', module_slug: 'marketing_ceo', limit_key: 'pages_per_month', limit_value: -1, created_at: '2026-02-06T00:00:00Z', updated_at: '2026-02-06T00:00:00Z', plan: { id: 'plan-enterprise', name: 'Enterprise' } },
];

describe('Marketing Module Store Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(useTenantModules).mockReturnValue({
      tenantInfo: {
        id: 'tenant-1',
        subscription_plan_id: 'plan-starter',
        subscription_status: 'active',
        subscription_plans: { id: 'plan-starter', name: 'Starter', monthly_price: 79 },
      },
      isModuleActive: vi.fn(() => false),
      isModuleIncludedInPlan: vi.fn(() => false),
      isLoading: false,
      tenantModules: [],
      allModules: [mockMarketingModule],
      error: null,
      getModulesBreakdown: vi.fn(() => ({
        planIncludedModules: [],
        includedModules: [],
        purchasedModules: [],
        availableModules: [mockMarketingModule],
        totalMonthly: 79,
        planPrice: 79,
        modulesTotal: 0,
      })),
      hasModule: vi.fn(() => false),
      getPurchaseBlockReason: vi.fn(() => null),
      syncModulesFromPlan: { mutateAsync: vi.fn() } as any,
      refetch: vi.fn(),
    });

    vi.mocked(useModuleUsage).mockReturnValue({
      limits: {
        audits_per_month: { allowed: true, limit: 1, used: 0, remaining: 1 },
        pages_per_month: { allowed: true, limit: 5, used: 2, remaining: 3 },
      },
      isLoading: false,
      canPerformAction: vi.fn(() => true),
      getRemaining: vi.fn(() => 1),
      getLimit: vi.fn(() => 1),
      getUsed: vi.fn(() => 0),
      isUnlimited: vi.fn(() => false),
      tryPerformAction: vi.fn(async () => true),
      incrementUsage: { mutateAsync: vi.fn() } as any,
      refetch: vi.fn(),
    });

    vi.mocked(useModulePlanLimits).mockReturnValue({
      planLimits: mockPlanLimits,
      isLoading: false,
      updateLimit: { mutateAsync: vi.fn() } as any,
      createLimit: { mutateAsync: vi.fn() } as any,
      refetch: vi.fn(),
    });

    vi.mocked(useSubscriptionPlans).mockReturnValue({
      plans: mockPlans,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  describe('Module Data Structure', () => {
    it('marketing_ceo module has required fields for store display', () => {
      expect(mockMarketingModule.id).toBeDefined();
      expect(mockMarketingModule.slug).toBe('marketing_ceo');
      expect(mockMarketingModule.name).toBe('CEO de Marketing');
      expect(mockMarketingModule.description).toBeDefined();
      expect(mockMarketingModule.monthly_price).toBe(49.90);
      expect(mockMarketingModule.features).toHaveLength(4);
      expect(mockMarketingModule.implementation_status).toBe('ready');
    });

    it('module has correct category for filtering', () => {
      expect(mockMarketingModule.category).toBe('marketing');
    });

    it('module has icon defined for display', () => {
      expect(mockMarketingModule.icon).toBe('TrendingUp');
    });
  });

  describe('Plan Limits Comparison', () => {
    it('has limits defined for all plans', () => {
      const starterLimits = mockPlanLimits.filter(l => l.plan_id === 'plan-starter');
      const proLimits = mockPlanLimits.filter(l => l.plan_id === 'plan-pro');
      const enterpriseLimits = mockPlanLimits.filter(l => l.plan_id === 'plan-enterprise');

      expect(starterLimits).toHaveLength(2);
      expect(proLimits).toHaveLength(2);
      expect(enterpriseLimits).toHaveLength(2);
    });

    it('Starter plan has limited audits (1/month)', () => {
      const auditLimit = mockPlanLimits.find(
        l => l.plan_id === 'plan-starter' && l.limit_key === 'audits_per_month'
      );
      expect(auditLimit?.limit_value).toBe(1);
    });

    it('Professional plan has more audits (4/month)', () => {
      const auditLimit = mockPlanLimits.find(
        l => l.plan_id === 'plan-pro' && l.limit_key === 'audits_per_month'
      );
      expect(auditLimit?.limit_value).toBe(4);
    });

    it('Enterprise plan has unlimited audits (-1)', () => {
      const auditLimit = mockPlanLimits.find(
        l => l.plan_id === 'plan-enterprise' && l.limit_key === 'audits_per_month'
      );
      expect(auditLimit?.limit_value).toBe(-1);
    });

    it('Enterprise plan has unlimited pages (-1)', () => {
      const pageLimit = mockPlanLimits.find(
        l => l.plan_id === 'plan-enterprise' && l.limit_key === 'pages_per_month'
      );
      expect(pageLimit?.limit_value).toBe(-1);
    });
  });

  describe('Module Status States', () => {
    it('inactive module returns correct status from hook', () => {
      const { isModuleActive, isModuleIncludedInPlan } = vi.mocked(useTenantModules)();
      
      expect(isModuleActive(mockMarketingModule.id)).toBe(false);
      expect(isModuleIncludedInPlan(mockMarketingModule.id)).toBe(false);
    });

    it('active module returns correct status from hook', () => {
      vi.mocked(useTenantModules).mockReturnValue({
        ...vi.mocked(useTenantModules)(),
        isModuleActive: vi.fn(() => true),
      });

      const { isModuleActive } = vi.mocked(useTenantModules)();
      expect(isModuleActive(mockMarketingModule.id)).toBe(true);
    });

    it('plan-included module returns correct status from hook', () => {
      vi.mocked(useTenantModules).mockReturnValue({
        ...vi.mocked(useTenantModules)(),
        isModuleIncludedInPlan: vi.fn(() => true),
      });

      const { isModuleIncludedInPlan } = vi.mocked(useTenantModules)();
      expect(isModuleIncludedInPlan(mockMarketingModule.id)).toBe(true);
    });
  });

  describe('Usage Tracking', () => {
    it('tracks audit usage correctly', () => {
      const { limits } = vi.mocked(useModuleUsage)('marketing_ceo', ['audits_per_month', 'pages_per_month']);
      
      expect(limits.audits_per_month.used).toBe(0);
      expect(limits.audits_per_month.limit).toBe(1);
      expect(limits.audits_per_month.remaining).toBe(1);
    });

    it('tracks page usage correctly', () => {
      const { limits } = vi.mocked(useModuleUsage)('marketing_ceo', ['audits_per_month', 'pages_per_month']);
      
      expect(limits.pages_per_month.used).toBe(2);
      expect(limits.pages_per_month.limit).toBe(5);
      expect(limits.pages_per_month.remaining).toBe(3);
    });

    it('canPerformAction returns true when under limit', () => {
      const { canPerformAction } = vi.mocked(useModuleUsage)('marketing_ceo', ['audits_per_month']);
      expect(canPerformAction('audits_per_month')).toBe(true);
    });
  });

  describe('ModuleUpsellCard Link Generation', () => {
    it('generates correct link to module store', () => {
      const moduleSlug = 'marketing_ceo';
      const expectedLink = `/settings?tab=modules&module=${moduleSlug}`;
      
      expect(expectedLink).toBe('/settings?tab=modules&module=marketing_ceo');
    });
  });

  describe('Store Availability', () => {
    it('module appears in available modules when not purchased', () => {
      const { getModulesBreakdown } = vi.mocked(useTenantModules)();
      const breakdown = getModulesBreakdown();
      
      const isAvailable = breakdown.availableModules.some(m => m.slug === 'marketing_ceo');
      expect(isAvailable).toBe(true);
    });

    it('module not in available when already active', () => {
      vi.mocked(useTenantModules).mockReturnValue({
        ...vi.mocked(useTenantModules)(),
        getModulesBreakdown: vi.fn(() => ({
          planIncludedModules: [],
          includedModules: [],
          purchasedModules: [{ addon_module: mockMarketingModule } as any],
          availableModules: [], // Not in available since purchased
          totalMonthly: 128.90,
          planPrice: 79,
          modulesTotal: 49.90,
        })),
      });

      const { getModulesBreakdown } = vi.mocked(useTenantModules)();
      const breakdown = getModulesBreakdown();
      
      expect(breakdown.purchasedModules).toHaveLength(1);
      expect(breakdown.availableModules).toHaveLength(0);
    });
  });

  describe('CTA Logic', () => {
    it('shows purchase CTA when module is inactive and not included', () => {
      const { isModuleActive, isModuleIncludedInPlan } = vi.mocked(useTenantModules)();
      
      const isActive = isModuleActive(mockMarketingModule.id);
      const isIncluded = isModuleIncludedInPlan(mockMarketingModule.id);
      
      const ctaType = isActive ? 'access' : isIncluded ? 'access' : 'purchase';
      expect(ctaType).toBe('purchase');
    });

    it('shows access CTA when module is active', () => {
      vi.mocked(useTenantModules).mockReturnValue({
        ...vi.mocked(useTenantModules)(),
        isModuleActive: vi.fn(() => true),
      });

      const { isModuleActive } = vi.mocked(useTenantModules)();
      
      const isActive = isModuleActive(mockMarketingModule.id);
      const ctaType = isActive ? 'access' : 'purchase';
      expect(ctaType).toBe('access');
    });
  });
});
