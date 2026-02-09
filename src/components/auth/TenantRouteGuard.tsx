/**
 * TenantRouteGuard - Prevents partner/super_admin users from accessing tenant routes
 * 
 * CRITICAL: Returns a neutral loader during loading to prevent flash of tenant UI (AppLayout/AppSidebar).
 * Only renders children when contextType is confirmed as 'tenant'.
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
  console.info('[TENANT_GUARD]', { contextType, isLoading });

  // CRITICAL: Do NOT render children (which includes AppLayout/AppSidebar) while loading.
  // This prevents the "flash of tenant UI" for partner users.
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

  // Super admin with active context 'super_admin' → redirect to super admin panel
  if (contextType === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }

  // Only render tenant layout/children when context is confirmed as 'tenant'
  return <>{children}</>;
}
