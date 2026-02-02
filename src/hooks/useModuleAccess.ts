/**
 * useModuleAccess Hook
 * 
 * Centralized hook for checking module access permissions.
 * Used by frontend gating (routes, menus, features).
 */

import { useMemo } from 'react';
import { useTenantModules } from './useTenantModules';
import { getModuleConfig, getModuleForRoute, getModuleForFeature, MODULE_ROUTES } from '@/lib/moduleRoutes';

export interface ModuleAccessResult {
  /** Whether the module is enabled for this tenant */
  isEnabled: boolean;
  /** Whether we're still loading module data */
  isLoading: boolean;
  /** The module slug */
  moduleSlug: string | null;
  /** The module label for display */
  moduleLabel: string | null;
  /** Route to purchase/enable the module */
  purchaseRoute: string;
}

/**
 * Check if a specific module is enabled for the current tenant
 */
export function useModuleEnabled(moduleSlug: string): ModuleAccessResult {
  const { hasModule, isLoading } = useTenantModules();

  return useMemo(() => {
    const config = getModuleConfig(moduleSlug);
    const isEnabled = hasModule(moduleSlug);

    return {
      isEnabled,
      isLoading,
      moduleSlug,
      moduleLabel: config?.label || moduleSlug,
      purchaseRoute: '/settings?tab=modules',
    };
  }, [moduleSlug, hasModule, isLoading]);
}

/**
 * Check if a route is accessible based on module permissions
 */
export function useRouteAccess(route: string): ModuleAccessResult {
  const { hasModule, isLoading } = useTenantModules();

  return useMemo(() => {
    const moduleConfig = getModuleForRoute(route);

    // If no module controls this route, it's always accessible
    if (!moduleConfig) {
      return {
        isEnabled: true,
        isLoading,
        moduleSlug: null,
        moduleLabel: null,
        purchaseRoute: '/settings?tab=modules',
      };
    }

    const isEnabled = hasModule(moduleConfig.slug);

    return {
      isEnabled,
      isLoading,
      moduleSlug: moduleConfig.slug,
      moduleLabel: moduleConfig.label,
      purchaseRoute: `/settings?tab=modules&highlight=${moduleConfig.slug}`,
    };
  }, [route, hasModule, isLoading]);
}

/**
 * Check if a feature is accessible based on module permissions
 */
export function useFeatureEnabled(feature: string): ModuleAccessResult {
  const { hasModule, isLoading } = useTenantModules();

  return useMemo(() => {
    const moduleConfig = getModuleForFeature(feature);

    // If no module controls this feature, it's always accessible
    if (!moduleConfig) {
      return {
        isEnabled: true,
        isLoading,
        moduleSlug: null,
        moduleLabel: null,
        purchaseRoute: '/settings?tab=modules',
      };
    }

    const isEnabled = hasModule(moduleConfig.slug);

    return {
      isEnabled,
      isLoading,
      moduleSlug: moduleConfig.slug,
      moduleLabel: moduleConfig.label,
      purchaseRoute: `/settings?tab=modules&highlight=${moduleConfig.slug}`,
    };
  }, [feature, hasModule, isLoading]);
}

/**
 * Get all enabled modules for the current tenant
 */
export function useEnabledModules() {
  const { tenantModules, isLoading } = useTenantModules();

  const enabledSlugs = useMemo(() => {
    if (!tenantModules) return new Set<string>();
    return new Set(
      tenantModules
        .filter((m) => ['active', 'trial'].includes(m.status))
        .map((m) => m.addon_module?.slug)
        .filter(Boolean) as string[]
    );
  }, [tenantModules]);

  const enabledModules = useMemo(() => {
    return Object.values(MODULE_ROUTES).filter((config) => enabledSlugs.has(config.slug));
  }, [enabledSlugs]);

  return {
    enabledSlugs,
    enabledModules,
    isLoading,
    hasModule: (slug: string) => enabledSlugs.has(slug),
  };
}

/**
 * Check multiple modules at once
 */
export function useMultipleModulesEnabled(moduleSlugs: string[]): Record<string, boolean> {
  const { hasModule, isLoading } = useTenantModules();

  return useMemo(() => {
    const result: Record<string, boolean> = {};
    moduleSlugs.forEach((slug) => {
      result[slug] = hasModule(slug);
    });
    return result;
  }, [moduleSlugs, hasModule, isLoading]);
}
