/**
 * ModuleRouteGuard Component
 * 
 * Protects routes based on module activation status.
 * Redirects to module store with message if module is not enabled.
 */

import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRouteAccess } from '@/hooks/useModuleAccess';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ModuleRouteGuardProps {
  children: ReactNode;
  /** Optional explicit module slug (if not inferring from route) */
  moduleSlug?: string;
}

export function ModuleRouteGuard({ children, moduleSlug }: ModuleRouteGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const access = useRouteAccess(location.pathname);

  useEffect(() => {
    // Skip if still loading or if route is accessible
    if (access.isLoading || access.isEnabled) {
      return;
    }

    // Route requires a module that's not enabled
    if (access.moduleSlug) {
      toast({
        title: 'Módulo não contratado',
        description: `O módulo "${access.moduleLabel}" precisa estar ativo para acessar esta página.`,
        variant: 'destructive',
      });

      // Redirect to module store with highlight
      navigate(access.purchaseRoute, { replace: true });
    }
  }, [access.isLoading, access.isEnabled, access.moduleSlug, access.moduleLabel, access.purchaseRoute, navigate, toast]);

  // Show loading while checking access
  if (access.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // If module not enabled, don't render children (redirect will happen)
  if (!access.isEnabled && access.moduleSlug) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Higher-order component for protecting routes
 */
export function withModuleRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleSlug?: string
) {
  return function ModuleProtectedRoute(props: P) {
    return (
      <ModuleRouteGuard moduleSlug={moduleSlug}>
        <WrappedComponent {...props} />
      </ModuleRouteGuard>
    );
  };
}
