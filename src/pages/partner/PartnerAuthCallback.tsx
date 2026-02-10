/**
 * PartnerAuthCallback - Post-login gate for partner users.
 * Route: /partner/auth/callback
 * 
 * Responsibilities:
 * 1. Wait for auth session
 * 2. Check if the user is a partner_user
 * 3. If yes → force partner context & navigate to /partner/dashboard
 * 4. If no → show error with logout option
 * 
 * This component does NOT depend on useActiveContext resolution timing.
 * It directly queries partner_users and forces the context.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CONTEXT_STORAGE_KEY = 'active_context';

export default function PartnerAuthCallback() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Not logged in — send back to partner login
      navigate('/partner/auth', { replace: true });
      return;
    }

    // Check if this user is a partner
    const verifyPartner = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('partner_users')
          .select('id, partner_id, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (queryError) {
          console.error('[PARTNER_CALLBACK] Query error:', queryError);
          setError('Erro ao verificar conta de parceiro.');
          setChecking(false);
          return;
        }

        if (!data) {
          console.info('[PARTNER_CALLBACK] User is NOT a partner:', user.id);
          setError('Esta conta não está vinculada a nenhum parceiro. Use o login padrão.');
          setChecking(false);
          return;
        }

        // User IS a partner — force context
        console.info('[PARTNER_CALLBACK] Partner confirmed. Forcing context.', {
          userId: user.id,
          partnerId: data.partner_id,
        });

        // Force active_context to 'partner' in localStorage
        try {
          localStorage.setItem(CONTEXT_STORAGE_KEY, 'partner');
        } catch { /* ignore */ }

        // Navigate to partner dashboard
        navigate('/partner/dashboard', { replace: true });
      } catch (err) {
        console.error('[PARTNER_CALLBACK] Exception:', err);
        setError('Erro inesperado. Tente novamente.');
        setChecking(false);
      }
    };

    verifyPartner();
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/partner/auth', { replace: true });
  };

  const handleGoToTenantLogin = () => {
    navigate('/auth?intent=login', { replace: true });
  };

  // Loading state
  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando conta de parceiro...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleGoToTenantLogin} className="flex-1">
              Ir para login padrão
            </Button>
            <Button variant="destructive" onClick={handleLogout} className="flex-1">
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
