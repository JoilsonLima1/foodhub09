import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Wifi, WifiOff, Save, Zap, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
  scope: 'platform' | 'partner' | 'tenant';
  scopeId?: string; // partner_id or tenant_id
  pspProviderId: string;
}

export function WooviCredentialsPanel({ scope, scopeId, pspProviderId }: Props) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const credentialKey = ['woovi-credentials', scope, scopeId, pspProviderId];

  // Fetch existing credentials
  const { data: existingCred, isLoading } = useQuery({
    queryKey: credentialKey,
    queryFn: async () => {
      if (scope === 'tenant' && scopeId) {
        const { data } = await supabase
          .from('tenant_psp_accounts')
          .select('*')
          .eq('tenant_id', scopeId)
          .eq('psp_provider_id', pspProviderId)
          .maybeSingle();
        return data;
      } else {
        let query = supabase
          .from('pix_platform_credentials')
          .select('*')
          .eq('psp_provider_id', pspProviderId)
          .eq('scope', scope);
        
        if (scopeId) {
          query = query.eq('scope_id', scopeId);
        } else {
          query = query.is('scope_id', null);
        }
        
        const { data } = await query.maybeSingle();
        return data;
      }
    },
  });

  useEffect(() => {
    if (existingCred) {
      setApiKey(existingCred.api_key_encrypted ? '••••••••••••' : '');
      setWebhookSecret(existingCred.webhook_secret_encrypted ? '••••••••' : '');
    }
  }, [existingCred]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isKeyMasked = apiKey.startsWith('••');
      const isSecretMasked = webhookSecret.startsWith('••');

      if (scope === 'tenant' && scopeId) {
        const payload: any = {
          tenant_id: scopeId,
          psp_provider_id: pspProviderId,
          is_enabled: true,
          use_platform_credentials: false,
          connection_status: 'pending',
        };
        if (!isKeyMasked) payload.api_key_encrypted = apiKey;
        if (!isSecretMasked) payload.webhook_secret_encrypted = webhookSecret;

        if (existingCred?.id) {
          const { error } = await supabase
            .from('tenant_psp_accounts')
            .update(payload)
            .eq('id', existingCred.id);
          if (error) throw error;
        } else {
          if (!apiKey || isKeyMasked) throw new Error('API Key obrigatória');
          payload.api_key_encrypted = apiKey;
          payload.kyc_status = 'not_required';
          const { error } = await supabase
            .from('tenant_psp_accounts')
            .insert(payload);
          if (error) throw error;
        }
      } else {
        const payload: any = {
          psp_provider_id: pspProviderId,
          scope,
          scope_id: scopeId || null,
          is_active: true,
          connection_status: 'pending',
        };
        if (!isKeyMasked) payload.api_key_encrypted = apiKey;
        if (!isSecretMasked) payload.webhook_secret_encrypted = webhookSecret;

        if (existingCred?.id) {
          const { error } = await supabase
            .from('pix_platform_credentials')
            .update(payload)
            .eq('id', existingCred.id);
          if (error) throw error;
        } else {
          if (!apiKey || isKeyMasked) throw new Error('API Key obrigatória');
          payload.api_key_encrypted = apiKey;
          const { error } = await supabase
            .from('pix_platform_credentials')
            .insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKey });
      toast({ title: 'Credenciais salvas' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    },
  });

  const handleTestConnection = async () => {
    const keyToTest = apiKey.startsWith('••') ? existingCred?.api_key_encrypted : apiKey;
    if (!keyToTest) {
      toast({ title: 'Informe a API Key primeiro', variant: 'destructive' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('pix-rapido', {
        body: { action: 'test-connection', api_key: keyToTest, psp_name: 'woovi' },
      });
      if (error) throw error;
      setTestResult({ ok: data?.connected, error: data?.error });

      // Update connection status
      const status = data?.connected ? 'connected' : 'error';
      if (scope === 'tenant' && scopeId && existingCred?.id) {
        await supabase
          .from('tenant_psp_accounts')
          .update({ connection_status: status, connection_tested_at: new Date().toISOString() })
          .eq('id', existingCred.id);
      } else if (existingCred?.id) {
        await supabase
          .from('pix_platform_credentials')
          .update({ connection_status: status, connection_tested_at: new Date().toISOString() })
          .eq('id', existingCred.id);
      }
      queryClient.invalidateQueries({ queryKey: credentialKey });
    } catch (e) {
      setTestResult({ ok: false, error: e instanceof Error ? e.message : 'Erro' });
    } finally {
      setIsTesting(false);
    }
  };

  const webhookUrl = `https://baxitzkbbqqbbbtojswm.supabase.co/functions/v1/pix-rapido`;

  const connectionStatus = existingCred?.connection_status;

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Woovi (OpenPix) — {scope === 'platform' ? 'Plataforma' : scope === 'partner' ? 'Parceiro' : 'Lojista'}
            </CardTitle>
            <CardDescription>Credenciais para PIX Rápido via Woovi</CardDescription>
          </div>
          {connectionStatus === 'connected' && (
            <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Conectado</Badge>
          )}
          {connectionStatus === 'error' && (
            <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>
          )}
          {(!connectionStatus || connectionStatus === 'pending') && (
            <Badge variant="secondary" className="gap-1"><WifiOff className="h-3 w-3" />Pendente</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>API Key (AppID)</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Q2xpZW50ZV9JZF8x..."
            onFocus={() => { if (apiKey.startsWith('••')) setApiKey(''); }}
          />
          <p className="text-xs text-muted-foreground">
            Encontre em: Woovi → Configurações → APIs → Criar App
          </p>
        </div>

        <div className="space-y-2">
          <Label>Webhook Secret (opcional)</Label>
          <Input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="hmac_secret..."
            onFocus={() => { if (webhookSecret.startsWith('••')) setWebhookSecret(''); }}
          />
        </div>

        {/* Webhook URL for copy */}
        <Alert>
          <AlertDescription className="space-y-2">
            <p className="font-medium text-sm">⚠️ Configure o Webhook no painel Woovi:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">{webhookUrl}</code>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast({ title: 'URL copiada!' });
              }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Envie o body como JSON com <code>action: "webhook"</code>
            </p>
          </AlertDescription>
        </Alert>

        {existingCred?.last_webhook_at && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            Último webhook: {new Date(existingCred.last_webhook_at).toLocaleString('pt-BR')}
            {existingCred.last_webhook_status && ` (${existingCred.last_webhook_status})`}
          </div>
        )}

        {testResult && (
          <Alert variant={testResult.ok ? 'default' : 'destructive'}>
            <AlertDescription className="flex items-center gap-2">
              {testResult.ok ? (
                <><CheckCircle className="h-4 w-4 text-primary" /> Conexão OK!</>
              ) : (
                <><XCircle className="h-4 w-4" /> Falha: {testResult.error}</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
          <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wifi className="h-4 w-4 mr-1" />}
            Testar Conexão
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="https://developers.woovi.com" target="_blank" rel="noopener noreferrer" className="gap-1">
              <ExternalLink className="h-3 w-3" /> Docs
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
