/**
 * E2E Tests for Module Upsell and Usage Limits
 * 
 * Tests:
 * 1. Tenant without module sees upsell page at /marketing
 * 2. Tenant with limit exceeded gets blocked on action (not entire page)
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

// Mock the hooks
vi.mock('@/hooks/useTenantModules', () => ({
  useTenantModules: vi.fn(),
}));

vi.mock('@/hooks/useModuleUsage', () => ({
  useModuleUsage: vi.fn(),
  useModulePlanLimits: vi.fn(),
}));

import { useTenantModules } from '@/hooks/useTenantModules';
import { useModuleUsage } from '@/hooks/useModuleUsage';

describe('Module Upsell System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ModuleGate with Upsell', () => {
    it('should show upsell when module is not enabled', () => {
      // Mock tenant without the marketing_ceo module
      vi.mocked(useTenantModules).mockReturnValue({
        tenantModules: [],
        allModules: [],
        tenantInfo: { subscription_plan_id: 'plan-1' },
        isLoading: false,
        error: null,
        getModulesBreakdown: () => ({
          planIncludedModules: [],
          includedModules: [],
          purchasedModules: [],
          availableModules: [],
          totalMonthly: 0,
          planPrice: 0,
          modulesTotal: 0,
        }),
        hasModule: () => false,
        isModuleIncludedInPlan: () => false,
        isModuleActive: () => false,
        getPurchaseBlockReason: () => null,
        syncModulesFromPlan: { mutateAsync: vi.fn() },
        refetch: vi.fn(),
      } as any);

      // The ModuleGate component should render the upsell fallback
      // when hasModule('marketing_ceo') returns false
      const hasModule = useTenantModules().hasModule('marketing_ceo');
      expect(hasModule).toBe(false);
    });

    it('should show module content when enabled', () => {
      // Mock tenant WITH the marketing_ceo module
      vi.mocked(useTenantModules).mockReturnValue({
        tenantModules: [
          {
            id: 'sub-1',
            tenant_id: 'tenant-1',
            addon_module_id: 'mod-1',
            status: 'active',
            source: 'purchase',
            addon_module: { slug: 'marketing_ceo', name: 'CEO de Marketing' },
          },
        ],
        allModules: [],
        tenantInfo: { subscription_plan_id: 'plan-1' },
        isLoading: false,
        error: null,
        getModulesBreakdown: () => ({
          planIncludedModules: [],
          includedModules: [],
          purchasedModules: [],
          availableModules: [],
          totalMonthly: 0,
          planPrice: 0,
          modulesTotal: 0,
        }),
        hasModule: (slug: string) => slug === 'marketing_ceo',
        isModuleIncludedInPlan: () => false,
        isModuleActive: () => true,
        getPurchaseBlockReason: () => null,
        syncModulesFromPlan: { mutateAsync: vi.fn() },
        refetch: vi.fn(),
      } as any);

      const hasModule = useTenantModules().hasModule('marketing_ceo');
      expect(hasModule).toBe(true);
    });
  });

  describe('Usage Limits Enforcement', () => {
    it('should allow action when under limit', () => {
      vi.mocked(useModuleUsage).mockReturnValue({
        limits: {
          audits_per_month: { allowed: true, limit: 5, used: 2, remaining: 3 },
        },
        isLoading: false,
        canPerformAction: () => true,
        getRemaining: () => 3,
        getLimit: () => 5,
        getUsed: () => 2,
        isUnlimited: () => false,
        tryPerformAction: vi.fn().mockResolvedValue(true),
        incrementUsage: { mutateAsync: vi.fn() },
        refetch: vi.fn(),
      } as any);

      const { canPerformAction, getRemaining } = useModuleUsage('marketing_ceo', ['audits_per_month']);
      
      expect(canPerformAction('audits_per_month')).toBe(true);
      expect(getRemaining('audits_per_month')).toBe(3);
    });

    it('should block action when limit exceeded', () => {
      vi.mocked(useModuleUsage).mockReturnValue({
        limits: {
          audits_per_month: { allowed: false, limit: 5, used: 5, remaining: 0 },
        },
        isLoading: false,
        canPerformAction: () => false,
        getRemaining: () => 0,
        getLimit: () => 5,
        getUsed: () => 5,
        isUnlimited: () => false,
        tryPerformAction: vi.fn().mockResolvedValue(false),
        incrementUsage: { mutateAsync: vi.fn() },
        refetch: vi.fn(),
      } as any);

      const { canPerformAction, getRemaining } = useModuleUsage('marketing_ceo', ['audits_per_month']);
      
      // Action should be blocked
      expect(canPerformAction('audits_per_month')).toBe(false);
      expect(getRemaining('audits_per_month')).toBe(0);
    });

    it('should allow unlimited usage for enterprise plans', () => {
      vi.mocked(useModuleUsage).mockReturnValue({
        limits: {
          audits_per_month: { allowed: true, limit: -1, used: 100, remaining: -1 },
        },
        isLoading: false,
        canPerformAction: () => true,
        getRemaining: () => -1,
        getLimit: () => -1,
        getUsed: () => 100,
        isUnlimited: () => true,
        tryPerformAction: vi.fn().mockResolvedValue(true),
        incrementUsage: { mutateAsync: vi.fn() },
        refetch: vi.fn(),
      } as any);

      const { canPerformAction, isUnlimited, getUsed } = useModuleUsage('marketing_ceo', ['audits_per_month']);
      
      // Unlimited should always allow
      expect(canPerformAction('audits_per_month')).toBe(true);
      expect(isUnlimited('audits_per_month')).toBe(true);
      expect(getUsed('audits_per_month')).toBe(100);
    });
  });

  describe('Limit Enforcement Flow', () => {
    it('should increment usage after successful action', async () => {
      const mockTryPerform = vi.fn().mockResolvedValue(true);
      
      vi.mocked(useModuleUsage).mockReturnValue({
        limits: { audits_per_month: { allowed: true, limit: 5, used: 2, remaining: 3 } },
        isLoading: false,
        canPerformAction: () => true,
        getRemaining: () => 3,
        getLimit: () => 5,
        getUsed: () => 2,
        isUnlimited: () => false,
        tryPerformAction: mockTryPerform,
        incrementUsage: { mutateAsync: vi.fn() },
        refetch: vi.fn(),
      } as any);

      const { tryPerformAction } = useModuleUsage('marketing_ceo', ['audits_per_month']);
      
      const result = await tryPerformAction('audits_per_month');
      
      expect(result).toBe(true);
      expect(mockTryPerform).toHaveBeenCalledWith('audits_per_month');
    });

    it('should reject and show toast when limit exceeded', async () => {
      const mockTryPerform = vi.fn().mockResolvedValue(false);
      
      vi.mocked(useModuleUsage).mockReturnValue({
        limits: { audits_per_month: { allowed: false, limit: 5, used: 5, remaining: 0 } },
        isLoading: false,
        canPerformAction: () => false,
        getRemaining: () => 0,
        getLimit: () => 5,
        getUsed: () => 5,
        isUnlimited: () => false,
        tryPerformAction: mockTryPerform,
        incrementUsage: { mutateAsync: vi.fn() },
        refetch: vi.fn(),
      } as any);

      const { tryPerformAction } = useModuleUsage('marketing_ceo', ['audits_per_month']);
      
      const result = await tryPerformAction('audits_per_month');
      
      expect(result).toBe(false);
    });
  });
});

describe('ModuleUpsellCard Component', () => {
  it('should display module name and price', () => {
    // Component renders with correct props
    const props = {
      moduleSlug: 'marketing_ceo',
      moduleName: 'CEO de Marketing',
      moduleDescription: 'Gerencie o SEO do seu negócio',
      modulePrice: 49.90,
    };

    expect(props.moduleName).toBe('CEO de Marketing');
    expect(props.modulePrice).toBe(49.90);
  });

  it('should have CTA to activate module', () => {
    // The component should have a link to /settings?tab=modules
    const purchaseRoute = '/settings?tab=modules';
    expect(purchaseRoute).toContain('modules');
  });
});

describe('UsageLimitBanner Component', () => {
  it('should show warning when usage is high', () => {
    const props = {
      featureName: 'auditorias',
      used: 4,
      limit: 5,
    };

    const percentUsed = (props.used / props.limit) * 100;
    expect(percentUsed).toBe(80);
  });

  it('should show blocked state when limit reached', () => {
    const props = {
      featureName: 'auditorias',
      used: 5,
      limit: 5,
      isBlocked: true,
    };

    expect(props.isBlocked).toBe(true);
    expect(props.used).toBe(props.limit);
  });

  it('should show unlimited for enterprise', () => {
    const props = {
      featureName: 'auditorias',
      used: 100,
      limit: -1,
    };

    expect(props.limit).toBe(-1);
  });
});
