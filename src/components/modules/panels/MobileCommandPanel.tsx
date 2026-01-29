import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Smartphone,
  Settings2,
  QrCode,
  Users,
  ShoppingBag,
  AlertCircle,
  Wifi,
  Download,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface MobileCommandPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function MobileCommandPanel({ module, onBack }: MobileCommandPanelProps) {
  const [settings, setSettings] = useState({
    tableLink: true,
    splitPayment: true,
    callWaiter: true,
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
            <Smartphone className="h-6 w-6 text-teal-600" />
            <h1 className="text-xl font-bold">Comanda Mobile</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Lançamento de pedidos via smartphone ou tablet
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Smartphone className="h-8 w-8 mx-auto text-teal-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Dispositivos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Garçons Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Pedidos Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wifi className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Online</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">
            <Smartphone className="h-4 w-4 mr-2" />
            Dispositivos
          </TabsTrigger>
          <TabsTrigger value="qrcode">
            <QrCode className="h-4 w-4 mr-2" />
            Acesso
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos Autorizados</CardTitle>
              <CardDescription>
                Gerencie os aparelhos com acesso à comanda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum dispositivo autorizado</p>
                <Button className="mt-4" variant="outline" disabled>
                  Autorizar Dispositivo
                </Button>
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

        <TabsContent value="qrcode">
          <Card>
            <CardHeader>
              <CardTitle>Acesso ao App</CardTitle>
              <CardDescription>
                QR Code e link para acessar a comanda mobile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <div className="h-48 w-48 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="h-24 w-24 text-muted-foreground opacity-30" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Escaneie com o celular para acessar
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar QR Code
                  </Button>
                  <Button variant="outline" disabled>
                    Copiar Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Comanda</CardTitle>
              <CardDescription>
                Personalize o comportamento da comanda mobile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Vincular à Mesa</Label>
                  <p className="text-sm text-muted-foreground">
                    Obrigar seleção de mesa ao abrir comanda
                  </p>
                </div>
                <Switch
                  checked={settings.tableLink}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, tableLink: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Divisão de Conta</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir dividir conta entre pessoas
                  </p>
                </div>
                <Switch
                  checked={settings.splitPayment}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, splitPayment: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Chamar Garçom</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente pode chamar garçom pelo app
                  </p>
                </div>
                <Switch
                  checked={settings.callWaiter}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, callWaiter: checked }))
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
      </Tabs>
    </div>
  );
}
