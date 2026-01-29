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
  ChefHat,
  Settings2,
  Clock,
  AlertCircle,
  Monitor,
  Volume2,
  Timer,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import { Link } from 'react-router-dom';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface KitchenMonitorPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function KitchenMonitorPanel({ module, onBack }: KitchenMonitorPanelProps) {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    autoAdvance: false,
    showTimer: true,
    colorAlerts: true,
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
            <ChefHat className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold">Monitor de Preparos</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Painel visual para acompanhamento de pedidos na cozinha
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ChefHat className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Em Preparo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Tempo Médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Atrasados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Monitor className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Telas Ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-start h-auto py-3" asChild>
            <Link to="/kitchen">
              <ChefHat className="h-5 w-5 mr-3" />
              <div className="text-left flex-1">
                <p className="font-medium">Abrir Painel da Cozinha</p>
                <p className="text-xs text-muted-foreground">Visualizar pedidos em preparação</p>
              </div>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="display" className="space-y-4">
        <TabsList>
          <TabsTrigger value="display">
            <Monitor className="h-4 w-4 mr-2" />
            Exibição
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertCircle className="h-4 w-4 mr-2" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Exibição</CardTitle>
              <CardDescription>
                Personalize a aparência do monitor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Número de Colunas</Label>
                <Input type="number" placeholder="4" disabled />
              </div>
              <div className="space-y-2">
                <Label>Ordenação</Label>
                <Input placeholder="Mais antigo primeiro" disabled />
              </div>
              <div className="space-y-2">
                <Label>Tema</Label>
                <Input placeholder="Escuro (recomendado)" disabled />
              </div>
              <div className="pt-4">
                <Button disabled>Salvar</Button>
              </div>
              
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Em Desenvolvimento</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Configurações avançadas em desenvolvimento.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Alertas</CardTitle>
              <CardDescription>
                Configure alertas visuais e sonoros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas Coloridos</Label>
                  <p className="text-sm text-muted-foreground">
                    Mudar cor do pedido baseado no tempo
                  </p>
                </div>
                <Switch
                  checked={settings.colorAlerts}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, colorAlerts: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Tempo para Alerta Amarelo (minutos)</Label>
                <Input type="number" placeholder="10" disabled />
              </div>
              
              <div className="space-y-2">
                <Label>Tempo para Alerta Vermelho (minutos)</Label>
                <Input type="number" placeholder="15" disabled />
              </div>

              <div className="pt-4">
                <Button disabled>Salvar Alertas</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Personalize o comportamento do monitor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Som de Novo Pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Tocar som quando novo pedido chegar
                  </p>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, soundEnabled: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Avançar Automaticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Mover pedido para próximo status automaticamente
                  </p>
                </div>
                <Switch
                  checked={settings.autoAdvance}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoAdvance: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Cronômetro</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir tempo desde criação do pedido
                  </p>
                </div>
                <Switch
                  checked={settings.showTimer}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, showTimer: checked }))
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
