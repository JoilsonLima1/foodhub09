import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Plug2,
  Settings2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShoppingBag,
  BarChart3,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  History,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import { useMarketplaceIntegration } from '@/hooks/useMarketplaceIntegration';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Integration99FoodPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function Integration99FoodPanel({ module, onBack }: Integration99FoodPanelProps) {
  const {
    integration,
    orders,
    stats,
    isLoading,
    saveCredentials,
    updateSettings,
    testConnection,
  } = useMarketplaceIntegration('99food');

  const isConnected = integration?.is_active && integration?.credentials_configured;

  const handleTestConnection = () => {
    testConnection.mutate();
  };

  const handleSaveCredentials = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveCredentials.mutate({
      api_key: formData.get('api_key') as string,
      client_secret: formData.get('api_secret') as string,
      merchant_id: formData.get('merchant_id') as string,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Plug2 className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold">99Food</h1>
            <Badge variant="outline">{module?.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Integração com marketplace 99Food para receber pedidos
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold">
                  {isConnected ? 'Conectado' : 'Não Conectado'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? 'Sua loja está recebendo pedidos do 99Food'
                    : 'Configure suas credenciais para começar'
                  }
                </p>
              </div>
            </div>
            <Button 
              variant={isConnected ? 'outline' : 'default'}
              onClick={handleTestConnection}
              disabled={testConnection.isPending || !integration?.credentials_configured}
            >
              {testConnection.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-8 w-8 mx-auto text-orange-600 mb-2" />
            <p className="text-2xl font-bold">{stats.ordersToday}</p>
            <p className="text-sm text-muted-foreground">Pedidos Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{stats.avgTime || '-'} min</p>
            <p className="text-sm text-muted-foreground">Tempo Médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">
              {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-sm text-muted-foreground">Faturamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">{stats.cancelledCount}</p>
            <p className="text-sm text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="credentials">
            <Plug2 className="h-4 w-4 mr-2" />
            Credenciais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>
                Últimos pedidos recebidos do 99Food
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum pedido recebido ainda</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">#{order.external_order_id?.slice(-6)}</span>
                            <Badge variant={order.status === 'confirmed' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(order.created_at!), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        <p className="font-semibold">
                          {order.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Integração</CardTitle>
              <CardDescription>
                Personalize o comportamento da integração com 99Food
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Aceitar Pedidos Automaticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Aceitar novos pedidos sem intervenção manual
                  </p>
                </div>
                <Switch
                  checked={integration?.auto_accept_orders ?? true}
                  onCheckedChange={(checked) => 
                    updateSettings.mutate({ auto_accept_orders: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sincronizar Cardápio</Label>
                  <p className="text-sm text-muted-foreground">
                    Manter cardápio atualizado automaticamente
                  </p>
                </div>
                <Switch
                  checked={integration?.sync_menu ?? true}
                  onCheckedChange={(checked) => 
                    updateSettings.mutate({ sync_menu: checked })
                  }
                />
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => updateSettings.mutate({})}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais da API</CardTitle>
              <CardDescription>
                Insira suas credenciais do 99Food para conectar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input 
                    id="api_key"
                    name="api_key"
                    placeholder="Sua API Key do 99Food" 
                    defaultValue=""
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_secret">API Secret</Label>
                  <Input 
                    id="api_secret"
                    name="api_secret"
                    type="password" 
                    placeholder="Sua API Secret" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchant_id">Merchant ID</Label>
                  <Input 
                    id="merchant_id"
                    name="merchant_id"
                    placeholder="ID da sua loja no 99Food" 
                  />
                </div>
                <div className="pt-4 flex gap-2">
                  <Button type="submit" disabled={saveCredentials.isPending}>
                    {saveCredentials.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar Credenciais
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={testConnection.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Testar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
