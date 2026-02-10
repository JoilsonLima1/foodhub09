import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, BookOpen, Webhook, Zap } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { GatewaySetupGuide, GatewayWebhookPanel, GatewayAutoSetupButton } from '@/components/gateway';

const PROVIDER_META: Record<string, { label: string; fields: { key: string; label: string; placeholder: string; secret?: boolean }[] }> = {
  stripe: {
    label: 'Stripe',
    fields: [
      { key: 'publishable_key', label: 'Publishable Key', placeholder: 'pk_live_...' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
    ],
  },
  asaas: {
    label: 'Asaas',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '$aact_...', secret: true },
      { key: 'wallet_id', label: 'Wallet ID (opcional)', placeholder: '' },
    ],
  },
};

export default function TenantGatewayConfigPage() {
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const meta = provider ? PROVIDER_META[provider] : null;
  const validProvider = provider === 'stripe' || provider === 'asaas' ? provider : null;

  const { data: account, isLoading } = useQuery({
    queryKey: ['tenant-provider-account', provider, tenantId],
    enabled: !!provider && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_provider_accounts')
        .select('*')
        .eq('provider', provider!)
        .eq('scope_type', 'tenant')
        .eq('scope_id', tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const getFieldValue = (key: string) => {
    if (formValues[key] !== undefined) return formValues[key];
    const creds = account?.credentials_encrypted as Record<string, string> | null;
    return creds?.[key] || '';
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingCreds = (account?.credentials_encrypted as Record<string, string>) || {};
      const merged = { ...existingCreds, ...formValues };

      if (account) {
        const { error } = await supabase
          .from('payment_provider_accounts')
          .update({
            credentials_encrypted: merged as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_provider_accounts')
          .insert({
            provider: provider!,
            scope_type: 'tenant',
            scope_id: tenantId!,
            integration_type: 'online',
            credentials_encrypted: merged as any,
            status: 'pending',
            environment: 'production',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-provider-account'] });
      toast({ title: 'Credenciais salvas com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    },
  });

  if (!meta) {
    return (
      <div className="p-6">
        <p>Provedor não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate('/settings?tab=payments')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings?tab=payments')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Pagamentos
        </Button>
        {validProvider && tenantId && (
          <GatewayAutoSetupButton
            provider={validProvider}
            scopeType="tenant"
            scopeId={tenantId}
            onComplete={() => queryClient.invalidateQueries({ queryKey: ['tenant-provider-account'] })}
          />
        )}
      </div>

      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          {validProvider && (
            <>
              <TabsTrigger value="webhooks" className="flex items-center gap-2">
                <Webhook className="h-4 w-4" /> Webhooks
              </TabsTrigger>
              <TabsTrigger value="guide" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Guia
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Configurar {meta.label}</CardTitle>
              <CardDescription>
                Insira suas credenciais para habilitar pagamentos via {meta.label}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <>
                  {meta.fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label>{field.label}</Label>
                      <Input
                        type={field.secret ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        value={getFieldValue(field.key)}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}

                  {account && (
                    <div className="text-xs text-muted-foreground">
                      Status: <span className="font-medium">{account.status}</span>
                      {account.last_tested_at && (
                        <> · Último teste: {new Date(account.last_tested_at).toLocaleString('pt-BR')}</>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {saveMutation.isPending ? 'Salvando...' : 'Salvar Credenciais'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {validProvider && (
          <TabsContent value="webhooks">
            <GatewayWebhookPanel
              provider={validProvider}
              providerAccountId={account?.id || null}
            />
          </TabsContent>
        )}

        {validProvider && (
          <TabsContent value="guide">
            <GatewaySetupGuide provider={validProvider} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
