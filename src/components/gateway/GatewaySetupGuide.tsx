import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, ExternalLink } from 'lucide-react';

type StepItem = {
  label: string;
  description: string;
};

type WebhookEvent = string;

type ProviderGuide = {
  label: string;
  docsUrl: string;
  sandbox: {
    steps: StepItem[];
    fields: { name: string; description: string }[];
    webhookEvents: WebhookEvent[];
  };
  production: {
    steps: StepItem[];
    fields: { name: string; description: string }[];
    webhookEvents: WebhookEvent[];
  };
};

const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  stripe: {
    label: 'Stripe',
    docsUrl: 'https://docs.stripe.com/',
    sandbox: {
      steps: [
        { label: 'Criar conta no Stripe', description: 'Acesse stripe.com e crie uma conta gratuita.' },
        { label: 'Ativar modo Teste', description: 'No dashboard do Stripe, alterne para "Test mode" no canto superior.' },
        { label: 'Obter chaves de teste', description: 'Em Developers → API Keys, copie a Publishable Key e Secret Key de teste.' },
        { label: 'Configurar Webhook de teste', description: 'Em Developers → Webhooks, adicione a URL de webhook fornecida abaixo.' },
        { label: 'Marcar eventos do webhook', description: 'Selecione os eventos recomendados listados abaixo.' },
        { label: 'Testar transação', description: 'Use o cartão 4242 4242 4242 4242 para simular um pagamento.' },
      ],
      fields: [
        { name: 'Publishable Key', description: 'Chave pública (pk_test_...) - usada no frontend.' },
        { name: 'Secret Key', description: 'Chave secreta (sk_test_...) - usada no backend.' },
        { name: 'Webhook Secret', description: 'Secret do webhook (whsec_...) - valida assinatura dos eventos.' },
      ],
      webhookEvents: [
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.refunded',
        'charge.dispute.created',
        'invoice.paid',
        'invoice.payment_failed',
      ],
    },
    production: {
      steps: [
        { label: 'Ativar conta para produção', description: 'Complete o onboarding no Stripe com dados reais da empresa.' },
        { label: 'Obter chaves de produção', description: 'Em Developers → API Keys, copie as chaves Live (pk_live_, sk_live_).' },
        { label: 'Configurar Webhook de produção', description: 'Crie um endpoint de webhook com a URL fornecida (ambiente produção).' },
        { label: 'Ativar gateway', description: 'Salve as credenciais e teste a conexão.' },
      ],
      fields: [
        { name: 'Publishable Key', description: 'Chave pública de produção (pk_live_...).' },
        { name: 'Secret Key', description: 'Chave secreta de produção (sk_live_...).' },
        { name: 'Webhook Secret', description: 'Secret do webhook de produção (whsec_...).' },
      ],
      webhookEvents: [
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.refunded',
        'charge.dispute.created',
        'invoice.paid',
        'invoice.payment_failed',
      ],
    },
  },
  asaas: {
    label: 'Asaas',
    docsUrl: 'https://docs.asaas.com/',
    sandbox: {
      steps: [
        { label: 'Criar conta Sandbox', description: 'Acesse sandbox.asaas.com e crie uma conta de testes.' },
        { label: 'Gerar API Key de teste', description: 'Em Configurações → Integrações → API, gere uma chave Sandbox ($aact_...).' },
        { label: 'Configurar Webhook de teste', description: 'Em Configurações → Integrações → Webhooks, adicione a URL fornecida.' },
        { label: 'Marcar eventos', description: 'Selecione os eventos de pagamento recomendados.' },
        { label: 'Testar cobrança', description: 'Crie uma cobrança de teste via API ou painel.' },
      ],
      fields: [
        { name: 'API Key', description: 'Chave de API Sandbox ($aact_...) - autenticação de todas as chamadas.' },
        { name: 'Wallet ID', description: 'ID da carteira (opcional) - para contas com múltiplas wallets.' },
      ],
      webhookEvents: [
        'PAYMENT_RECEIVED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_OVERDUE',
        'PAYMENT_REFUNDED',
        'PAYMENT_DELETED',
        'PAYMENT_CREATED',
        'PAYMENT_UPDATED',
      ],
    },
    production: {
      steps: [
        { label: 'Ativar conta de produção', description: 'Acesse asaas.com e complete a verificação da conta.' },
        { label: 'Gerar API Key de produção', description: 'Em Configurações → Integrações → API, gere a chave de produção ($aact_prod_...).' },
        { label: 'Configurar Webhook', description: 'Adicione a URL de webhook em Configurações → Integrações → Webhooks.' },
        { label: 'Ativar gateway', description: 'Salve as credenciais e execute o teste de conexão.' },
      ],
      fields: [
        { name: 'API Key', description: 'Chave de produção ($aact_prod_...) - autenticação de todas as chamadas.' },
        { name: 'Wallet ID', description: 'ID da carteira (opcional).' },
      ],
      webhookEvents: [
        'PAYMENT_RECEIVED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_OVERDUE',
        'PAYMENT_REFUNDED',
        'PAYMENT_DELETED',
      ],
    },
  },
  stone: {
    label: 'Stone',
    docsUrl: 'https://docs.openfinance.stone.com.br/',
    sandbox: {
      steps: [
        { label: 'Solicitar acesso ao Sandbox', description: 'Entre em contato com o time Stone para obter credenciais de Sandbox.' },
        { label: 'Obter Client ID e Client Secret', description: 'Receba as credenciais OAuth do ambiente de testes.' },
        { label: 'Configurar Webhook', description: 'No painel Stone, cadastre a URL de webhook fornecida.' },
        { label: 'Marcar eventos', description: 'Selecione os eventos de transação recomendados.' },
        { label: 'Testar transação', description: 'Simule um pagamento usando as ferramentas de teste da Stone.' },
      ],
      fields: [
        { name: 'Client ID', description: 'ID do cliente OAuth para autenticação na API Stone.' },
        { name: 'Client Secret', description: 'Secret do cliente OAuth.' },
        { name: 'Stone Code', description: 'Código identificador da loja na Stone.' },
        { name: 'Merchant ID', description: 'ID do merchant (se aplicável).' },
      ],
      webhookEvents: [
        'PAYMENT_CREATED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_CANCELED',
        'PAYMENT_REFUNDED',
        'CHARGEBACK_CREATED',
      ],
    },
    production: {
      steps: [
        { label: 'Homologar integração', description: 'Complete o processo de homologação com a equipe Stone.' },
        { label: 'Obter credenciais de produção', description: 'Receba Client ID e Secret de produção.' },
        { label: 'Configurar Webhook de produção', description: 'Cadastre o endpoint de produção no painel Stone.' },
        { label: 'Ativar gateway', description: 'Salve credenciais e execute teste de conexão.' },
      ],
      fields: [
        { name: 'Client ID', description: 'ID do cliente OAuth de produção.' },
        { name: 'Client Secret', description: 'Secret de produção.' },
        { name: 'Stone Code', description: 'Código da loja em produção.' },
        { name: 'Merchant ID', description: 'ID do merchant de produção.' },
      ],
      webhookEvents: [
        'PAYMENT_CREATED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_CANCELED',
        'PAYMENT_REFUNDED',
        'CHARGEBACK_CREATED',
      ],
    },
  },
};

