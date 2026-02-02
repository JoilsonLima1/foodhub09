/**
 * ModuleGate Component
 * 
 * Wraps content that requires a specific module to be enabled.
 * Shows a CTA to purchase the module if not enabled.
 */

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useModuleEnabled, useFeatureEnabled } from '@/hooks/useModuleAccess';
import { getModuleConfig } from '@/lib/moduleRoutes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ModuleGateProps {
  /** Module slug to check */
  moduleSlug?: string;
  /** Feature key to check (alternative to moduleSlug) */
  feature?: string;
  /** Content to render if module is enabled */
  children: ReactNode;
  /** What to render when loading (default: skeleton) */
  loadingFallback?: ReactNode;
  /** What to render when module is disabled (default: CTA card) */
  disabledFallback?: ReactNode;
  /** If true, just hide the content instead of showing CTA */
  hideWhenDisabled?: boolean;
  /** Custom message for the CTA */
  customMessage?: string;
}

export function ModuleGate({
  moduleSlug,
  feature,
  children,
  loadingFallback,
  disabledFallback,
  hideWhenDisabled = false,
  customMessage,
}: ModuleGateProps) {
  // Use either module or feature check
  const moduleAccess = useModuleEnabled(moduleSlug || '');
  const featureAccess = useFeatureEnabled(feature || '');

  // Determine which access result to use
  const access = moduleSlug ? moduleAccess : featureAccess;
  const config = moduleSlug ? getModuleConfig(moduleSlug) : null;

  // Loading state
  if (access.isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Module enabled - render children
  if (access.isEnabled) {
    return <>{children}</>;
  }

  // Module disabled - hide content if requested
  if (hideWhenDisabled) {
    return null;
  }

  // Custom fallback
  if (disabledFallback) {
    return <>{disabledFallback}</>;
  }

  // Default CTA card
  const Icon = config?.icon || Lock;
  const moduleName = access.moduleLabel || 'este recurso';

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-lg">Módulo não contratado</CardTitle>
        <CardDescription className="max-w-md mx-auto">
          {customMessage || `O módulo "${moduleName}" não está ativo para sua conta. Ative-o para desbloquear esta funcionalidade.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center pt-2">
        <Link to={access.purchaseRoute}>
          <Button>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Ver na Loja de Módulos
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Higher-order component version for route protection
 */
export function withModuleGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleSlug: string
) {
  return function ModuleGatedComponent(props: P) {
    return (
      <ModuleGate moduleSlug={moduleSlug}>
        <WrappedComponent {...props} />
      </ModuleGate>
    );
  };
}

/**
 * Simple hook-based check for inline conditionals
 */
export function ModuleCheck({
  moduleSlug,
  feature,
  children,
}: {
  moduleSlug?: string;
  feature?: string;
  children: ReactNode;
}) {
  const moduleAccess = useModuleEnabled(moduleSlug || '');
  const featureAccess = useFeatureEnabled(feature || '');
  const access = moduleSlug ? moduleAccess : featureAccess;

  if (access.isLoading || !access.isEnabled) {
    return null;
  }

  return <>{children}</>;
}
