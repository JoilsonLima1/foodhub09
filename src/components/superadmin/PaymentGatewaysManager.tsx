import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, CreditCard, Save, CheckCircle2, Info, ArrowLeft, Landmark, BookOpen, Webhook } from 'lucide-react';
import { usePaymentGateways, PaymentGateway } from '@/hooks/usePaymentGateways';
import { StoneAdminPanel } from '@/components/superadmin/stone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GatewaySetupGuide, GatewayWebhookPanel, GatewayAutoSetupButton, GatewayCredentialsForm } from '@/components/gateway';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const gatewayProviders = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'pagseguro', label: 'PagSeguro' },
  { value: 'asaas', label: 'Asaas' },
  { value: 'stone', label: 'Stone' },
  { value: 'cielo', label: 'Cielo' },
];

export function PaymentGatewaysManager() {
  const { gateways, isLoading, createGateway, updateGateway, deleteGateway } = usePaymentGateways();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [detailProvider, setDetailProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    api_key_masked: '',
    is_active: false,
    is_default: false,
  });

  const handleOpenDialog = (gateway?: PaymentGateway) => {
    if (gateway) {
      setEditingGateway(gateway);
      setFormData({
        name: gateway.name,
        provider: gateway.provider,
        api_key_masked: gateway.api_key_masked || '',
        is_active: gateway.is_active,
        is_default: gateway.is_default,
      });
    } else {
      setEditingGateway(null);
      setFormData({
        name: '',
        provider: '',
        api_key_masked: '',
        is_active: false,
        is_default: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: formData.name,
      provider: formData.provider,
      api_key_masked: formData.api_key_masked,
      is_active: formData.is_active,
      is_default: formData.is_default,
      config: {},
    };

    if (editingGateway) {
      updateGateway.mutate({ id: editingGateway.id, ...payload }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createGateway.mutate(payload, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const toggleActive = (gateway: PaymentGateway) => {
    updateGateway.mutate({ id: gateway.id, is_active: !gateway.is_active });
  };

  const isApiKeyConfigured = (gateway: PaymentGateway) => {
    return gateway.api_key_masked && gateway.api_key_masked.length > 10;
  };

  const detectEnvironment = (apiKey: string | null) => {
    if (!apiKey) return null;
    if (apiKey.startsWith('$aact_prod_')) return 'production';
    if (apiKey.startsWith('sk_live_') || apiKey.startsWith('pk_live_')) return 'production';
    return 'sandbox';
  };

  // Fetch platform provider account for detail view
  const { data: platformAccount } = useQuery({
    queryKey: ['platform-provider-account', detailProvider],
    enabled: !!detailProvider && detailProvider !== 'stone',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_provider_accounts')
        .select('*')
        .eq('provider', detailProvider!)
        .eq('scope_type', 'platform')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Detail view for Stone provider
  if (detailProvider === 'stone') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setDetailProvider(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Gateways
        </Button>
        <StoneAdminPanel />
      </div>
    );
  }

  // Detail view for Stripe/Asaas/other providers
  if (detailProvider && detailProvider !== 'stone') {
    const providerLabel = detailProvider === 'stripe' ? 'Stripe' : detailProvider === 'asaas' ? 'Asaas' : detailProvider;
    const validProvider = detailProvider === 'stripe' || detailProvider === 'asaas'
      ? detailProvider as 'stripe' | 'asaas'
      : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setDetailProvider(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Gateways
          </Button>
          {validProvider && (
            <GatewayAutoSetupButton provider={validProvider} scopeType="platform" />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold">{providerLabel} — Painel Super Admin</h2>
          <p className="text-muted-foreground">Configuração completa da integração {providerLabel}.</p>
        </div>

        {validProvider && (
          <GatewayCredentialsForm
            provider={validProvider}
            scopeType="platform"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gateways de Pagamento</h2>
          <p className="text-muted-foreground">
            Configure os provedores de pagamento disponíveis para os assinantes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Gateway
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gateways?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum gateway configurado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione gateways de pagamento para processar transações.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Gateway
              </Button>
            </CardContent>
          </Card>
        ) : (
          gateways?.map((gateway) => {
            const env = detectEnvironment(gateway.api_key_masked);
            const configured = isApiKeyConfigured(gateway);
            
            return (
              <Card key={gateway.id} className={`${!gateway.is_active ? 'opacity-60' : ''} cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow`} onClick={() => setDetailProvider(gateway.provider)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {gateway.provider === 'stone' ? <Landmark className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                      {gateway.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(gateway)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir gateway?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteGateway.mutate(gateway.id)}
                              className="bg-destructive"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CardDescription>
                    {gatewayProviders.find(p => p.value === gateway.provider)?.label || gateway.provider}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Switch
                      checked={gateway.is_active}
                      onCheckedChange={() => toggleActive(gateway)}
                    />
                  </div>
                  {gateway.is_default && (
                    <Badge variant="secondary">Gateway Padrão</Badge>
                  )}
                  
                  {/* API Integration Status */}
                  <div className="space-y-2">
                    {configured ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>API Key configurada</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <Info className="h-4 w-4" />
                        <span>API Key não configurada</span>
                      </div>
                    )}
                    
                    {env && (
                      <Badge variant={env === 'production' ? 'default' : 'outline'} className="text-xs">
                        {env === 'production' ? 'Produção' : 'Sandbox'}
                      </Badge>
                    )}
                  </div>

                  {/* Provider-specific info */}
                  {gateway.provider === 'asaas' && configured && (
                    <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted rounded">
                      <p className="font-medium">Métodos suportados:</p>
                      <ul className="list-disc list-inside">
                        <li>PIX (QR Code dinâmico)</li>
                        <li>Cartão de Crédito</li>
                        <li>Boleto Bancário</li>
                      </ul>
                    </div>
                  )}

                  {gateway.provider === 'stone' && (
                    <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); setDetailProvider('stone'); }}>
                      <Landmark className="h-4 w-4 mr-2" /> Detalhes & Configuração
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGateway ? 'Editar Gateway' : 'Novo Gateway'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do provedor de pagamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Stripe Principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provedor</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  {gatewayProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                value={formData.api_key_masked}
                onChange={(e) => setFormData({ ...formData, api_key_masked: e.target.value })}
                placeholder={formData.provider === 'asaas' ? '$aact_prod_xxx...' : 'sk_live_xxx...'}
                type="password"
              />
              <p className="text-xs text-muted-foreground">
                A chave será armazenada de forma segura no banco de dados.
              </p>
            </div>

            {/* Provider-specific info */}
            {formData.provider === 'asaas' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Integração Automática via API</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>Cole a API Key do Asaas (obtida no painel Asaas)</li>
                    <li>Ambiente detectado automaticamente pelo prefixo da chave</li>
                    <li><code>$aact_prod_</code> = Produção</li>
                    <li>Outros prefixos = Sandbox</li>
                  </ul>
                  <div className="mt-3 p-2 bg-background rounded border">
                    <p className="text-xs font-medium mb-1">⚠️ Configure o Webhook no Asaas:</p>
                    <code className="text-xs break-all select-all">
                      https://baxitzkbbqqbbbtojswm.supabase.co/functions/v1/asaas-webhook
                    </code>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {formData.provider === 'stripe' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Stripe</p>
                  <p className="text-xs">
                    A chave secreta do Stripe também deve estar configurada como secret do sistema (STRIPE_SECRET_KEY).
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_default">Gateway Padrão</Label>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.provider}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
