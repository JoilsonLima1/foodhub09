/**
 * PartnerAccessGuard - Wraps partner routes to enforce dunning-based access control
 */

import { usePartnerAccessState } from '@/hooks/usePartnerAccessState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Ban, ShieldAlert, Loader2 } from 'lucide-react';

interface PartnerAccessGuardProps {
  children: React.ReactNode;
}

export function PartnerAccessGuard({ children }: PartnerAccessGuardProps) {
  const { isBlocked, isReadOnly, dunningLevel, message, isLoading } = usePartnerAccessState();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md text-center space-y-4">
          <Ban className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-destructive">Acesso Bloqueado</h2>
          <p className="text-muted-foreground">{message}</p>
          <Badge variant="destructive" className="text-sm">
            Nível de Inadimplência: L{dunningLevel}
          </Badge>
          <div className="pt-4">
            <Button variant="outline" asChild>
              <a href="mailto:suporte@plataforma.com">Contatar Suporte</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isReadOnly && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {dunningLevel === 1 && !isReadOnly && !isBlocked && message && (
        <Alert className="mb-4 border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Atenção</AlertTitle>
          <AlertDescription className="text-warning/80">{message}</AlertDescription>
        </Alert>
      )}
      {children}
    </>
  );
}
