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
  Monitor,
  Settings2,
  Users,
  Clock,
  AlertCircle,
  Volume2,
  Eye,
  Tv,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface PasswordPanelModuleProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function PasswordPanelModule({ module, onBack }: PasswordPanelModuleProps) {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    voiceCall: false,
    showWaitTime: true,
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
            <Monitor className="h-6 w-6 text-cyan-600" />
            <h1 className="text-xl font-bold">Painel de Senha</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Sistema de senhas para retirada de pedidos
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-8 w-8 mx-auto text-cyan-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Senha Atual</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Na Fila</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Tempo Médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Tv className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Telas Ativas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="display" className="space-y-4">
        <TabsList>
          <TabsTrigger value="display">
            <Monitor className="h-4 w-4 mr-2" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle>Visualização do Painel</CardTitle>
              <CardDescription>
                Configure a exibição no monitor de senhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Monitor className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Preview do Painel</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled>
                  Abrir em Nova Janela
                </Button>
                <Button variant="outline" className="flex-1" disabled>
                  Modo Tela Cheia
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

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Painel</CardTitle>
              <CardDescription>
                Personalize o comportamento do sistema de senhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Som de Chamada</Label>
                  <p className="text-sm text-muted-foreground">
                    Tocar som ao chamar nova senha
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
                  <Label>Chamada por Voz</Label>
                  <p className="text-sm text-muted-foreground">
                    Anunciar senha em voz alta (Text-to-Speech)
                  </p>
                </div>
                <Switch
                  checked={settings.voiceCall}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, voiceCall: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Tempo de Espera</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir tempo médio de espera no painel
                  </p>
                </div>
                <Switch
                  checked={settings.showWaitTime}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, showWaitTime: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Prefixo da Senha</Label>
                <Input placeholder="Ex: A, B, C..." disabled />
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
