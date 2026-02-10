import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoneProviderAccounts } from '@/hooks/useStoneProviderAccounts';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, CheckCircle2, Copy, Info, Loader2, Plug } from 'lucide-react';

const STEPS = ['Tipo de Integração', 'Ambiente', 'Credenciais', 'Webhook', 'Configurações', 'Confirmar'];

const INTEGRATION_OPTIONS = [
  { value: 'stone_online', label: 'Stone Online', desc: 'Pagamentos online (cartão, PIX, boleto)' },
  { value: 'stone_connect', label: 'Stone Connect / 2.0', desc: 'Integração POS/maquininha' },
  { value: 'stone_tef', label: 'Stone TEF', desc: 'Integração PDV/Desktop' },
  { value: 'stone_openbank', label: 'Stone OpenBank', desc: 'Boletos, transferências, extrato' },
];

const CREDENTIAL_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  stone_online: [
    { key: 'stone_code', label: 'Stone Code', placeholder: 'Seu Stone Code' },
    { key: 'api_key', label: 'API Key', placeholder: 'Chave de API Stone' },
    { key: 'merchant_id', label: 'Merchant ID', placeholder: 'ID do lojista' },
  ],
  stone_connect: [
    { key: 'stone_code', label: 'Stone Code', placeholder: 'Seu Stone Code' },
    { key: 'cli_key', label: 'CLI Key', placeholder: 'Chave CLI Connect' },
  ],
  stone_tef: [
    { key: 'stone_code', label: 'Stone Code', placeholder: 'Seu Stone Code' },
    { key: 'tef_ip', label: 'IP do servidor TEF', placeholder: '192.168.1.100' },
    { key: 'tef_port', label: 'Porta', placeholder: '3000' },
  ],
  stone_openbank: [
    { key: 'client_id', label: 'Client ID', placeholder: 'Client ID OpenBank' },
    { key: 'client_secret', label: 'Client Secret', placeholder: 'Client Secret' },
    { key: 'account_id', label: 'Account ID', placeholder: 'ID da conta bancária' },
  ],
};

const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stone-webhook`;

interface Props {
  tenantId: string | null;
}

export function StoneOnboardingWizard({ tenantId }: Props) {
  const { createAccount, testConnection } = useStoneProviderAccounts({ scope_type: 'tenant', scope_id: tenantId || undefined });
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    integration_type: '' as string,
    environment: 'sandbox' as 'sandbox' | 'production',
    credentials: {} as Record<string, string>,
    auto_capture: true,
    allow_partial_refund: true,
    payment_timeout_seconds: 300,
    display_name: '',
  });

  const fields = CREDENTIAL_FIELDS[form.integration_type] || [];

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: 'URL do webhook copiada!' });
  };

  const handleCreate = () => {
    if (!tenantId) return toast({ title: 'Erro', description: 'Tenant não identificado', variant: 'destructive' });
    createAccount.mutate({
      scope_type: 'tenant',
      scope_id: tenantId,
      environment: form.environment,
      integration_type: form.integration_type as any,
      credentials_encrypted: form.credentials,
      display_name: form.display_name || `Stone ${INTEGRATION_OPTIONS.find(o => o.value === form.integration_type)?.label}`,
      auto_capture: form.auto_capture,
      allow_partial_refund: form.allow_partial_refund,
      payment_timeout_seconds: form.payment_timeout_seconds,
    }, {
      onSuccess: () => setStep(STEPS.length),
    });
  };

  if (step >= STEPS.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Integração Stone Configurada!</h3>
          <p className="text-muted-foreground mb-4">Sua conta Stone foi criada com sucesso. Use a aba "Status & Logs" para monitorar.</p>
          <Button onClick={() => setStep(0)} variant="outline">Configurar Outra</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistente de Configuração Stone</CardTitle>
        <CardDescription>
          Passo {step + 1} de {STEPS.length}: {STEPS[step]}
        </CardDescription>
        <div className="flex gap-1 mt-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 0: Integration Type */}
        {step === 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {INTEGRATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm(f => ({ ...f, integration_type: opt.value }))}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${form.integration_type === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <h4 className="font-semibold">{opt.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Environment */}
        {step === 1 && (
          <div className="grid gap-3 md:grid-cols-2">
            {(['sandbox', 'production'] as const).map(env => (
              <button
                key={env}
                onClick={() => setForm(f => ({ ...f, environment: env }))}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${form.environment === env ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <h4 className="font-semibold capitalize">{env === 'sandbox' ? '🧪 Sandbox (Testes)' : '🚀 Produção'}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {env === 'sandbox' ? 'Ideal para testar antes de ir ao vivo.' : 'Para processar pagamentos reais.'}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Credentials */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Integração</Label>
              <Input
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Ex: Stone Loja Principal"
              />
            </div>
            {fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type="password"
                  value={form.credentials[field.key] || ''}
                  onChange={e => setForm(f => ({
                    ...f,
                    credentials: { ...f.credentials, [field.key]: e.target.value },
                  }))}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                As credenciais serão armazenadas de forma criptografada no banco de dados. Nunca serão exibidas em texto claro.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 3: Webhook */}
        {step === 3 && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Configure o webhook no painel Stone:</p>
                <div className="flex items-center gap-2 mt-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={copyWebhookUrl}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs mt-3 text-muted-foreground">
                  Eventos recomendados: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_CANCELED, PAYMENT_REFUNDED, CHARGEBACK_CREATED
                </p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 4: Config */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Captura automática</Label>
                <p className="text-xs text-muted-foreground">Capturar pagamentos automaticamente após autorização.</p>
              </div>
              <Switch checked={form.auto_capture} onCheckedChange={v => setForm(f => ({ ...f, auto_capture: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Permitir estorno parcial</Label>
                <p className="text-xs text-muted-foreground">Permitir estornos de parte do valor.</p>
              </div>
              <Switch checked={form.allow_partial_refund} onCheckedChange={v => setForm(f => ({ ...f, allow_partial_refund: v }))} />
            </div>
            <div className="space-y-2">
              <Label>Timeout de pagamento (segundos)</Label>
              <Input
                type="number"
                value={form.payment_timeout_seconds}
                onChange={e => setForm(f => ({ ...f, payment_timeout_seconds: parseInt(e.target.value) || 300 }))}
                className="w-32"
              />
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            <h4 className="font-semibold">Resumo da Configuração</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Tipo:</span>
              <span>{INTEGRATION_OPTIONS.find(o => o.value === form.integration_type)?.label}</span>
              <span className="text-muted-foreground">Ambiente:</span>
              <Badge variant={form.environment === 'production' ? 'default' : 'outline'} className="w-fit capitalize">{form.environment}</Badge>
              <span className="text-muted-foreground">Nome:</span>
              <span>{form.display_name || '—'}</span>
              <span className="text-muted-foreground">Captura auto:</span>
              <span>{form.auto_capture ? 'Sim' : 'Não'}</span>
              <span className="text-muted-foreground">Estorno parcial:</span>
              <span>{form.allow_partial_refund ? 'Sim' : 'Não'}</span>
              <span className="text-muted-foreground">Timeout:</span>
              <span>{form.payment_timeout_seconds}s</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.integration_type}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={createAccount.isPending}>
              {createAccount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Plug className="h-4 w-4 mr-2" />
              Criar Integração
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
