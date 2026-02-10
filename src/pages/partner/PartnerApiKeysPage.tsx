/**
 * PartnerApiKeysPage - Manage API keys for partner integrations (Asaas, etc.)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerPaymentAccount } from '@/hooks/usePartnerPaymentAccount';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Key,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  ExternalLink,
} from 'lucide-react';

export default function PartnerApiKeysPage() {
  const { currentPartner } = usePartnerContext();
  const { account, isLoading } = usePartnerPaymentAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [asaasKey, setAsaasKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  const saveApiKey = useMutation({
    mutationFn: async ({ apiKey, webhookSecretVal }: { apiKey: string; webhookSecretVal: string }) => {
      if (!currentPartner?.id) throw new Error('Parceiro não encontrado');

      // Upsert into partner_payment_accounts
      const updateData: Record<string, unknown> = {};
      if (apiKey.trim()) {
        updateData.api_key_encrypted = apiKey.trim();
      }
      if (webhookSecretVal.trim()) {
        updateData.webhook_secret_encrypted = webhookSecretVal.trim();
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('Informe ao menos uma chave para salvar');
      }

      if (account) {
        // Update existing
        const { error } = await supabase
          .from('partner_payment_accounts')
          .update(updateData)
          .eq('partner_id', currentPartner.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('partner_payment_accounts')
          .insert({
            partner_id: currentPartner.id,
            provider: 'asaas',
            status: 'pending',
            ...updateData,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Chaves salvas', description: 'As chaves API foram atualizadas com sucesso.' });
      setAsaasKey('');
      setWebhookSecret('');
      queryClient.invalidateQueries({ queryKey: ['partner-payment-account', currentPartner?.id] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    saveApiKey.mutate({ apiKey: asaasKey, webhookSecretVal: webhookSecret });
  };

  const hasApiKey = !!(account as any)?.api_key_encrypted;
  const hasWebhookSecret = !!(account as any)?.webhook_secret_encrypted;

  const detectEnvironment = (key: string | null | undefined): 'sandbox' | 'production' | 'unknown' => {
    if (!key) return 'unknown';
    if (key.startsWith('$aact_')) return 'production';
    if (key.includes('sandbox')) return 'sandbox';
    if (key.length > 10) return 'production';
    return 'unknown';
  };

  const env = detectEnvironment((account as any)?.api_key_encrypted);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6" />
          Chaves API
        </h1>
        <p className="text-muted-foreground">
          Configure as chaves de integração do seu gateway de pagamento
        </p>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Segurança</AlertTitle>
        <AlertDescription>
          Suas chaves são armazenadas de forma segura e nunca são exibidas na íntegra após salvas.
          Utilize chaves de <strong>Sandbox</strong> para testes e <strong>Produção</strong> quando estiver pronto.
        </AlertDescription>
      </Alert>

      {/* Current Status */}
      {account && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Gateway</p>
                <p className="font-medium capitalize">{account.provider || 'Asaas'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">API Key</p>
                <div className="flex items-center gap-2">
                  {hasApiKey ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">Configurada</span>
                      <Badge variant="outline" className={
                        env === 'production' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : env === 'sandbox' 
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : ''
                      }>
                        {env === 'production' ? 'Produção' : env === 'sandbox' ? 'Sandbox' : 'Desconhecido'}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">Não configurada</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Webhook Secret</p>
                <div className="flex items-center gap-2">
                  {hasWebhookSecret ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">Configurado</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">Não configurado</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Key Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Asaas - Gateway de Pagamento</CardTitle>
          <CardDescription>
            Insira suas credenciais do Asaas para habilitar cobranças automáticas via PIX, Boleto e Cartão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asaas-key">API Key do Asaas</Label>
            <div className="relative">
              <Input
                id="asaas-key"
                type={showKey ? 'text' : 'password'}
                placeholder={hasApiKey ? '••••••••••••••••• (já configurada — cole uma nova para substituir)' : 'Cole sua API Key aqui ($aact_...)'}
                value={asaasKey}
                onChange={(e) => setAsaasKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontre sua API Key em{' '}
              <a
                href="https://www.asaas.com/config/index"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                Asaas → Configurações → Integrações
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret (opcional)</Label>
            <div className="relative">
              <Input
                id="webhook-secret"
                type={showWebhook ? 'text' : 'password'}
                placeholder={hasWebhookSecret ? '••••••••••••••••• (já configurado)' : 'Cole o webhook secret aqui'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowWebhook(!showWebhook)}
              >
                {showWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Usado para validar a autenticidade dos webhooks recebidos do Asaas.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saveApiKey.isPending || (!asaasKey.trim() && !webhookSecret.trim())}
            className="w-full sm:w-auto"
          >
            {saveApiKey.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Chaves
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
