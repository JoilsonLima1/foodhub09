import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plug2, Settings2, CheckCircle2, XCircle, RefreshCw, ShoppingBag, BarChart3, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useMarketplaceIntegration } from '@/hooks/useMarketplaceIntegration';
import { Badge } from '@/components/ui/badge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface IntegrationKeetaPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function IntegrationKeetaPanel({ module, onBack }: IntegrationKeetaPanelProps) {
  const { integration, orders, stats, isLoading, saveCredentials, updateSettings, testConnection } = useMarketplaceIntegration('keeta');
  const isConnected = integration?.is_active && integration?.credentials_configured;

  const handleSaveCredentials = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveCredentials.mutate({
      api_key: formData.get('api_key') as string,
      client_secret: formData.get('api_secret') as string,
      store_id: formData.get('store_id') as string,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Plug2 className="h-6 w-6 text-green-600" />
            <h1 className="text-xl font-bold">Keeta</h1>
            <Badge variant="outline">{module?.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Integração com marketplace Keeta</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-muted-foreground" />}
              <div>
                <h3 className="font-semibold">{isConnected ? 'Conectado' : 'Não Conectado'}</h3>
                <p className="text-sm text-muted-foreground">{isConnected ? 'Recebendo pedidos do Keeta' : 'Configure suas credenciais'}</p>
              </div>
            </div>
            <Button variant={isConnected ? 'outline' : 'default'} onClick={() => testConnection.mutate()} disabled={testConnection.isPending}>
              {testConnection.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Testar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><ShoppingBag className="h-8 w-8 mx-auto text-green-600 mb-2" /><p className="text-2xl font-bold">{stats.ordersToday}</p><p className="text-sm text-muted-foreground">Pedidos Hoje</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" /><p className="text-2xl font-bold">{stats.avgTime || '-'} min</p><p className="text-sm text-muted-foreground">Tempo Médio</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><BarChart3 className="h-8 w-8 mx-auto text-purple-600 mb-2" /><p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><p className="text-sm text-muted-foreground">Faturamento</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertCircle className="h-8 w-8 mx-auto text-amber-600 mb-2" /><p className="text-2xl font-bold">{stats.cancelledCount}</p><p className="text-sm text-muted-foreground">Cancelados</p></CardContent></Card>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-2" />Configurações</TabsTrigger>
          <TabsTrigger value="credentials"><Plug2 className="h-4 w-4 mr-2" />Credenciais</TabsTrigger>
        </TabsList>
        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle>Configurações</CardTitle><CardDescription>Personalize a integração</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div><Label>Aceitar Automaticamente</Label><p className="text-sm text-muted-foreground">Aceitar pedidos sem intervenção</p></div>
                <Switch checked={integration?.auto_accept_orders ?? true} onCheckedChange={(checked) => updateSettings.mutate({ auto_accept_orders: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label>Sincronizar Cardápio</Label><p className="text-sm text-muted-foreground">Manter cardápio atualizado</p></div>
                <Switch checked={integration?.sync_menu ?? true} onCheckedChange={(checked) => updateSettings.mutate({ sync_menu: checked })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="credentials">
          <Card>
            <CardHeader><CardTitle>Credenciais da API</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div className="space-y-2"><Label>API Key</Label><Input name="api_key" placeholder="Sua API Key" /></div>
                <div className="space-y-2"><Label>Secret Key</Label><Input name="api_secret" type="password" placeholder="Sua Secret Key" /></div>
                <div className="space-y-2"><Label>Store ID</Label><Input name="store_id" placeholder="ID da loja" /></div>
                <Button type="submit" disabled={saveCredentials.isPending}>{saveCredentials.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
