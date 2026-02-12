import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function SmartPosGlobalSettings() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Não autenticado');
          setIsLoading(false);
          return;
        }

        const response = await supabase.functions.invoke('smartpos-config-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (response.error) {
          setError('Erro ao verificar status');
        } else {
          setConfigured(response.data?.configured ?? false);
        }
      } catch {
        setError('Erro ao verificar status');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          SmartPOS – Autenticação de Dispositivos
        </CardTitle>
        <CardDescription>
          O segredo de autenticação HMAC-SHA256 dos dispositivos SmartPOS é configurado como variável de ambiente (Secret) das Edge Functions, e não fica armazenado no banco de dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
          {error ? (
            <>
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">Erro ao verificar</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </>
          ) : configured ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">✅ Configurado</p>
                <p className="text-sm text-muted-foreground">
                  O SERVER_DEVICE_SECRET está configurado e pronto para uso.
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">❌ Não configurado</p>
                <p className="text-sm text-muted-foreground">
                  O SERVER_DEVICE_SECRET não foi encontrado ou é muito curto (mín. 32 caracteres). Configure-o nos Secrets do ambiente das Edge Functions.
                </p>
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Este segredo é configurado no ambiente (Secrets) das Edge Functions e não fica no banco de dados. 
          Para alterar, acesse os Secrets do projeto e atualize a variável <code className="bg-muted px-1 rounded">SERVER_DEVICE_SECRET</code>.
        </p>
      </CardContent>
    </Card>
  );
}
