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
  CreditCard,
  Settings2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BarChart3,
  Clock,
  AlertCircle,
  Wifi,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface TEFIntegrationPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function TEFIntegrationPanel({ module, onBack }: TEFIntegrationPanelProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState({
    autoCapture: true,
    printReceipt: true,
    confirmationRequired: true,
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
            <CreditCard className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold">TEF PINPAD</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Integração com máquina de cartão via TEF
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
                  {isConnected ? 'PINPAD Conectado' : 'Aguardando Conexão'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? 'Terminal TEF pronto para transações'
                    : 'Configure seu PINPAD para começar'
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
            <CreditCard className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Transações Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Volume Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Taxa Aprovação</p>
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
            <Wifi className="h-4 w-4 mr-2" />
            Hardware
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Transação</CardTitle>
              <CardDescription>
                Personalize o comportamento das transações TEF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Captura Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Capturar transação automaticamente após aprovação
                  </p>
                </div>
                <Switch
                  checked={settings.autoCapture}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoCapture: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Imprimir Comprovante</Label>
                  <p className="text-sm text-muted-foreground">
                    Imprimir comprovante automaticamente
                  </p>
                </div>
                <Switch
                  checked={settings.printReceipt}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, printReceipt: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Confirmação Manual</Label>
                  <p className="text-sm text-muted-foreground">
                    Exigir confirmação do operador antes de processar
                  </p>
                </div>
                <Switch
                  checked={settings.confirmationRequired}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, confirmationRequired: checked }))
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
              <CardTitle>Configuração do PINPAD</CardTitle>
              <CardDescription>
                Configure a conexão com o terminal TEF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provedor TEF</Label>
                <Input placeholder="Selecione o provedor" disabled />
              </div>
              <div className="space-y-2">
                <Label>Porta de Comunicação</Label>
                <Input placeholder="Ex: COM1" disabled />
              </div>
              <div className="space-y-2">
                <Label>Estabelecimento</Label>
                <Input placeholder="Código do estabelecimento" disabled />
              </div>
              <div className="pt-4 flex gap-2">
                <Button disabled>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Detectar PINPAD
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
