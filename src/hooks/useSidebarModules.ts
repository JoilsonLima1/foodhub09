import { useMemo } from 'react';
import { useTenantModules } from './useTenantModules';
import { MODULE_ROUTES, ModuleRouteConfig, getModuleForRoute } from '@/lib/moduleRoutes';
import type { TenantModuleDetailed } from './useTenantModules';

export type ModuleStatus = 'active' | 'pending_setup' | 'inactive';

export interface SidebarModule {
  slug: string;
  label: string;
  icon: ModuleRouteConfig['icon'];
  status: ModuleStatus;
  route: string;
  category: ModuleRouteConfig['category'];
  /** Badge text to show (e.g., "Configurar") */
  badge?: string;
  /** Source of module (plan, purchase, manual) */
  source?: TenantModuleDetailed['source'];
}

/**
 * Hook that provides a processed list of modules for the sidebar.
 * Filters and transforms tenant modules into sidebar-friendly format.
 */
export function useSidebarModules() {
  const { tenantModules, isLoading, hasModule } = useTenantModules();

  const sidebarModules = useMemo((): SidebarModule[] => {
    if (!tenantModules) return [];

    const modules: SidebarModule[] = [];

    // Process each active tenant module
    tenantModules.forEach((tenantModule) => {
      const slug = tenantModule.addon_module?.slug;
      if (!slug) return;

      const config = MODULE_ROUTES[slug];
      if (!config) return;

      // Determine if module needs setup
      const needsSetup = config.requiresSetup;
      
      // Determine route: use routeUse if module is ready, otherwise routeConfig
      const route = needsSetup ? config.routeConfig : (config.routeUse || config.routeConfig);

      modules.push({
        slug,
        label: config.label,
        icon: config.icon,
        status: needsSetup ? 'pending_setup' : 'active',
        route,
        category: config.category,
        badge: needsSetup ? 'Configurar' : undefined,
        source: tenantModule.source,
      });
    });

    return modules;
  }, [tenantModules]);

  /**
   * Get modules filtered by category
   */
  const getModulesByCategory = (category: ModuleRouteConfig['category']): SidebarModule[] => {
    return sidebarModules.filter((m) => m.category === category);
  };

  /**
   * Check if tenant has a specific module active
   */
  const hasModuleActive = (slug: string): boolean => {
    return hasModule(slug);
  };

  /**
   * Check if a route is accessible (module is enabled)
   */
  const isRouteAccessible = (route: string): boolean => {
    const moduleConfig = getModuleForRoute(route);
    if (!moduleConfig) return true; // No module controls this route
    return hasModule(moduleConfig.slug);
  };

  /**
   * Check if Multi Lojas is active (commonly needed check)
   */
  const hasMultiStore = hasModule('multi_store');

  /**
   * Check common modules
   */
  const hasComandas = hasModule('comandas');
  const hasEvents = hasModule('events_tickets');

  return {
    sidebarModules,
    isLoading,
    getModulesByCategory,
    hasModuleActive,
    isRouteAccessible,
    hasMultiStore,
    hasComandas,
    hasEvents,
  };
}
