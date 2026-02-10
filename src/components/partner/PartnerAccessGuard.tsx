/**
 * PartnerAccessGuard - Wraps partner routes to enforce dunning-based access control (L1-L4)
 * 
 * L0 = Full access (no overdue)
 * L1 = Warning banner (1-7 days overdue)
 * L2 = Read-only mode (8-15 days overdue) — blocks create/edit/delete actions
 * L3 = Partial block (16-30 days overdue) — only dashboard + billing accessible
 * L4 = Full block (30+ days overdue) — only billing page accessible
 */

import { usePartnerAccessState } from '@/hooks/usePartnerAccessState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Ban, ShieldAlert, Loader2, Lock } from 'lucide-react';
import { useLocation, Navigate } from 'react-router-dom';

interface PartnerAccessGuardProps {
  children: React.ReactNode;
}

/** Routes always accessible regardless of dunning level */
const ALWAYS_ALLOWED_ROUTES = ['/partner/billing', '/partner/api-keys'];

/** Routes accessible at L3 (partial block) */
const L3_ALLOWED_ROUTES = ['/partner/dashboard', '/partner/billing', '/partner/api-keys'];

export function PartnerAccessGuard({ children }: PartnerAccessGuardProps) {
  const { isBlocked, isReadOnly, dunningLevel, message, isLoading } = usePartnerAccessState();
  const location = useLocation();
  const currentPath = location.pathname;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAlwaysAllowed = ALWAYS_ALLOWED_ROUTES.some(r => currentPath.startsWith(r));

  // L4: Full block — only billing page
  if (isBlocked && !isAlwaysAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md text-center space-y-4">
          <Ban className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-destructive">Acesso Bloqueado</h2>
          <p className="text-muted-foreground">{message || 'Sua conta possui pendências financeiras graves. Regularize para restaurar o acesso.'}</p>
          <Badge variant="destructive" className="text-sm">
            Nível de Inadimplência: L{dunningLevel}
          </Badge>
          <div className="pt-4 flex flex-col gap-2 items-center">
            <Button asChild>
              <a href="/partner/billing">Ver Faturas e Regularizar</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:suporte@plataforma.com">Contatar Suporte</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // L3: Partial block — only dashboard + billing
  if (dunningLevel >= 3 && !isBlocked) {
    const isL3Allowed = L3_ALLOWED_ROUTES.some(r => currentPath.startsWith(r));
    if (!isL3Allowed) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="max-w-md text-center space-y-4">
            <Lock className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Acesso Parcialmente Bloqueado</h2>
            <p className="text-muted-foreground">
              Devido a pendências financeiras, o acesso a esta área está temporariamente suspenso. 
              Regularize suas faturas para restaurar o acesso completo.
            </p>
            <Badge variant="destructive" className="text-sm">
              Nível de Inadimplência: L{dunningLevel}
            </Badge>
            <div className="pt-4 flex gap-2 justify-center">
              <Button asChild>
                <a href="/partner/billing">Regularizar Agora</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/partner/dashboard">Ir ao Dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <>
      {/* L2: Read-only warning */}
      {isReadOnly && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Somente Leitura (L{dunningLevel})</AlertTitle>
          <AlertDescription>
            {message || 'Operações de criação e edição estão temporariamente bloqueadas devido a pendências financeiras.'}
            {' '}
            <a href="/partner/billing" className="underline font-medium">Regularizar agora →</a>
          </AlertDescription>
        </Alert>
      )}
      {/* L1: Warning banner */}
      {dunningLevel === 1 && !isReadOnly && !isBlocked && message && (
        <Alert className="mb-4 border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Atenção — Fatura(s) Vencida(s)</AlertTitle>
          <AlertDescription className="text-warning/80">
            {message}
            {' '}
            <a href="/partner/billing" className="underline font-medium">Ver faturas →</a>
          </AlertDescription>
        </Alert>
      )}
      {children}
    </>
  );
}
