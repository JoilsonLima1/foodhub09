import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { usePreparingAlerts } from '@/hooks/usePreparingAlerts';
import { TrialExpirationBanner } from '@/components/trial/TrialExpirationBanner';
import { TrialExpiredOverlay } from '@/components/trial/TrialExpiredOverlay';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useAppearance } from '@/hooks/useAppearance';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Pages that don't require feature access check (always accessible)
const ALWAYS_ACCESSIBLE_PAGES = ['/dashboard', '/settings', '/super-admin'];

export function AppLayout() {
  const location = useLocation();
  const { roles } = useAuth();
  const { sidebarCollapsed } = useAppearance();
  const { hasAccess, isTrialExpired, reason, isLoading } = useFeatureAccess();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Enable low stock alerts globally
  useLowStockAlerts();
  
  // Enable preparing order alerts globally
  usePreparingAlerts();

  // Safety timeout to prevent infinite loading state (5 seconds max)
  useEffect(() => {
    if (isLoading && !loadingTimeout) {
      const timer = setTimeout(() => {
        console.warn('[AppLayout] Loading timeout reached, rendering content');
        setLoadingTimeout(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingTimeout]);

  // Check if current page requires feature access
  const currentPath = location.pathname;
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_PAGES.some(page => currentPath.startsWith(page));
  const isSuperAdmin = roles.includes('super_admin');
  
  // Show trial expired overlay if trial expired and not on always-accessible pages
  const showTrialExpiredOverlay = isTrialExpired && !hasAccess && !isAlwaysAccessible && !isSuperAdmin;

  // Get feature name for the current page
  const getFeatureNameFromPath = (path: string): string => {
    const featureMap: Record<string, string> = {
      '/pos': 'PDV',
      '/orders': 'Pedidos',
      '/kitchen': 'Cozinha',
      '/deliveries': 'Entregas',
      '/products': 'Produtos',
      '/stock': 'Estoque',
      '/reports': 'Relatórios',
      '/tables': 'Mesas',
      '/courier-dashboard': 'Dashboard do Entregador',
    };
    return featureMap[path] || 'esta funcionalidade';
  };

  // Show loading state while checking subscription (with timeout protection)
  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "md:ml-16" : "md:ml-56"
        )}>
          <div className="p-3 md:p-4 lg:p-6 flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verificando assinatura...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <main className={cn(
        "flex-1 transition-all duration-300 overflow-y-auto max-h-screen",
        sidebarCollapsed ? "md:ml-16" : "md:ml-56"
      )}>
        <div className="p-3 md:p-4 lg:p-6 pb-8">
          <TrialExpirationBanner />
          {showTrialExpiredOverlay && (
            <TrialExpiredOverlay featureName={getFeatureNameFromPath(currentPath)} />
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
