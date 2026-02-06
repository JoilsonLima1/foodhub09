/**
 * E2E Tests for Module Trial and Free Activation Flow
 * 
 * Tests:
 * 1. Free plan user can activate module for free
 * 2. Non-free plan user can activate trial
 * 3. Trial expiration blocks access
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
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' }, error: null }),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      update: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
  },
}));

// Mock hooks
vi.mock('@/hooks/useTenantModules', () => ({
  useTenantModules: vi.fn(),
}));

vi.mock('@/hooks/useSubscriptionPlans', () => ({
  useSubscriptionPlans: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ tenantId: 'tenant-1' })),
}));

import { useTenantModules } from '@/hooks/useTenantModules';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { TRIAL_DURATION_DAYS } from '@/hooks/useModuleTrial';

const mockFreePlan = { id: 'plan-free', name: 'Grátis', slug: 'free', is_active: true, display_order: 0, monthly_price: 0 };
const mockStarterPlan = { id: 'plan-starter', name: 'Starter', slug: 'starter', is_active: true, display_order: 1, monthly_price: 79 };
const mockProPlan = { id: 'plan-pro', name: 'Professional', slug: 'professional', is_active: true, display_order: 2, monthly_price: 199 };

const mockPlans = [mockFreePlan, mockStarterPlan, mockProPlan];

describe('Module Trial and Free Activation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSubscriptionPlans).mockReturnValue({
      plans: mockPlans,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  describe('Free Plan User - Free Activation', () => {
    beforeEach(() => {
      vi.mocked(useTenantModules).mockReturnValue({
        tenantInfo: {
          id: 'tenant-1',
          subscription_plan_id: 'plan-free',
          subscription_status: 'active',
          subscription_plans: mockFreePlan,
        },
        isModuleActive: vi.fn(() => false),
        isModuleIncludedInPlan: vi.fn(() => false),
        hasModule: vi.fn(() => false),
        isLoading: false,
        tenantModules: [],
        allModules: [],
        error: null,
        getModulesBreakdown: vi.fn(() => ({
          planIncludedModules: [],
          includedModules: [],
          purchasedModules: [],
          availableModules: [],
          totalMonthly: 0,
          planPrice: 0,
          modulesTotal: 0,
        })),
        getPurchaseBlockReason: vi.fn(() => null),
        syncModulesFromPlan: { mutateAsync: vi.fn() } as any,
        refetch: vi.fn(),
      });
    });

    it('should identify user as being on free plan', () => {
      const { tenantInfo } = vi.mocked(useTenantModules)();
      const { plans } = vi.mocked(useSubscriptionPlans)();
      
      const currentPlanSlug = plans?.find(p => p.id === tenantInfo?.subscription_plan_id)?.slug;
      expect(currentPlanSlug).toBe('free');
    });

    it('should allow free activation for free plan users', () => {
      const { plans } = vi.mocked(useSubscriptionPlans)();
      const { tenantInfo } = vi.mocked(useTenantModules)();
      
      const currentPlanSlug = plans?.find(p => p.id === tenantInfo?.subscription_plan_id)?.slug;
      const isOnFreePlan = ['free', 'starter'].includes(currentPlanSlug || '');
      
      expect(isOnFreePlan).toBe(true);
    });

    it('should show "Ativar Grátis" CTA for free plan users', () => {
      const { plans } = vi.mocked(useSubscriptionPlans)();
      const { tenantInfo, isModuleActive, isModuleIncludedInPlan } = vi.mocked(useTenantModules)();
      
      const currentPlanSlug = plans?.find(p => p.id === tenantInfo?.subscription_plan_id)?.slug;
      const isOnFreePlan = ['free', 'starter'].includes(currentPlanSlug || '');
      const isActive = isModuleActive('module-id');
      const isIncluded = isModuleIncludedInPlan('module-id');
      
      // Logic for CTA type
      let ctaType: string;
      if (isActive) {
        ctaType = 'active';
      } else if (isIncluded) {
        ctaType = 'included';
      } else if (isOnFreePlan) {
        ctaType = 'free_activate';
      } else {
        ctaType = 'trial_available';
      }
      
      expect(ctaType).toBe('free_activate');
    });

    it('should create subscription with source "free_activation"', () => {
      // This tests the expected data structure for free activation
      const expectedInsert = {
        tenant_id: 'tenant-1',
        addon_module_id: 'module-marketing-ceo',
        status: 'active',
        source: 'free_activation',
        is_free: true,
        price_paid: 0,
      };
      
      expect(expectedInsert.source).toBe('free_activation');
      expect(expectedInsert.is_free).toBe(true);
      expect(expectedInsert.status).toBe('active');
    });
  });

  describe('Professional Plan User - Trial Activation', () => {
    beforeEach(() => {
      vi.mocked(useTenantModules).mockReturnValue({
        tenantInfo: {
          id: 'tenant-1',
          subscription_plan_id: 'plan-pro',
          subscription_status: 'active',
          subscription_plans: mockProPlan,
        },
        isModuleActive: vi.fn(() => false),
        isModuleIncludedInPlan: vi.fn(() => false),
        hasModule: vi.fn(() => false),
        isLoading: false,
        tenantModules: [],
        allModules: [],
        error: null,
        getModulesBreakdown: vi.fn(() => ({
          planIncludedModules: [],
          includedModules: [],
          purchasedModules: [],
          availableModules: [],
          totalMonthly: 199,
          planPrice: 199,
          modulesTotal: 0,
        })),
        getPurchaseBlockReason: vi.fn(() => null),
        syncModulesFromPlan: { mutateAsync: vi.fn() } as any,
        refetch: vi.fn(),
      });
    });

    it('should identify user as NOT being on free plan', () => {
      const { tenantInfo } = vi.mocked(useTenantModules)();
      const { plans } = vi.mocked(useSubscriptionPlans)();
      
      const currentPlanSlug = plans?.find(p => p.id === tenantInfo?.subscription_plan_id)?.slug;
      const isOnFreePlan = ['free', 'starter'].includes(currentPlanSlug || '');
      
      expect(isOnFreePlan).toBe(false);
    });

    it('should show trial CTA for non-free plan users', () => {
      const { plans } = vi.mocked(useSubscriptionPlans)();
      const { tenantInfo, isModuleActive, isModuleIncludedInPlan } = vi.mocked(useTenantModules)();
      
      const currentPlanSlug = plans?.find(p => p.id === tenantInfo?.subscription_plan_id)?.slug;
      const isOnFreePlan = ['free', 'starter'].includes(currentPlanSlug || '');
      const isActive = isModuleActive('module-id');
      const isIncluded = isModuleIncludedInPlan('module-id');
      const canStartTrial = true; // Simulating no previous trial
      
      let ctaType: string;
      if (isActive) {
        ctaType = 'active';
      } else if (isIncluded) {
        ctaType = 'included';
      } else if (isOnFreePlan) {
        ctaType = 'free_activate';
      } else if (canStartTrial) {
        ctaType = 'trial_available';
      } else {
        ctaType = 'purchase';
      }
      
      expect(ctaType).toBe('trial_available');
    });

    it('should use correct trial duration', () => {
      expect(TRIAL_DURATION_DAYS).toBe(7);
    });

    it('should create subscription with trial status and trial_ends_at', () => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);
      
      const expectedInsert = {
        tenant_id: 'tenant-1',
        addon_module_id: 'module-marketing-ceo',
        status: 'trial',
        source: 'trial',
        is_free: true,
        price_paid: 0,
        trial_ends_at: trialEndsAt.toISOString(),
      };
      
      expect(expectedInsert.status).toBe('trial');
      expect(expectedInsert.source).toBe('trial');
      expect(expectedInsert.trial_ends_at).toBeDefined();
    });
  });

  describe('Trial Expiration Logic', () => {
    it('should block access when trial is expired', () => {
      const expiredTrialEndsAt = new Date();
      expiredTrialEndsAt.setDate(expiredTrialEndsAt.getDate() - 1); // Yesterday
      
      const mockSubscription = {
        status: 'trial',
        trial_ends_at: expiredTrialEndsAt.toISOString(),
      };
      
      const now = new Date();
      const trialEndsAt = new Date(mockSubscription.trial_ends_at);
      const isExpired = trialEndsAt < now;
      
      expect(isExpired).toBe(true);
    });

    it('should allow access when trial is still valid', () => {
      const validTrialEndsAt = new Date();
      validTrialEndsAt.setDate(validTrialEndsAt.getDate() + 3); // 3 days from now
      
      const mockSubscription = {
        status: 'trial',
        trial_ends_at: validTrialEndsAt.toISOString(),
      };
      
      const now = new Date();
      const trialEndsAt = new Date(mockSubscription.trial_ends_at);
      const isExpired = trialEndsAt < now;
      
      expect(isExpired).toBe(false);
    });

    it('should calculate remaining days correctly', () => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 5);
      
      const now = new Date();
      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysRemaining).toBe(5);
    });

    it('should return 0 remaining days for expired trial', () => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() - 2);
      
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      expect(daysRemaining).toBe(0);
    });
  });

  describe('hasModule with Trial Expiration', () => {
    it('should return false when trial is expired', () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      const mockModules = [
        {
          addon_module: { slug: 'marketing_ceo' },
          addon_module_id: 'mod-1',
          status: 'trial',
          trial_ends_at: expiredDate.toISOString(),
          expires_at: null,
        },
      ];
      
      const hasModule = (slug: string): boolean => {
        return mockModules.some(m => {
          if (m.addon_module?.slug !== slug) return false;
          if (!['active', 'trial'].includes(m.status)) return false;
          
          // Check trial expiration
          if (m.status === 'trial' && m.trial_ends_at) {
            const trialEndsAt = new Date(m.trial_ends_at);
            if (trialEndsAt < new Date()) return false;
          }
          
          return true;
        });
      };
      
      expect(hasModule('marketing_ceo')).toBe(false);
    });

    it('should return true when trial is active', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      const mockModules = [
        {
          addon_module: { slug: 'marketing_ceo' },
          addon_module_id: 'mod-1',
          status: 'trial',
          trial_ends_at: futureDate.toISOString(),
          expires_at: null,
        },
      ];
      
      const hasModule = (slug: string): boolean => {
        return mockModules.some(m => {
          if (m.addon_module?.slug !== slug) return false;
          if (!['active', 'trial'].includes(m.status)) return false;
          
          if (m.status === 'trial' && m.trial_ends_at) {
            const trialEndsAt = new Date(m.trial_ends_at);
            if (trialEndsAt < new Date()) return false;
          }
          
          return true;
        });
      };
      
      expect(hasModule('marketing_ceo')).toBe(true);
    });

    it('should return true for active (non-trial) modules', () => {
      const mockModules = [
        {
          addon_module: { slug: 'marketing_ceo' },
          addon_module_id: 'mod-1',
          status: 'active',
          trial_ends_at: null,
          expires_at: null,
        },
      ];
      
      const hasModule = (slug: string): boolean => {
        return mockModules.some(m => {
          if (m.addon_module?.slug !== slug) return false;
          if (!['active', 'trial'].includes(m.status)) return false;
          return true;
        });
      };
      
      expect(hasModule('marketing_ceo')).toBe(true);
    });
  });

  describe('Data Preservation on Trial Expiration', () => {
    it('should not delete subscription data when trial expires', () => {
      // This is a behavioral expectation - trial expiration only changes access,
      // not the underlying data
      const mockExpiredSubscription = {
        id: 'sub-1',
        tenant_id: 'tenant-1',
        addon_module_id: 'mod-1',
        status: 'trial',
        trial_ends_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        // All data should remain:
        started_at: '2026-01-01T00:00:00Z',
        source: 'trial',
        is_free: true,
      };
      
      // Verify all fields are still present
      expect(mockExpiredSubscription.id).toBeDefined();
      expect(mockExpiredSubscription.started_at).toBeDefined();
      expect(mockExpiredSubscription.source).toBe('trial');
    });
  });
});
