import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Save, Eye, EyeOff, CheckCircle2, Info, Loader2, Copy,
  RefreshCw, Key, ExternalLink, TestTube, QrCode, Webhook,
  Clock, AlertTriangle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';
import { CredentialOriginBanner } from './CredentialOriginBanner';
import { format } from 'date-fns';

// ===== Provider metadata =====

type FieldDef = { key: string; label: string; placeholder: string; secret?: boolean };

const PROVIDER_META: Record<string, {
  label: string;
  docsUrl: string;
  fields: FieldDef[];
  credentialGuide: string[];
  webhookGuide: string[];
  webhookEvents: string[];
  webhookPanelUrl: string;
}> = {
  stripe: {
    label: 'Stripe',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'publishable_key', label: 'Publishable Key', placeholder: 'pk_live_...' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
    ],
    credentialGuide: [
      'Acesse dashboard.stripe.com e faça login com sua conta.',
      'No menu lateral, clique em "Developers" (Desenvolvedores).',
      'Clique em "API Keys" (Chaves de API).',
      'Na seção "Standard keys", você verá duas chaves:',
      '  → Publishable key (pk_live_...): copie e cole no campo "Publishable Key" acima.',
      '  → Secret key (sk_live_...): clique em "Reveal live key" para ver, copie e cole no campo "Secret Key" acima.',
      'Para ambiente de TESTES, alterne o toggle "Test mode" no canto superior direito do dashboard e copie as chaves de teste (pk_test_, sk_test_).',
      'Permissões: as chaves padrão já possuem todas as permissões necessárias. Se usar "Restricted keys", marque pelo menos: Charges (Read/Write), Customers (Read/Write), Webhooks (Read/Write) e PaymentIntents (Read/Write).',
    ],
    webhookGuide: [
      'No dashboard do Stripe, vá em "Developers" → "Webhooks".',
      'Clique em "+ Add endpoint" (Adicionar endpoint).',
      'No campo "Endpoint URL", cole a URL de webhook exibida acima (copie com o botão).',
      'Em "Select events to listen to", clique em "+ Select events".',
      'Marque os eventos recomendados listados abaixo (checkout.session.completed, payment_intent.succeeded, etc.).',
      'Clique em "Add endpoint" para salvar.',
      'Após criar, clique no endpoint criado e em "Signing secret" → "Reveal" para obter o secret. Gere ou rotacione o secret nesta tela e cole no Stripe se necessário.',
      'Para testar, use a aba "Send test webhook" no Stripe para enviar um evento de teste e verifique se aparece na tabela de eventos abaixo.',
    ],
    webhookEvents: [
      'checkout.session.completed', 'payment_intent.succeeded',
      'payment_intent.payment_failed', 'charge.refunded', 'invoice.paid',
    ],
    webhookPanelUrl: 'https://dashboard.stripe.com/webhooks',
  },
  asaas: {
    label: 'Asaas',
    docsUrl: 'https://www.asaas.com/configuracoes/integracao',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '$aact_prod_...', secret: true },
      { key: 'wallet_id', label: 'Wallet ID (opcional)', placeholder: '' },
    ],
    credentialGuide: [
      'Acesse asaas.com e faça login na sua conta.',
      'No menu lateral esquerdo, clique em "Integrações" (ou vá em Configurações → Integrações).',
      'Na aba "API", você verá sua chave de API.',
      'Se não houver uma chave, clique em "Gerar nova chave".',
      'Copie a chave gerada (começa com $aact_prod_ para produção) e cole no campo "API Key" acima.',
      'Para ambiente de TESTES: acesse sandbox.asaas.com, crie uma conta separada e gere uma chave de API Sandbox.',
      'O sistema detecta automaticamente se é Produção ou Sandbox pelo prefixo da chave ($aact_prod_ = Produção).',
      'Wallet ID é opcional — preencha apenas se sua conta Asaas possui múltiplas carteiras.',
    ],
    webhookGuide: [
      'No painel do Asaas, vá em "Integrações" → aba "Webhooks".',
      'Clique em "Adicionar webhook" (ou "Nova configuração").',
      'No campo "URL", cole a URL de webhook exibida acima.',
      'Em "Autenticação", selecione "Access Token" e cole o secret gerado nesta tela.',
      'Na seção "Eventos", marque os eventos recomendados listados abaixo (PAYMENT_CONFIRMED, PAYMENT_RECEIVED, etc.).',
      'Em "Versão da API", selecione a versão mais recente (v3).',
      'Clique em "Salvar" para ativar o webhook.',
      'Para testar: crie uma cobrança de teste no Asaas e verifique se o evento aparece na tabela abaixo.',
      'Dica: no Sandbox (sandbox.asaas.com), você pode simular pagamentos de cobranças para gerar eventos de webhook automaticamente.',
    ],
    webhookEvents: [
      'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE',
      'PAYMENT_REFUNDED', 'PAYMENT_DELETED', 'PAYMENT_CREATED',
    ],
    webhookPanelUrl: 'https://www.asaas.com/configuracoes/integracao',
  },
  stone: {
    label: 'Stone',
    docsUrl: 'https://docs.openfinance.stone.com.br/',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'Seu Client ID OAuth' },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'Seu Client Secret', secret: true },
      { key: 'stone_code', label: 'Stone Code', placeholder: 'Ex: 123456789' },
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'ID do merchant (se aplicável)' },
    ],
    credentialGuide: [
      'Para obter credenciais da Stone, siga estes passos:',
      '1. Acesse o Portal do Parceiro Stone (portal.stone.com.br) ou entre em contato com seu gerente de conta Stone.',
      '2. Solicite acesso à API Stone OpenFinance informando que deseja integrar via API.',
      '3. Após aprovação, você receberá por e-mail:',
      '   → Client ID: identificador da sua aplicação OAuth.',
      '   → Client Secret: chave secreta para autenticação OAuth2.',
      '   → Stone Code: código numérico que identifica seu estabelecimento na Stone.',
      '4. Para ambiente de TESTES (Sandbox): solicite ao seu gerente credenciais separadas do ambiente de homologação.',
      '5. O Merchant ID é necessário apenas para integrações do tipo Connect/Marketplace — preencha se aplicável.',
      '6. Dica: a Stone utiliza autenticação OAuth2. O sistema gerencia tokens automaticamente após salvar as credenciais.',
      '7. Se tiver dúvidas, consulte a documentação: docs.openfinance.stone.com.br ou ligue para o suporte Stone.',
    ],
    webhookGuide: [
      'Para configurar webhooks na Stone, siga estes passos:',
      '1. Acesse o Portal do Parceiro Stone (portal.stone.com.br) ou o painel de desenvolvedores.',
      '2. Navegue até a seção "Webhooks" ou "Notificações".',
      '3. Clique em "Adicionar webhook" ou "Novo endpoint".',
      '4. No campo "URL de callback", cole a URL de webhook exibida acima.',
      '5. No campo "Secret/Token de validação", cole o secret gerado nesta tela.',
      '6. Selecione os eventos recomendados listados abaixo.',
      '7. Salve a configuração.',
      '8. Para testar: solicite ao seu gerente Stone a realização de uma transação de teste no Sandbox.',
      '9. Verifique se o evento aparece na tabela de eventos abaixo.',
      'Dica: caso não encontre a seção de webhooks, entre em contato com o suporte Stone para solicitar a habilitação de notificações via webhook na sua conta.',
    ],
    webhookEvents: [
      'PAYMENT_CREATED', 'PAYMENT_CONFIRMED', 'PAYMENT_CANCELED', 'PAYMENT_REFUNDED',
    ],
    webhookPanelUrl: 'https://docs.openfinance.stone.com.br/',
  },
};

