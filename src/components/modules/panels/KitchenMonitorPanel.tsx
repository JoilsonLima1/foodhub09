import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ChefHat, Settings2, Clock, AlertCircle, Monitor, Timer, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useKitchenDisplay } from '@/hooks/useKitchenDisplay';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface KitchenMonitorPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function KitchenMonitorPanel({ module, onBack }: KitchenMonitorPanelProps) {
  const { config, stations, orderItems, stats, isLoading, saveConfig, updateItemStatus, bumpItem } = useKitchenDisplay();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold">Monitor KDS</h1>
            <Badge variant="outline">{module?.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Painel de preparos da cozinha</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><ChefHat className="h-8 w-8 mx-auto text-orange-500 mb-2" /><p className="text-2xl font-bold">{stats.preparingItems}</p><p className="text-sm text-muted-foreground">Em Preparo</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" /><p className="text-2xl font-bold">{stats.pendingItems}</p><p className="text-sm text-muted-foreground">Aguardando</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertCircle className="h-8 w-8 mx-auto text-red-600 mb-2" /><p className="text-2xl font-bold">{stats.alertItems}</p><p className="text-sm text-muted-foreground">Atrasados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Timer className="h-8 w-8 mx-auto text-green-600 mb-2" /><p className="text-2xl font-bold">{stats.avgPrepTime || '-'} min</p><p className="text-sm text-muted-foreground">Tempo Médio</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Button variant="outline" className="w-full justify-start h-auto py-3" asChild>
            <Link to="/kitchen">
              <ChefHat className="h-5 w-5 mr-3" />
              <div className="text-left flex-1"><p className="font-medium">Abrir Painel da Cozinha</p><p className="text-xs text-muted-foreground">Tela cheia para produção</p></div>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items"><ChefHat className="h-4 w-4 mr-2" />Itens</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-2" />Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <Card>
            <CardHeader><CardTitle>Itens em Preparação</CardTitle></CardHeader>
            <CardContent>
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><ChefHat className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Nenhum item</p></div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className={`p-4 border rounded-lg ${item.status === 'preparing' ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">#{item.order?.order_number}</span>
                            <Badge>{item.status === 'pending' ? 'Aguardando' : item.status === 'preparing' ? 'Preparando' : 'Pronto'}</Badge>
                          </div>
                        </div>
                        <p className="font-medium mb-2">{item.order_item?.quantity}x {item.order_item?.product_name}</p>
                        <div className="flex gap-2">
                          {item.status === 'pending' && <Button size="sm" onClick={() => updateItemStatus.mutate({ id: item.id, status: 'preparing' })}>Iniciar</Button>}
                          {item.status === 'preparing' && <Button size="sm" onClick={() => bumpItem.mutate(item.id)}>Pronto</Button>}
                        </div>
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
            <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Som de Novo Pedido</Label></div>
                <Switch checked={config?.sound_enabled ?? true} onCheckedChange={(checked) => saveConfig.mutate({ sound_enabled: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Mostrar Nome do Cliente</Label></div>
                <Switch checked={config?.show_customer_name ?? true} onCheckedChange={(checked) => saveConfig.mutate({ show_customer_name: checked })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
