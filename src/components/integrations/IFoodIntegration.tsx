import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Plug, 
  PlugZap, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  ExternalLink,
  Info,
  Copy
} from 'lucide-react';
import { useIFoodIntegration } from '@/hooks/useIFoodIntegration';
import { useToast } from '@/hooks/use-toast';

export function IFoodIntegration() {
  const { toast } = useToast();
  const {
    integration,
    isLoading,
    isTestingConnection,
    saveCredentials,
    testConnection,
    toggleIntegration,
    updateSettings,
    syncMenu
  } = useIFoodIntegration();

  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    merchant_id: ''
  });
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ifood-webhook?tenant_id=YOUR_TENANT_ID`;

  const handleSaveCredentials = () => {
    if (!credentials.client_id || !credentials.client_secret || !credentials.merchant_id) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos de credenciais',
        variant: 'destructive'
      });
      return;
    }
    saveCredentials.mutate(credentials);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'URL copiada',
      description: 'URL do webhook copiada para a área de transferência'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-red-600">iF</span>
              </div>
              <div>
                <CardTitle>Integração iFood</CardTitle>
                <CardDescription>
                  Receba pedidos do iFood diretamente no sistema
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={integration?.is_active ? 'default' : 'secondary'}
              className={integration?.is_active ? 'bg-green-500' : ''}
            >
              {integration?.is_active ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> Ativa</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Inativa</>
              )}
            </Badge>
          </div>
        </CardHeader>

        {integration && (
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Merchant ID</p>
                <p className="text-sm text-muted-foreground">{integration.merchant_id || 'Não configurado'}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testConnection()}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlugZap className="w-4 h-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
                <Switch
                  checked={integration.is_active}
                  onCheckedChange={(checked) => toggleIntegration.mutate(checked)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Setup Guide (if not configured) */}
      {!integration && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Como Configurar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Para integrar com o iFood, você precisa de credenciais de API. 
                Siga os passos abaixo para obtê-las.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Acesse o Portal do Parceiro iFood</p>
                  <p className="text-sm text-muted-foreground">
                    Faça login em{' '}
                    <a 
                      href="https://portal.ifood.com.br" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      portal.ifood.com.br <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Solicite acesso à API</p>
                  <p className="text-sm text-muted-foreground">
                    Vá em Configurações → Integrações → Solicitar API
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Obtenha suas credenciais</p>
                  <p className="text-sm text-muted-foreground">
                    Após aprovação, você receberá: Client ID, Client Secret e Merchant ID
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="font-medium">Configure o Webhook</p>
                  <p className="text-sm text-muted-foreground">
                    No portal iFood, configure a URL do webhook para receber notificações
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={() => setShowCredentialsForm(true)} className="w-full">
              <Plug className="w-4 h-4 mr-2" />
              Configurar Credenciais
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Credentials Form */}
      {(showCredentialsForm || integration) && (
        <Card>
          <CardHeader>
            <CardTitle>Credenciais da API</CardTitle>
            <CardDescription>
              {integration 
                ? 'Atualize suas credenciais do iFood se necessário'
                : 'Insira as credenciais obtidas no Portal do Parceiro'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Client ID</Label>
                <Input
                  id="client_id"
                  placeholder="Seu Client ID do iFood"
                  value={credentials.client_id}
                  onChange={(e) => setCredentials(prev => ({ ...prev, client_id: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_secret">Client Secret</Label>
                <Input
                  id="client_secret"
                  type="password"
                  placeholder="Seu Client Secret"
                  value={credentials.client_secret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, client_secret: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchant_id">Merchant ID</Label>
                <Input
                  id="merchant_id"
                  placeholder="ID do seu restaurante no iFood"
                  value={credentials.merchant_id}
                  onChange={(e) => setCredentials(prev => ({ ...prev, merchant_id: e.target.value }))}
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveCredentials} 
              disabled={saveCredentials.isPending}
              className="w-full"
            >
              {saveCredentials.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Salvar e Validar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Webhook URL */}
      {integration && (
        <Card>
          <CardHeader>
            <CardTitle>URL do Webhook</CardTitle>
            <CardDescription>
              Configure esta URL no Portal do Parceiro iFood para receber pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={webhookUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Substitua YOUR_TENANT_ID pelo ID do seu estabelecimento no sistema
            </p>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      {integration && (
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aceitar pedidos automaticamente</Label>
                <p className="text-sm text-muted-foreground">
                  Confirma pedidos no iFood assim que chegam
                </p>
              </div>
              <Switch
                checked={integration.auto_accept_orders}
                onCheckedChange={(checked) => 
                  updateSettings.mutate({ auto_accept_orders: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sincronização de cardápio</Label>
                <p className="text-sm text-muted-foreground">
                  Mantém produtos sincronizados com o iFood
                </p>
              </div>
              <Switch
                checked={integration.sync_menu}
                onCheckedChange={(checked) => 
                  updateSettings.mutate({ sync_menu: checked })
                }
              />
            </div>

            <Separator />

            <Button 
              variant="outline" 
              onClick={() => syncMenu.mutate()}
              disabled={syncMenu.isPending}
              className="w-full"
            >
              {syncMenu.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sincronizar Cardápio Agora
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
