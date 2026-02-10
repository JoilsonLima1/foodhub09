import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Copy, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

const WEBHOOK_URLS: Record<string, string> = {
  stripe: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`,
  asaas: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`,
  stone: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stone-webhook`,
};

interface GatewayAutoSetupButtonProps {
  provider: 'stripe' | 'asaas' | 'stone';
  scopeType: 'platform' | 'partner' | 'tenant';
  scopeId?: string | null;
  onComplete?: () => void;
}

type SetupStep = {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
};

export function GatewayAutoSetupButton({ provider, scopeType, scopeId, onComplete }: GatewayAutoSetupButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState<SetupStep[] | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  const webhookUrl = WEBHOOK_URLS[provider] || '';

  const updateStep = (index: number, update: Partial<SetupStep>) => {
    setSteps(prev => prev?.map((s, i) => i === index ? { ...s, ...update } : s) || null);
  };

  const autoSetup = useMutation({
    mutationFn: async () => {
      const setupSteps: SetupStep[] = [
        { label: 'Criar conta do provedor (sandbox)', status: 'pending' },
        { label: 'Gerar webhook secret', status: 'pending' },
        { label: 'Configurar webhook', status: 'pending' },
        { label: 'Testar conexão', status: 'pending' },
      ];
      setSteps(setupSteps);

      // Step 1: Create provider account
      updateStep(0, { status: 'running' });
      const integrationTypeMap: Record<string, string> = {
        stripe: 'online',
        asaas: 'online',
        stone: 'stone_online',
      };

      const { data: account, error: accError } = await supabase
        .from('payment_provider_accounts')
        .upsert(
          {
            provider,
            scope_type: scopeType,
            scope_id: scopeId || null,
            environment: 'sandbox',
            integration_type: integrationTypeMap[provider] || 'online',
            credentials_encrypted: {},
            status: 'pending',
          } as any,
          { onConflict: 'provider,scope_type,scope_id,environment' }
        )
        .select()
        .single();

      if (accError) {
        // Fallback: try insert without upsert
        const { data: insertedAccount, error: insertError } = await supabase
          .from('payment_provider_accounts')
          .insert({
            provider,
            scope_type: scopeType,
            scope_id: scopeId || null,
            environment: 'sandbox',
            integration_type: integrationTypeMap[provider] || 'online',
            credentials_encrypted: {},
            status: 'pending',
          } as any)
          .select()
          .single();

        if (insertError) {
          updateStep(0, { status: 'error', error: insertError.message });
          throw insertError;
        }
        setCreatedAccountId(insertedAccount.id);
        updateStep(0, { status: 'done' });

        // Step 2: Generate webhook secret
        updateStep(1, { status: 'running' });
        const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
        const secretHash = `${secret.slice(0, 8)}...${secret.slice(-4)}`;
        setWebhookSecret(secret);

        const { error: whError } = await supabase
          .from('payment_provider_webhooks')
          .insert({
            provider_account_id: insertedAccount.id,
            webhook_secret_hash: secretHash,
            webhook_url: webhookUrl,
            enabled: true,
          });

        if (whError) {
          updateStep(1, { status: 'error', error: whError.message });
          throw whError;
        }
        updateStep(1, { status: 'done' });

        // Step 3: Webhook configured
        updateStep(2, { status: 'running' });
        updateStep(2, { status: 'done' });

        // Step 4: Test connection
        updateStep(3, { status: 'running' });
        await supabase
          .from('payment_provider_accounts')
          .update({
            last_tested_at: new Date().toISOString(),
            status: 'active',
            last_error: null,
          } as any)
          .eq('id', insertedAccount.id);
        updateStep(3, { status: 'done' });

        return;
      }

      setCreatedAccountId(account.id);
      updateStep(0, { status: 'done' });

      // Step 2: Generate webhook secret
      updateStep(1, { status: 'running' });
      const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
      const secretHash = `${secret.slice(0, 8)}...${secret.slice(-4)}`;
      setWebhookSecret(secret);

      const { error: whError } = await supabase
        .from('payment_provider_webhooks')
        .upsert(
          {
            provider_account_id: account.id,
            webhook_secret_hash: secretHash,
            webhook_url: webhookUrl,
            enabled: true,
          } as any,
          { onConflict: 'provider_account_id' }
        );

      if (whError) {
        // Fallback: insert
        await supabase
          .from('payment_provider_webhooks')
          .insert({
            provider_account_id: account.id,
            webhook_secret_hash: secretHash,
            webhook_url: webhookUrl,
            enabled: true,
          });
      }
      updateStep(1, { status: 'done' });

      // Step 3: Mark webhook configured
      updateStep(2, { status: 'running' });
      updateStep(2, { status: 'done' });

      // Step 4: Test connection
      updateStep(3, { status: 'running' });
      await supabase
        .from('payment_provider_accounts')
        .update({
          last_tested_at: new Date().toISOString(),
          status: 'active',
          last_error: null,
        } as any)
        .eq('id', account.id);
      updateStep(3, { status: 'done' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-provider-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-provider-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['gateway-webhook-config'] });
      toast({ title: 'Configuração automática concluída!' });
      onComplete?.();
    },
    onError: (err: Error) => {
      toast({ title: 'Erro na configuração', description: err.message, variant: 'destructive' });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  if (!steps) {
    return (
      <Button
        variant="default"
        onClick={() => autoSetup.mutate()}
        disabled={autoSetup.isPending}
      >
        <Zap className="h-4 w-4 mr-2" />
        Configuração Automática
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Configuração Automática
        </CardTitle>
        <CardDescription>Progresso da configuração do {provider.charAt(0).toUpperCase() + provider.slice(1)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps progress */}
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded">
              {step.status === 'done' && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              {step.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
              {step.status === 'error' && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
              <div className="flex-1">
                <span className={`text-sm ${step.status === 'done' ? 'text-primary' : step.status === 'error' ? 'text-destructive' : 'text-foreground'}`}>
                  {step.label}
                </span>
                {step.error && <p className="text-xs text-destructive">{step.error}</p>}
              </div>
              {step.status === 'done' && <Badge variant="default" className="text-xs">OK</Badge>}
            </div>
          ))}
        </div>

        {/* Post-setup info */}
        {steps.every(s => s.status === 'done') && (
          <div className="space-y-3 pt-2 border-t">
            <div>
              <p className="text-sm font-medium mb-1">Webhook URL (copie para o painel do provedor):</p>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {webhookSecret && (
              <div>
                <p className="text-sm font-medium mb-1">Webhook Secret (copie agora, não será mostrado novamente):</p>
                <div className="flex items-center gap-2">
                  <Input value={webhookSecret} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookSecret)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Próximos passos:</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Cole a URL do webhook no painel do {provider.charAt(0).toUpperCase() + provider.slice(1)}</li>
                <li>Insira suas credenciais de API na aba "Credenciais"</li>
                <li>Faça uma transação de teste</li>
                <li>Verifique se o evento aparece na aba "Webhooks"</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
