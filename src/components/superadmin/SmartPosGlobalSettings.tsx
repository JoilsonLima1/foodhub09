import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ConfigStatus = {
  configured: boolean;
  reason?: string;
  detail?: string;
};

export function SmartPosGlobalSettings() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus({ configured: false, reason: 'UNAUTHORIZED' });
          setIsLoading(false);
          return;
        }

        const response = await supabase.functions.invoke('smartpos-config-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (response.error) {
          setStatus({ configured: false, reason: 'INTERNAL_ERROR', detail: response.error.message });
        } else {
          setStatus(response.data as ConfigStatus);
        }
      } catch {
        setStatus({ configured: false, reason: 'INTERNAL_ERROR', detail: 'Network error' });
      } finally {
        setIsLoading(false);
      }
    }
    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const renderStatus = () => {
    if (!status) {
      return (
        <>
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">❌ Erro desconhecido</p>
            <p className="text-sm text-muted-foreground">Não foi possível verificar o status.</p>
          </div>
        </>
      );
    }

    if (status.configured) {
      return (
        <>
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-primary">✅ Configurado</p>
            <p className="text-sm text-muted-foreground">
              O SERVER_DEVICE_SECRET está configurado e pronto para uso.
            </p>
          </div>
        </>
      );
    }

    if (status.reason === 'SECRET_ABSENT') {
      return (
        <>
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">❌ Secret não configurado no ambiente</p>
            <p className="text-sm text-muted-foreground">
              Verifique <code className="bg-muted px-1 rounded">SERVER_DEVICE_SECRET</code> em Project Secrets. O valor deve ter no mínimo 32 caracteres.
            </p>
          </div>
        </>
      );
    }

    if (status.reason === 'UNAUTHORIZED' || status.reason === 'FORBIDDEN') {
      return (
        <>
          <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium text-muted-foreground">Acesso restrito</p>
            <p className="text-sm text-muted-foreground">
              Não foi possível verificar: autenticação insuficiente.
            </p>
          </div>
        </>
      );
    }

    // INTERNAL_ERROR or unknown
    return (
      <>
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="font-medium text-destructive">❌ Erro interno ao validar</p>
          <p className="text-sm text-muted-foreground">
            Verifique os logs das Edge Functions para mais detalhes.
          </p>
        </div>
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          SmartPOS – Autenticação de Dispositivos
        </CardTitle>
        <CardDescription>
          O segredo é configurado via Secrets do ambiente das Edge Functions. Não é exibido por segurança.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
          {renderStatus()}
        </div>
        <p className="text-xs text-muted-foreground">
          Para configurar ou alterar, acesse os Secrets do projeto e atualize a variável{' '}
          <code className="bg-muted px-1 rounded">SERVER_DEVICE_SECRET</code>.
        </p>
      </CardContent>
    </Card>
  );
}
