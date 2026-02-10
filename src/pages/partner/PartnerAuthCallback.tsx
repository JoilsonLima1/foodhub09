/**
 * PartnerAuthCallback - Post-login gate for partner users.
 * Route: /partner/auth/callback
 * 
 * Uses the partner_whoami edge function (service_role) to verify
 * partner status, bypassing RLS restrictions on partner_users.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { setDesiredContext } from '@/hooks/useActiveContext';

export default function PartnerAuthCallback() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/partner/auth', { replace: true });
      return;
    }

    const verifyPartner = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('partner_whoami');

        if (fnError) {
          console.error('[PARTNER_CALLBACK] Edge function error:', fnError);
          setError('Erro ao verificar conta de parceiro. Tente novamente.');
          setChecking(false);
          return;
        }

        if (!data?.is_partner) {
          console.info('[PARTNER_CALLBACK] Not a partner:', data?.reason);
          const msg = data?.reason === 'partner_inactive'
            ? 'O parceiro vinculado a esta conta está inativo.'
            : 'Esta conta não está vinculada a nenhum parceiro. Use o login padrão.';
          setError(msg);
          setChecking(false);
          return;
        }

        // User IS a partner — force context via the app's existing mechanism
        console.info('[PARTNER_CALLBACK] Partner confirmed.', {
          userId: user.id,
          partnerId: data.partner_id,
        });

        setDesiredContext('partner');

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

  const handleRetry = () => {
    setError(null);
    setChecking(true);
    // Re-trigger the effect by forcing a re-render won't work; navigate to self
    navigate('/partner/auth/callback', { replace: true });
    window.location.reload();
  };

  const handleGoToTenantLogin = () => {
    navigate('/auth?intent=login', { replace: true });
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando conta de parceiro...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRetry} className="flex-1">
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={handleGoToTenantLogin} className="flex-1">
              Login padrão
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
