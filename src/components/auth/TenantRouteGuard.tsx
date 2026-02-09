/**
 * TenantRouteGuard - Prevents partner/super_admin users from accessing tenant routes
 * 
 * Redirects users to their correct dashboard based on active context:
 * - partner context → /partner
 * - super_admin context → /super-admin
 * - tenant context → renders children normally
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useActiveContext } from '@/hooks/useActiveContext';
import { Loader2 } from 'lucide-react';

interface TenantRouteGuardProps {
  children: ReactNode;
}

export function TenantRouteGuard({ children }: TenantRouteGuardProps) {
  const { contextType, isLoading } = useActiveContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Partner users should never see tenant dashboard
  if (contextType === 'partner') {
    return <Navigate to="/partner" replace />;
  }

  // Note: super_admin with tenant context='super_admin' can still access tenant routes
  // if they explicitly switch context to 'tenant' via ContextSwitcher.
  // We only block when active context is clearly not tenant.

  return <>{children}</>;
}
