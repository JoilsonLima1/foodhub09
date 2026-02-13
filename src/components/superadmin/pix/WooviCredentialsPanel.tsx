import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Wifi, WifiOff, Save, Zap, Copy, ExternalLink, Search, Building2, User, Mail, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
  scope: 'platform' | 'partner' | 'tenant';
  scopeId?: string;
  pspProviderId: string;
}

interface WooviAccountInfo {
  legal_name: string | null;
  document: string | null;
  email: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  pix_key: string | null;
  wallet_id: string | null;
}

export function WooviCredentialsPanel({ scope, scopeId, pspProviderId }: Props) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [accountInfo, setAccountInfo] = useState<WooviAccountInfo | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

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

  const handleVerifyAccount = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    setAccountInfo(null);
    try {
      const { data, error } = await supabase.functions.invoke('gateway-verify-account', {
        body: {
          provider: 'woovi',
          scope_type: scope,
          scope_id: scopeId || null,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao consultar conta');

      const profile = data.profile;
      setAccountInfo({
        legal_name: profile?.legal_name || null,
        document: profile?.document || null,
        email: profile?.email || null,
        bank_name: profile?.bank_name || null,
        bank_agency: profile?.bank_agency || null,
        bank_account: profile?.bank_account || null,
        pix_key: profile?.pix_key || null,
        wallet_id: profile?.wallet_id || null,
      });
      toast({ title: 'Dados da conta obtidos com sucesso' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setVerifyError(msg);
      toast({ title: 'Erro ao consultar', description: msg, variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const webhookUrl = `https://baxitzkbbqqbbbtojswm.supabase.co/functions/v1/pix-rapido`;
  const connectionStatus = existingCred?.connection_status;
  const hasCredential = !!(existingCred?.api_key_encrypted);

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

        {/* Account Info Section - like Asaas */}
        {hasCredential && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Dados da Conta</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyAccount}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                Consultar
              </Button>
            </div>

            {verifyError && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {verifyError}
                </AlertDescription>
              </Alert>
            )}

            {accountInfo && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {accountInfo.legal_name && (
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Nome / Razão Social</p>
                        <p className="text-sm font-medium">{accountInfo.legal_name}</p>
                      </div>
                    </div>
                  )}

                  {accountInfo.document && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">CPF / CNPJ</p>
                        <p className="text-sm font-medium">{accountInfo.document}</p>
                      </div>
                    </div>
                  )}

                  {accountInfo.email && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">E-mail</p>
                        <p className="text-sm font-medium">{accountInfo.email}</p>
                      </div>
                    </div>
                  )}

                  {accountInfo.bank_name && (
                    <div className="flex items-start gap-2">
                      <Landmark className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Banco</p>
                        <p className="text-sm font-medium">{accountInfo.bank_name}</p>
                      </div>
                    </div>
                  )}

                  {accountInfo.bank_agency && (
                    <div className="flex items-start gap-2">
                      <Landmark className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Agência</p>
                        <p className="text-sm font-medium">{accountInfo.bank_agency}</p>
                      </div>
                    </div>
                  )}

                  {accountInfo.bank_account && (
                    <div className="flex items-start gap-2">
                      <Landmark className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Conta</p>
                        <p className="text-sm font-medium">{accountInfo.bank_account}</p>
                      </div>
                    </div>
                  )}
                </div>

                {!accountInfo.legal_name && !accountInfo.document && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nenhum dado retornado pela API. Verifique se a chave tem permissões adequadas.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

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
