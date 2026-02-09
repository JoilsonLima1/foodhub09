import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveContext } from '@/hooks/useActiveContext';
import type { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, roles, isLoading } = useAuth();
  const { getDefaultRoute, contextType, isLoading: contextLoading } = useActiveContext();
  const location = useLocation();
  console.info('[PROTECTED_ROUTE]', { path: location.pathname, contextType, contextLoading });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = allowedRoles.some(role => roles.includes(role));
    if (!hasPermission) {
      // Use context-aware redirect instead of hardcoded /dashboard
      return <Navigate to={getDefaultRoute()} replace />;
    }
  }

  return <>{children}</>;
}
