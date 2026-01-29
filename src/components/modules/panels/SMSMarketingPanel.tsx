import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  MessageSquare,
  Settings2,
  Send,
  Users,
  BarChart3,
  Clock,
  AlertCircle,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface SMSMarketingPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function SMSMarketingPanel({ module, onBack }: SMSMarketingPanelProps) {
  const [settings, setSettings] = useState({
    welcomeSMS: true,
    orderConfirmation: true,
    promotions: false,
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
            <MessageSquare className="h-6 w-6 text-green-600" />
            <h1 className="text-xl font-bold">SMS Marketing</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Envie campanhas de SMS para seus clientes
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Saldo de Créditos</p>
              <p className="text-3xl font-bold">0 SMS</p>
              <p className="text-sm opacity-75 mt-1">Compre créditos para enviar mensagens</p>
            </div>
            <Button variant="secondary" disabled>
              Comprar Créditos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Send className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Enviados Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Taxa de Entrega</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Clientes Alcançados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Conversões</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Zap className="h-4 w-4 mr-2" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="automatic">
            <Clock className="h-4 w-4 mr-2" />
            Automáticos
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Nova Campanha</CardTitle>
              <CardDescription>
                Crie uma campanha de SMS para seus clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Campanha</Label>
                <Input placeholder="Ex: Promoção de Fim de Semana" disabled />
              </div>
              <div className="space-y-2">
                <Label>Mensagem (160 caracteres)</Label>
                <Textarea 
                  placeholder="Digite sua mensagem de SMS aqui..."
                  maxLength={160}
                  disabled
                />
                <p className="text-xs text-muted-foreground">0/160 caracteres</p>
              </div>
              <div className="space-y-2">
                <Label>Segmento de Clientes</Label>
                <Input placeholder="Selecione o público-alvo" disabled />
              </div>
              <div className="pt-4">
                <Button disabled>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Campanha
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

        <TabsContent value="automatic">
          <Card>
            <CardHeader>
              <CardTitle>SMS Automáticos</CardTitle>
              <CardDescription>
                Configure mensagens enviadas automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS de Boas-Vindas</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar SMS para novos clientes cadastrados
                  </p>
                </div>
                <Switch
                  checked={settings.welcomeSMS}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, welcomeSMS: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Confirmação de Pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar SMS quando pedido for confirmado
                  </p>
                </div>
                <Switch
                  checked={settings.orderConfirmation}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, orderConfirmation: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Promoções Automáticas</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar SMS de promoções para clientes inativos
                  </p>
                </div>
                <Switch
                  checked={settings.promotions}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, promotions: checked }))
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

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Provedor</CardTitle>
              <CardDescription>
                Configure a integração com o provedor de SMS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Input placeholder="Selecione o provedor de SMS" disabled />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" placeholder="Sua chave de API" disabled />
              </div>
              <div className="space-y-2">
                <Label>Remetente</Label>
                <Input placeholder="Nome que aparecerá como remetente" disabled />
              </div>
              <div className="pt-4">
                <Button disabled>Salvar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
