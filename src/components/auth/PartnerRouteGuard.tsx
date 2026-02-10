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

    // Not logged in - redirect to partner auth (NOT generic /auth)
    if (!user) {
      navigate('/partner/auth', { replace: true });
      return;
    }

    // Check localStorage for partner context as fallback while PartnerContext resolves
    const storedContext = (() => { try { return localStorage.getItem('active_context'); } catch { return null; } })();
    
    // Not a partner user AND no stored partner context - redirect
    if (!isPartnerUser && storedContext !== 'partner') {
      console.warn('[PARTNER_GUARD] Not a partner, redirecting to /');
      navigate('/', { replace: true });
      return;
    }

    // If isPartnerUser is true but partner not loaded yet, wait (don't redirect)
    if (isPartnerUser && !currentPartner) {
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

  // Not a partner user - but check stored context before showing error
  const storedCtx = (() => { try { return localStorage.getItem('active_context'); } catch { return null; } })();
  if ((!isPartnerUser || !currentPartner) && storedCtx !== 'partner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Esta conta não é de parceiro</AlertTitle>
          <AlertDescription className="mt-2">
            A conta que você usou para entrar não possui acesso ao painel de parceiros. 
            Verifique se usou o email correto ou crie uma nova conta de parceiro.
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>
                Voltar ao início
              </Button>
              <Button onClick={() => navigate('/parceiros/cadastrar')}>
                Criar conta de parceiro
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If stored context says partner but PartnerContext still loading data, show loader
  if (!isPartnerUser || !currentPartner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando painel do parceiro...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
