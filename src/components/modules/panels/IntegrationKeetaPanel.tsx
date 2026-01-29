import { useState } from 'react';
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
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface IntegrationKeetaPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function IntegrationKeetaPanel({ module, onBack }: IntegrationKeetaPanelProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState({
    autoAccept: true,
    syncMenu: true,
    syncPrices: true,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Plug2 className="h-6 w-6 text-green-600" />
            <h1 className="text-xl font-bold">Keeta</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Integração com marketplace Keeta para receber pedidos
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
                    ? 'Sua loja está recebendo pedidos do Keeta'
                    : 'Configure suas credenciais para começar'
                  }
                </p>
              </div>
            </div>
            <Button variant={isConnected ? 'outline' : 'default'} disabled>
              {isConnected ? 'Desconectar' : 'Conectar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Pedidos Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Tempo Médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Faturamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="credentials">
            <Plug2 className="h-4 w-4 mr-2" />
            Credenciais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Integração</CardTitle>
              <CardDescription>
                Personalize o comportamento da integração com Keeta
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
                  checked={settings.autoAccept}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoAccept: checked }))
                  }
                  disabled
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
                  checked={settings.syncMenu}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncMenu: checked }))
                  }
                  disabled
                />
              </div>

              <div className="pt-4">
                <Button disabled>Salvar Configurações</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais da API</CardTitle>
              <CardDescription>
                Insira suas credenciais do Keeta para conectar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input placeholder="Sua API Key do Keeta" disabled />
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <Input type="password" placeholder="Sua Secret Key" disabled />
              </div>
              <div className="space-y-2">
                <Label>Store ID</Label>
                <Input placeholder="ID da sua loja no Keeta" disabled />
              </div>
              <div className="pt-4 flex gap-2">
                <Button disabled>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Testar Conexão
                </Button>
                <Button variant="outline" disabled>Salvar</Button>
              </div>
              
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Em Desenvolvimento</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Esta integração está em desenvolvimento e será liberada em breve.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