interface GatewaySetupGuideProps {
  provider: 'stripe' | 'asaas' | 'stone';
}

export function GatewaySetupGuide({ provider }: GatewaySetupGuideProps) {
  const guide = PROVIDER_GUIDES[provider];
  if (!guide) return <p className="text-muted-foreground">Guia não disponível para este provedor.</p>;

  const renderEnvGuide = (env: 'sandbox' | 'production') => {
    const data = env === 'sandbox' ? guide.sandbox : guide.production;
    return (
      <div className="space-y-6">
        {/* Passo a passo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklist de Configuração</CardTitle>
            <CardDescription>
              Siga cada passo na ordem para configurar o {guide.label} em {env === 'sandbox' ? 'ambiente de testes' : 'produção'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                <div className="mt-0.5">
                  <Checkbox id={`${env}-step-${i}`} />
                </div>
                <div className="flex-1">
                  <label htmlFor={`${env}-step-${i}`} className="text-sm font-medium cursor-pointer">
                    {i + 1}. {step.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Campos necessários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campos Necessários</CardTitle>
            <CardDescription>Dados que você precisará inserir na configuração.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.fields.map((field, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded border">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{field.name}</span>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Eventos de webhook recomendados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos de Webhook Recomendados</CardTitle>
            <CardDescription>Marque estes eventos no painel do {guide.label}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.webhookEvents.map((event) => (
                <Badge key={event} variant="outline" className="font-mono text-xs">
                  {event}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Guia de Configuração — {guide.label}</h3>
          <p className="text-sm text-muted-foreground">
            Siga o passo a passo para integrar o {guide.label} ao sistema.
          </p>
        </div>
        <a
          href={guide.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary flex items-center gap-1 hover:underline"
        >
          Documentação oficial <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <Tabs defaultValue="sandbox">
        <TabsList>
          <TabsTrigger value="sandbox">
            <Badge variant="outline" className="mr-2">Sandbox</Badge> Ambiente de Testes
          </TabsTrigger>
          <TabsTrigger value="production">
            <Badge variant="default" className="mr-2">Prod</Badge> Produção
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sandbox">{renderEnvGuide('sandbox')}</TabsContent>
        <TabsContent value="production">{renderEnvGuide('production')}</TabsContent>
      </Tabs>
    </div>
  );
}
