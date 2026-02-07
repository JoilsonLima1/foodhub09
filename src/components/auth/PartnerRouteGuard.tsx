/**
 * PartnerRouteGuard - Protects partner routes
 * 
 * Ensures only authenticated partner users can access partner routes.
 * Redirects to home if user is not a partner user.
 */

import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PartnerRouteGuardProps {
  children: ReactNode;
  /** Require partner_admin role (not just partner_support) */
  requireAdmin?: boolean;
}

export function PartnerRouteGuard({ children, requireAdmin = false }: PartnerRouteGuardProps) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    isPartnerUser, 
    isPartnerAdmin, 
    currentPartner, 
    isLoading: partnerLoading, 
    error 
  } = usePartnerContext();

  const isLoading = authLoading || partnerLoading;

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) return;

    // Not logged in - redirect to auth
    if (!user) {
      navigate('/auth', { replace: true, state: { from: '/partner' } });
      return;
    }

    // Not a partner user - redirect to home or dashboard
    if (!isPartnerUser) {
      navigate('/', { replace: true });
      return;
    }

    // Partner not active - show error (handled in render)
    if (!currentPartner) {
      return;
    }

    // Require admin but user is only support
    if (requireAdmin && !isPartnerAdmin) {
      navigate('/partner', { replace: true });
      return;
    }
  }, [isLoading, user, isPartnerUser, isPartnerAdmin, currentPartner, requireAdmin, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando painel do parceiro...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso negado</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate('/')}>
                Voltar ao início
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not a partner user
  if (!isPartnerUser || !currentPartner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription className="mt-2">
            Esta área é exclusiva para parceiros. Se você é um parceiro, entre em contato com o administrador.
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate('/')}>
                Voltar ao início
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
