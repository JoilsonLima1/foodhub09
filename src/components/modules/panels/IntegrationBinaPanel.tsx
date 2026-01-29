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
  Phone,
  Settings2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PhoneCall,
  Users,
  Clock,
  AlertCircle,
  History,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface IntegrationBinaPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function IntegrationBinaPanel({ module, onBack }: IntegrationBinaPanelProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState({
    autoPopup: true,
    showHistory: true,
    recordCalls: false,
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
            <Phone className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">Bina Telefônica</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Identificação de chamadas com histórico de pedidos do cliente
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
                  {isConnected ? 'Hardware Conectado' : 'Aguardando Conexão'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? 'Bina telefônica ativa e funcionando'
                    : 'Configure seu hardware de bina telefônica'
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
            <PhoneCall className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Chamadas Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Clientes Identificados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <History className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Pedidos Rápidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Tempo Médio</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="hardware">
            <Phone className="h-4 w-4 mr-2" />
            Hardware
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Bina</CardTitle>
              <CardDescription>
                Personalize o comportamento da identificação de chamadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Popup Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Abrir ficha do cliente automaticamente ao receber ligação
                  </p>
                </div>
                <Switch
                  checked={settings.autoPopup}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoPopup: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Histórico</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir últimos pedidos do cliente no popup
                  </p>
                </div>
                <Switch
                  checked={settings.showHistory}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, showHistory: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gravar Chamadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Registrar áudio das ligações para auditoria
                  </p>
                </div>
                <Switch
                  checked={settings.recordCalls}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, recordCalls: checked }))
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

        <TabsContent value="hardware">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Hardware</CardTitle>
              <CardDescription>
                Configure o dispositivo de bina telefônica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Porta COM</Label>
                <Input placeholder="Ex: COM3" disabled />
              </div>
              <div className="space-y-2">
                <Label>Modelo do Dispositivo</Label>
                <Input placeholder="Selecione o modelo" disabled />
              </div>
              <div className="pt-4 flex gap-2">
                <Button disabled>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Detectar Hardware
                </Button>
                <Button variant="outline" disabled>Salvar</Button>
              </div>
              
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Em Desenvolvimento</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Esta funcionalidade está em desenvolvimento e será liberada em breve.
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