const WEBHOOK_URLS: Record<string, string> = {
  stripe: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`,
  asaas: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`,
  stone: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stone-webhook`,
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  ok: CheckCircle2,
  pending: Clock,
  retry: RefreshCw,
  failed: Info,
};

// ===== Component =====

interface GatewayCredentialsFormProps {
  provider: 'stripe' | 'asaas' | 'stone';
  scopeType: 'platform' | 'partner' | 'tenant';
  scopeId?: string | null;
}

export function GatewayCredentialsForm({ provider, scopeType, scopeId }: GatewayCredentialsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meta = PROVIDER_META[provider];
  const webhookUrl = WEBHOOK_URLS[provider] || '';

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [passwordAction, setPasswordAction] = useState<'save' | 'rotate' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Fetch existing account (exact scope match)
  const { data: account, isLoading } = useQuery({
    queryKey: ['provider-account', provider, scopeType, scopeId],
    queryFn: async () => {
      let query = supabase
        .from('payment_provider_accounts')
        .select('*')
        .eq('provider', provider)
        .eq('scope_type', scopeType);

      if (scopeId) {
        query = query.eq('scope_id', scopeId);
      } else {
        query = query.is('scope_id', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch legacy payment_gateways as fallback (when no provider_account exists)
  const { data: legacyGateway } = useQuery({
    queryKey: ['legacy-gateway-fallback', provider],
    enabled: !account && !isLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('provider', provider)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch account profile (verified cedente data) — by provider_account_id or composite key
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['provider-account-profile', provider, scopeType, scopeId, account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      // Primary: by provider_account_id
      const { data, error } = await supabase
        .from('payment_provider_account_profile' as any)
        .select('*')
        .eq('provider_account_id', account!.id)
        .maybeSingle();
      if (error) {
        console.warn('[profile-query] Error:', error.message);
        throw error;
      }
      return data as any;
    },
  });

  // Fetch webhook config
  const { data: webhookConfig } = useQuery({
    queryKey: ['gateway-webhook-config', account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_provider_webhooks')
        .select('*')
        .eq('provider_account_id', account!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent events
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['gateway-webhook-events', account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_provider_events')
        .select('*')
        .eq('provider_account_id', account!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const hasLegacyKey = !account && legacyGateway?.api_key_masked && legacyGateway.api_key_masked.length > 10;
  const isConfigured = (account && account.status !== 'inactive') || hasLegacyKey;

  const getFieldValue = (key: string) => {
    if (formValues[key] !== undefined) return formValues[key];
    const creds = account?.credentials_encrypted as Record<string, string> | null;
    if (creds?.[key]) return creds[key];
    // Fallback to legacy payment_gateways
    if (!account && legacyGateway?.api_key_masked) {
      if ((provider === 'asaas' && key === 'api_key') ||
          (provider === 'stripe' && key === 'secret_key')) {
        return legacyGateway.api_key_masked;
      }
    }
    return '';
  };

  const hasCreds = meta.fields.some(f => {
    const v = getFieldValue(f.key);
    return v && v.length > 5;
  });

  // Save credentials
  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingCreds = (account?.credentials_encrypted as Record<string, string>) || {};
      const merged = { ...existingCreds, ...formValues };

      if (account) {
        const { error } = await supabase
          .from('payment_provider_accounts')
          .update({
            credentials_encrypted: merged as any,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_provider_accounts')
          .insert({
            provider,
            scope_type: scopeType,
            scope_id: scopeId || null,
            integration_type: provider === 'stone' ? 'stone_online' : 'online',
            credentials_encrypted: merged as any,
            status: 'active',
            environment: 'production',
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-account'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-provider-accounts'] });
      setIsEditing(false);
      setFormValues({});
      toast({ title: 'Credenciais salvas com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    },
  });

  // Generate/rotate webhook secret
  const generateSecret = useMutation({
    mutationFn: async () => {
      const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
      const secretHash = `${secret.slice(0, 8)}...${secret.slice(-4)}`;

      if (!account?.id) throw new Error('Salve as credenciais primeiro.');

      if (webhookConfig) {
        const { error } = await supabase
          .from('payment_provider_webhooks')
          .update({
            webhook_secret_hash: secretHash,
            webhook_url: webhookUrl,
            enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', webhookConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_provider_webhooks')
          .insert({
            provider_account_id: account.id,
            webhook_secret_hash: secretHash,
            webhook_url: webhookUrl,
            enabled: true,
          });
        if (error) throw error;
      }

      return secret;
    },
    onSuccess: (secret) => {
      queryClient.invalidateQueries({ queryKey: ['gateway-webhook-config'] });
      toast({
        title: 'Webhook Secret gerado!',
        description: `Copie agora: ${secret}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao gerar secret', description: err.message, variant: 'destructive' });
    },
  });

  // Verify account (fetch real cedente data from provider API via edge function)
  const [verifyError, setVerifyError] = useState<{ message: string; details?: string } | null>(null);
  const verifyMutation = useMutation({
    mutationFn: async () => {
      setVerifyError(null);
      console.log(`[verify-account] Calling edge function: provider=${provider}, scope=${scopeType}/${scopeId}, env=${account?.environment || 'production'}`);
      
      const { data, error } = await supabase.functions.invoke('gateway-verify-account', {
        body: {
          provider,
          scope_type: scopeType,
          scope_id: scopeId || null,
          environment: account?.environment || 'production',
        },
      });

      if (error) {
        console.error('[verify-account] Invoke error:', error);
        const msg = error.message || String(error);
        // Try to extract JSON body from FunctionsHttpError
        if (error.context?.body) {
          try {
            const body = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
            if (body?.error) throw new Error(body.error);
          } catch (_) { /* fall through */ }
        }
        if (msg.includes('Failed to send') || msg.includes('FunctionsFetchError')) {
          throw new Error('Não foi possível acessar a função de verificação. Verifique sua conexão ou tente novamente.');
        }
        if (msg.includes('non-2xx')) {
          throw new Error('Erro ao verificar conta. A função retornou um erro — verifique se as credenciais estão corretas.');
        }
        throw new Error(msg);
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido ao verificar conta');
      }
      
      console.log('[verify-account] Success:', data.profile);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-account-profile'] });
      toast({
        title: 'Dados do cedente verificados!',
        description: data.profile?.legal_name ? `Conta: ${data.profile.legal_name}` : undefined,
      });
    },
    onError: (err: any) => {
      console.error('[verify-account] Error:', err);
      setVerifyError({
        message: err.message || 'Erro desconhecido',
        details: `Função: gateway-verify-account | Provider: ${provider} | Scope: ${scopeType}/${scopeId || 'null'} | ${new Date().toISOString()}`,
      });
      toast({ title: 'Erro ao verificar conta', description: err.message, variant: 'destructive' });
    },
  });

  // Reprocess event
  const reprocessEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('payment_provider_events')
        .update({
          process_status: 'pending',
          retry_count: 0,
          error_message: null,
          processed_at: null,
        })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-webhook-events'] });
      toast({ title: 'Evento marcado para reprocessamento' });
    },
  });

  // Test charge
  const [testResult, setTestResult] = useState<any>(null);
  const testChargeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gateway-test-charge', {
        body: { provider, provider_account_id: account?.id, amount: 500 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast({ title: 'Cobrança de teste criada!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro no teste', description: err.message, variant: 'destructive' });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  if (!meta) return <p className="text-muted-foreground">Provedor não suportado.</p>;

  return (
    <div className="space-y-6">
      {/* ===== 0. CREDENTIAL ORIGIN BANNER (Super Admin) ===== */}
      {scopeType === 'platform' && (
        <CredentialOriginBanner
          provider={provider}
          scopeType={scopeType}
          scopeId={scopeId}
          onPromoted={() => {
            queryClient.invalidateQueries({ queryKey: ['provider-account', provider, scopeType, scopeId] });
            queryClient.invalidateQueries({ queryKey: ['legacy-gateway-fallback', provider] });
          }}
        />
      )}

      {/* ===== 1. CREDENTIALS SECTION ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Credenciais — {meta.label}</CardTitle>
              <CardDescription>
                {isConfigured
                  ? 'Credenciais configuradas. Clique em "Editar" para alterar.'
                  : `Insira suas credenciais do ${meta.label} para habilitar pagamentos.`}
              </CardDescription>
            </div>
            {isConfigured && !isEditing && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              {(!isConfigured || isEditing) ? (
                <>
                  {meta.fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label>{field.label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={field.secret && !showFields[field.key] ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={getFieldValue(field.key)}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                        />
                        {field.secret && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setShowFields((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                            }
                          >
                            {showFields[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    {isConfigured ? (
                      <Button
                        onClick={() => setPasswordAction('save')}
                        disabled={saveMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </Button>
                    ) : (
                      <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || !hasCreds}
                      >
                        {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Credenciais
                      </Button>
                    )}
                    {isEditing && (
                      <Button variant="outline" onClick={() => { setIsEditing(false); setFormValues({}); }}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {meta.fields.map((field) => {
                    const val = getFieldValue(field.key);
                    return (
                      <div key={field.key} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <span className="text-sm font-medium">{field.label}</span>
                          <p className="text-xs text-muted-foreground font-mono">
                            {val ? `${val.slice(0, 8)}${'•'.repeat(Math.max(0, val.length - 12))}${val.slice(-4)}` : 'Não definido'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Editar Credenciais
                  </Button>
                </>
              )}
            </>
          )}

          {/* Inline guide: how to obtain keys */}
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="credential-guide" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" /> Como obter esta chave?
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-2">
                  {meta.credentialGuide.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <a
                  href={meta.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  Abrir painel do {meta.label} <ExternalLink className="h-3 w-3" />
                </a>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===== 2. VERIFIED ACCOUNT (CEDENTE) — RIGHT AFTER CREDENTIALS ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Conta Vinculada — Dados do Cedente</CardTitle>
              <CardDescription>Dados verificados da conta do provedor associada a estas credenciais.</CardDescription>
            </div>
            {profile?.verified_at && (
              <Badge
                variant={profile.verified_level === 'full' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {profile.verified_level === 'full' ? (
                  <><CheckCircle2 className="h-3 w-3" /> Verificado</>
                ) : profile.verified_level === 'partial' && profile.missing_fields?.length === 0 ? (
                  <><CheckCircle2 className="h-3 w-3" /> Verificação concluída (dados parciais)</>
                ) : (
                  <><AlertTriangle className="h-3 w-3" /> Verificação parcial</>
                )}
              </Badge>
            )}
            {!profile?.verified_at && isConfigured && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Verificação pendente
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isConfigured ? (
            <p className="text-sm text-muted-foreground">Salve as credenciais acima para verificar os dados do cedente.</p>
          ) : loadingProfile ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome / Razão Social</span>
                  <span className="font-medium">{profile?.legal_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPF/CNPJ</span>
                  <span className="font-medium">{profile?.document || (provider === 'stripe' ? 'Não disponível via API' : '—')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Banco</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{profile?.bank_name || (provider === 'stripe' ? 'Não disponível via API' : '—')}</span>
                    {provider === 'asaas' && profile?.bank_name && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">padrão</Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Agência</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{profile?.bank_agency || (provider === 'stripe' ? 'Não disponível via API' : '—')}</span>
                    {provider === 'asaas' && profile?.bank_agency && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">padrão</Badge>
                    )}
                  </div>
                </div>
                {provider !== 'asaas' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conta</span>
                    <span className="font-medium font-mono">{profile?.bank_account || (provider === 'stripe' ? 'Não disponível via API' : '—')}</span>
                  </div>
                )}
                {provider === 'asaas' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conta (Bancária)</span>
                    <span className="font-medium font-mono">{profile?.account_number || '—'}</span>
                  </div>
                )}
                {profile?.merchant_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{provider === 'stripe' ? 'Stripe Account ID' : 'Merchant ID'}</span>
                    <span className="font-medium font-mono text-xs">{profile.merchant_id}</span>
                  </div>
                )}
                {profile?.wallet_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet ID</span>
                    <span className="font-medium font-mono text-xs">{profile.wallet_id}</span>
                  </div>
                )}
                {profile?.verified_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verificado em</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(profile.verified_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Platform defaults explanation for Asaas */}
              {provider === 'asaas' && profile?.verified_at && (
                <Alert className="bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Banco e agência seguem padrão da plataforma. "Conta (Bancária)" é o número da conta do titular.
                  </AlertDescription>
                </Alert>
              )}

              {/* Stripe explanation */}
              {provider === 'stripe' && profile?.verified_at && (
                <Alert className="bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Dados bancários e CPF/CNPJ não são expostos pela API do Stripe. Apenas nome, país e status da conta estão disponíveis.
                  </AlertDescription>
                </Alert>
              )}

              {/* Asaas partial: missing beneficiary code */}
              {provider === 'asaas' && profile?.verified_level === 'partial' && !profile?.bank_account && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Código do beneficiário não encontrado. Clique em "Reverificar Dados" para tentar novamente, ou gere ao menos uma cobrança no Asaas antes de reverificar.
                  </AlertDescription>
                </Alert>
              )}

              {/* Generic partial verification for non-Asaas providers */}
              {provider !== 'asaas' && profile?.verified_level === 'partial' && profile.missing_fields?.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Verificação parcial — alguns dados não estão disponíveis via API do provedor: {(profile.missing_fields as string[]).map((f: string) => {
                      const labels: Record<string, string> = { bank_agency: 'Agência', bank_account: 'Conta', bank_name: 'Banco', legal_name: 'Nome', document: 'CPF/CNPJ' };
                      return labels[f] || f;
                    }).join(', ')}.
                  </AlertDescription>
                </Alert>
              )}

              {!profile?.verified_at && (
                <p className="text-xs text-muted-foreground">
                  Ainda não verificado — clique abaixo para consultar via API do provedor.
                </p>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending || !isConfigured}
              >
                {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {profile?.verified_at ? (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Reverificar Dados</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Verificar Dados do Cedente</>
                )}
              </Button>

              {verifyError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertDescription className="space-y-1">
                    <p className="text-sm">{verifyError.message}</p>
                    <details className="text-xs font-mono text-muted-foreground cursor-pointer">
                      <summary>Detalhes técnicos</summary>
                      <p className="mt-1">{verifyError.details}</p>
                    </details>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== 3. WEBHOOK SECTION ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-5 w-5" /> Webhook
          </CardTitle>
          <CardDescription>Configure a URL e o secret no painel do {meta.label} para receber eventos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URL */}
          <div className="space-y-1">
            <Label>URL do Webhook (copie para o painel do provedor)</Label>
            <div className="flex items-center gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-2">
            <Label>Webhook Secret</Label>
            {webhookConfig?.webhook_secret_hash ? (
              <div className="flex items-center gap-2">
                <Input
                  value={showSecret ? (webhookConfig.webhook_secret_hash || '') : '••••••••••••••••'}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookConfig.webhook_secret_hash || '')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isConfigured
                  ? 'Nenhum secret configurado. Clique em "Gerar Secret" abaixo.'
                  : 'Salve as credenciais primeiro para poder gerar o secret do webhook.'}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (webhookConfig?.webhook_secret_hash) {
                    setPasswordAction('rotate');
                  } else {
                    generateSecret.mutate();
                  }
                }}
                disabled={generateSecret.isPending || !account?.id}
              >
                {generateSecret.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {webhookConfig?.webhook_secret_hash ? 'Rotacionar Secret' : 'Gerar Secret'}
              </Button>

              {webhookConfig?.enabled !== undefined && (
                <Badge variant={webhookConfig.enabled ? 'default' : 'secondary'}>
                  {webhookConfig.enabled ? 'Habilitado' : 'Desabilitado'}
                </Badge>
              )}
            </div>

            {webhookConfig?.last_received_at && (
              <p className="text-xs text-muted-foreground">
                Último evento: {format(new Date(webhookConfig.last_received_at), 'dd/MM/yyyy HH:mm:ss')}
              </p>
            )}
            {webhookConfig && (
              <p className="text-xs text-muted-foreground">
                Total recebidos: {webhookConfig.total_received} · Falhas: {webhookConfig.total_failed}
              </p>
            )}
          </div>

          {/* Recent events mini-table */}
          {events && events.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">Últimos eventos recebidos</p>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 font-medium">Tipo</th>
                      <th className="text-left py-1 font-medium">Status</th>
                      <th className="text-left py-1 font-medium">Data</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(event => {
                      const StatusIcon = STATUS_ICONS[event.process_status] || Clock;
                      return (
                        <tr key={event.id} className="border-b last:border-0">
                          <td className="py-1 font-mono">{event.event_type}</td>
                          <td className="py-1">
                            <Badge
                              variant={event.process_status === 'ok' ? 'default' : event.process_status === 'failed' ? 'destructive' : 'secondary'}
                              className="text-[10px] px-1 py-0"
                            >
                              <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                              {event.process_status}
                            </Badge>
                          </td>
                          <td className="py-1">{format(new Date(event.created_at), 'dd/MM HH:mm')}</td>
                          <td className="py-1">
                            {(event.process_status === 'failed' || event.process_status === 'retry') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-[10px]"
                                onClick={() => reprocessEvent.mutate(event.id)}
                                disabled={reprocessEvent.isPending}
                              >
                                <RefreshCw className="h-2.5 w-2.5 mr-0.5" /> Reprocessar
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inline guide for webhook */}
          <Accordion type="single" collapsible>
            <AccordionItem value="webhook-guide" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-3">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" /> Como configurar o webhook no painel do {meta.label}?
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-2">
                  {meta.webhookGuide.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <div>
                  <p className="text-xs font-medium mb-1">Eventos recomendados:</p>
                  <div className="flex flex-wrap gap-1">
                    {meta.webhookEvents.map((ev) => (
                      <Badge key={ev} variant="outline" className="font-mono text-xs">{ev}</Badge>
                    ))}
                  </div>
                </div>
                <a
                  href={meta.webhookPanelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  Abrir painel do {meta.label} <ExternalLink className="h-3 w-3" />
                </a>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Rotate secret warning */}
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertDescription className="text-xs text-muted-foreground">
              <strong>Atenção ao rotacionar o secret:</strong> você terá que atualizar o webhook no painel do provedor, senão os eventos vão falhar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* ===== 4. TEST CHARGE ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TestTube className="h-5 w-5" /> Testar Integração
          </CardTitle>
          <CardDescription>
            {isConfigured
              ? 'Crie uma cobrança de teste (R$ 5,00) para verificar a integração.'
              : 'Salve as credenciais acima para poder testar a integração.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={() => testChargeMutation.mutate()}
            disabled={testChargeMutation.isPending || !isConfigured}
          >
            {testChargeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <TestTube className="h-4 w-4 mr-2" />
            Criar Cobrança Teste (R$ 5,00)
          </Button>

          {testResult && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant={testResult.status === 'success' ? 'default' : 'destructive'}>
                  {testResult.status === 'success' ? 'Sucesso' : 'Erro'}
                </Badge>
                {testResult.charge_id && (
                  <span className="text-xs font-mono text-muted-foreground">ID: {testResult.charge_id}</span>
                )}
              </div>

              {testResult.pix_qrcode && (
                <div className="space-y-1">
                  <p className="text-sm font-medium flex items-center gap-1"><QrCode className="h-4 w-4" /> PIX QR Code:</p>
                  {testResult.pix_qrcode_image && (
                    <img src={testResult.pix_qrcode_image} alt="QR Code PIX" className="h-32 w-32 border rounded" />
                  )}
                  <div className="flex items-center gap-2">
                    <Input value={testResult.pix_qrcode} readOnly className="text-xs font-mono" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(testResult.pix_qrcode)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {testResult.error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{testResult.error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Accordion type="single" collapsible>
            <AccordionItem value="test-guide" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" /> Como testar a integração?
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-2">
                  {provider === 'stripe' && (
                    <>
                      <li>Use chaves de teste (pk_test_, sk_test_) para não gerar cobranças reais.</li>
                      <li>Clique em "Criar Cobrança Teste" acima.</li>
                      <li>Use o cartão de teste: 4242 4242 4242 4242, qualquer data futura e CVC.</li>
                      <li>Verifique se o evento aparece na tabela de webhook acima.</li>
                    </>
                  )}
                  {provider === 'asaas' && (
                    <>
                      <li>Use uma chave de API Sandbox (sandbox.asaas.com) para testes.</li>
                      <li>Clique em "Criar Cobrança Teste" para gerar uma cobrança PIX de R$ 5,00.</li>
                      <li>No Sandbox do Asaas, simule o pagamento da cobrança.</li>
                      <li>Verifique se o evento PAYMENT_CONFIRMED aparece na tabela acima.</li>
                    </>
                  )}
                  {provider === 'stone' && (
                    <>
                      <li>Solicite ao seu gerente Stone credenciais do ambiente Sandbox.</li>
                      <li>Clique em "Criar Cobrança Teste" para simular uma transação.</li>
                      <li>No ambiente de homologação da Stone, confirme a transação.</li>
                      <li>Verifique se o evento aparece na tabela de webhook acima.</li>
                    </>
                  )}
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===== PASSWORD CONFIRM DIALOGS ===== */}
      <PasswordConfirmDialog
        open={passwordAction === 'save'}
        onOpenChange={(v) => !v && setPasswordAction(null)}
        title="Confirmar alteração de credenciais"
        description="Digite sua senha para alterar as credenciais do gateway."
        onConfirm={() => saveMutation.mutateAsync()}
      />
      <PasswordConfirmDialog
        open={passwordAction === 'rotate'}
        onOpenChange={(v) => !v && setPasswordAction(null)}
        title="Rotacionar Webhook Secret"
        description="Isso invalidará o secret atual. Configure o novo secret no painel do provedor."
        warning="O secret atual deixará de funcionar imediatamente."
        onConfirm={async () => { await generateSecret.mutateAsync(); }}
      />
    </div>
  );
}
