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
  Zap,
  Settings2,
  MessageSquare,
  Users,
  BarChart3,
  Clock,
  AlertCircle,
  Send,
  Target,
  Calendar,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface IntelligentDispatcherPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function IntelligentDispatcherPanel({ module, onBack }: IntelligentDispatcherPanelProps) {
  const [settings, setSettings] = useState({
    whatsappEnabled: true,
    emailEnabled: true,
    pushEnabled: true,
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
            <Zap className="h-6 w-6 text-yellow-500" />
            <h1 className="text-xl font-bold">Disparador Inteligente</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Automação de mensagens e notificações para clientes
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Send className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Clientes Alcançados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Taxa de Abertura</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Conversões</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="automations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="automations">
            <Zap className="h-4 w-4 mr-2" />
            Automações
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" />
            Agendamentos
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Canais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations">
          <Card>
            <CardHeader>
              <CardTitle>Automações Ativas</CardTitle>
              <CardDescription>
                Regras de disparo automático de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Cliente Inativo</h4>
                      <p className="text-sm text-muted-foreground">
                        Enviar mensagem após 7 dias sem comprar
                      </p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                    <div>
                      <h4 className="font-medium">Carrinho Abandonado</h4>
                      <p className="text-sm text-muted-foreground">
                        Lembrete após abandono de carrinho
                      </p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-8 w-8 text-purple-600" />
                    <div>
                      <h4 className="font-medium">Pós-Venda</h4>
                      <p className="text-sm text-muted-foreground">
                        Avaliação após entrega concluída
                      </p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
              </div>
              
              <Button variant="outline" className="w-full" disabled>
                Criar Nova Automação
              </Button>
              
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

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagens</CardTitle>
              <CardDescription>
                Modelos de mensagem para suas automações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum template cadastrado</p>
                <Button className="mt-4" variant="outline" disabled>
                  Criar Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Disparos Agendados</CardTitle>
              <CardDescription>
                Campanhas programadas para envio futuro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum agendamento</p>
                <Button className="mt-4" variant="outline" disabled>
                  Agendar Campanha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Canais de Comunicação</CardTitle>
              <CardDescription>
                Configure os canais para envio de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar mensagens via WhatsApp Business API
                  </p>
                </div>
                <Switch
                  checked={settings.whatsappEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, whatsappEnabled: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>E-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar e-mails automatizados
                  </p>
                </div>
                <Switch
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, emailEnabled: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações no app/navegador
                  </p>
                </div>
                <Switch
                  checked={settings.pushEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, pushEnabled: checked }))
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
