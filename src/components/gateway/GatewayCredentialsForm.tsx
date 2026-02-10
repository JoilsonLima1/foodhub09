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
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';
import { GatewayWebhookPanel } from './GatewayWebhookPanel';

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
      'Acesse dashboard.stripe.com e faça login.',
      'Vá em Developers → API Keys.',
      'Copie a Publishable Key (pk_live_...) e a Secret Key (sk_live_...).',
      'Para sandbox, use as chaves de teste (pk_test_, sk_test_).',
    ],
    webhookGuide: [
      'No Stripe, vá em Developers → Webhooks.',
      'Clique em "Add endpoint" e cole a URL abaixo.',
      'No campo "Signing Secret", copie o secret gerado aqui.',
      'Selecione os eventos recomendados abaixo.',
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
      'Acesse asaas.com e faça login.',
      'Vá em Configurações → Integrações → API.',
      'Gere ou copie sua API Key ($aact_prod_... para produção).',
      'Para sandbox, acesse sandbox.asaas.com e gere uma chave de teste.',
    ],
    webhookGuide: [
      'No Asaas, vá em Configurações → Integrações → Webhooks.',
      'Clique em "Adicionar" e cole a URL abaixo.',
      'No campo de autenticação, cole o secret gerado aqui.',
      'Selecione os eventos de pagamento recomendados.',
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
      { key: 'client_id', label: 'Client ID', placeholder: '' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '', secret: true },
      { key: 'stone_code', label: 'Stone Code', placeholder: '' },
      { key: 'merchant_id', label: 'Merchant ID', placeholder: '' },
    ],
    credentialGuide: [
      'Entre em contato com a equipe Stone para obter suas credenciais.',
      'Você receberá Client ID, Client Secret e Stone Code.',
      'Para sandbox, solicite credenciais do ambiente de testes.',
    ],
    webhookGuide: [
      'No painel Stone, cadastre a URL de webhook fornecida.',
      'Configure o secret de validação.',
      'Selecione os eventos de transação.',
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

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [passwordAction, setPasswordAction] = useState<'save' | 'rotate' | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing account
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

  // Fetch account profile (verified cedente data)
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['provider-account-profile', account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_provider_account_profile' as any)
        .select('*')
        .eq('provider_account_id', account!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const isConfigured = account && account.status !== 'inactive';

  const getFieldValue = (key: string) => {
    if (formValues[key] !== undefined) return formValues[key];
    const creds = account?.credentials_encrypted as Record<string, string> | null;
    return creds?.[key] || '';
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
            integration_type: provider.startsWith('stone') ? 'stone_online' : 'online',
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

  // Verify account (fetch cedente data)
  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!account?.id) throw new Error('Conta não encontrada');
      // For now, save a placeholder profile — real API verification would call the provider
      const profileData = {
        provider_account_id: account.id,
        legal_name: 'Verificação pendente (configure via API do provedor)',
        verified_at: new Date().toISOString(),
        raw_profile_json: { provider, scope_type: scopeType, verified_manually: true },
      };

      const { error } = await supabase
        .from('payment_provider_account_profile' as any)
        .upsert(profileData as any, { onConflict: 'provider_account_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-account-profile'] });
      toast({ title: 'Dados do cedente verificados!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao verificar', description: err.message, variant: 'destructive' });
    },
  });

  // Test charge
  const [testResult, setTestResult] = useState<any>(null);
  const testChargeMutation = useMutation({
    mutationFn: async () => {
      // Call edge function to create test charge
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
      {/* ===== CREDENTIALS SECTION ===== */}
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
              {/* Credential fields */}
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
                      // Editing existing — require password
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
                  {/* Show masked values */}
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

          {/* Contextual guide: how to obtain keys */}
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="credential-guide" className="border-none">
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

      {/* ===== VERIFIED ACCOUNT (CEDENTE) ===== */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conta Vinculada a esta API</CardTitle>
            <CardDescription>Dados verificados do cedente / conta do provedor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingProfile ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : profile ? (
              <>
                <div className="grid gap-2 text-sm">
                  {profile.legal_name && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Nome / Razão Social</span><span className="font-medium">{profile.legal_name}</span></div>
                  )}
                  {profile.document && (
                    <div className="flex justify-between"><span className="text-muted-foreground">CPF/CNPJ</span><span className="font-medium">{profile.document}</span></div>
                  )}
                  {profile.bank_name && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Banco</span><span className="font-medium">{profile.bank_name}</span></div>
                  )}
                  {profile.bank_agency && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Agência</span><span className="font-medium">{profile.bank_agency}</span></div>
                  )}
                  {profile.bank_account && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Conta</span><span className="font-medium">{profile.bank_account}</span></div>
                  )}
                  {profile.wallet_id && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Wallet ID</span><span className="font-medium">{profile.wallet_id}</span></div>
                  )}
                  {profile.merchant_id && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Merchant ID</span><span className="font-medium">{profile.merchant_id}</span></div>
                  )}
                  {profile.verified_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verificado em</span>
                      <Badge variant="default" className="text-xs flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {new Date(profile.verified_at).toLocaleString('pt-BR')}
                      </Badge>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <RefreshCw className="h-4 w-4 mr-2" /> Verificar Dados
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Nenhuma verificação realizada ainda.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Verificar Dados do Cedente
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== WEBHOOKS SECTION (inline, not separate tab) ===== */}
      {isConfigured && (
        <div className="space-y-2">
          <GatewayWebhookPanel
            provider={provider}
            providerAccountId={account?.id || null}
          />

          {/* Contextual guide for webhooks */}
          <Accordion type="single" collapsible>
            <AccordionItem value="webhook-guide" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-3">
                <span className="flex items-center gap-2">
                  <Webhook className="h-4 w-4" /> Como configurar o webhook no painel do {meta.label}?
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
        </div>
      )}

      {/* ===== TEST CHARGE ===== */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TestTube className="h-5 w-5" /> Testar Integração
            </CardTitle>
            <CardDescription>Crie uma cobrança de teste (R$ 5,00) para verificar a integração.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={() => testChargeMutation.mutate()}
              disabled={testChargeMutation.isPending}
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

                {testResult.boleto_url && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Boleto:</p>
                    <div className="flex items-center gap-2">
                      <Input value={testResult.boleto_url} readOnly className="text-xs font-mono" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(testResult.boleto_url)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

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
          </CardContent>
        </Card>
      )}

      {/* ===== PASSWORD CONFIRM DIALOGS ===== */}
      <PasswordConfirmDialog
        open={passwordAction === 'save'}
        onOpenChange={(v) => !v && setPasswordAction(null)}
        title="Confirmar alteração de credenciais"
        description="Digite sua senha para alterar as credenciais do gateway."
        onConfirm={() => saveMutation.mutateAsync()}
      />
    </div>
  );
}
