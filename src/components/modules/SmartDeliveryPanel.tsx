import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Truck, 
  MapPin,
  Clock,
  Users,
  Route,
  Package,
  Settings2,
  CheckCircle2,
  BarChart3,
  Zap,
  Navigation,
  Bell,
  ExternalLink,
} from 'lucide-react';
import { ModuleStatusBadge } from './ModuleStatusBadge';
import { Link } from 'react-router-dom';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface SmartDeliveryPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function SmartDeliveryPanel({ module, onBack }: SmartDeliveryPanelProps) {
  const [settings, setSettings] = useState({
    autoAssign: true,
    routeOptimization: true,
    courierNotifications: true,
    customerTracking: true,
  });

  const addon = module?.addon_module;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Smart Delivery</h1>
            <ModuleStatusBadge status="beta" />
          </div>
          <p className="text-sm text-muted-foreground">
            Ferramenta logística para separação e entrega de pedidos
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Entregas Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Tempo Médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Entregadores Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Route className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Rotas Otimizadas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap gap-2 justify-start bg-transparent">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="routes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Route className="h-4 w-4 mr-2" />
            Roteirização
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Features Available */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Recursos Disponíveis
              </CardTitle>
              <CardDescription>
                Funcionalidades incluídas no Smart Delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureItem
                  icon={Users}
                  title="Gestão de Entregadores"
                  description="Cadastre e gerencie sua equipe de entrega"
                  status="ready"
                  link="/deliveries"
                />
                <FeatureItem
                  icon={MapPin}
                  title="Zonas de Entrega"
                  description="Configure áreas e taxas de entrega"
                  status="ready"
                  link="/deliveries"
                />
                <FeatureItem
                  icon={Bell}
                  title="Notificações Push"
                  description="Alertas em tempo real para entregadores"
                  status="ready"
                  link="/courier-dashboard"
                />
                <FeatureItem
                  icon={Navigation}
                  title="Rastreamento ao Vivo"
                  description="Acompanhe entregas em tempo real"
                  status="beta"
                  link="/rastrear"
                />
                <FeatureItem
                  icon={Route}
                  title="Otimização de Rotas"
                  description="Agrupe entregas por região automaticamente"
                  status="coming_soon"
                />
                <FeatureItem
                  icon={BarChart3}
                  title="Relatórios de Performance"
                  description="Métricas detalhadas de cada entregador"
                  status="coming_soon"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Acessos Rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link to="/deliveries">
                    <Truck className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">Gestão de Entregas</p>
                      <p className="text-xs text-muted-foreground">Gerenciar entregas e entregadores</p>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link to="/courier-dashboard">
                    <Users className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">App do Entregador</p>
                      <p className="text-xs text-muted-foreground">Painel para entregadores</p>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Smart Delivery</CardTitle>
              <CardDescription>
                Personalize o comportamento do sistema de entregas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Atribuição Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Atribuir entregas automaticamente ao entregador mais próximo
                  </p>
                </div>
                <Switch
                  checked={settings.autoAssign}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoAssign: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Otimização de Rotas</Label>
                  <p className="text-sm text-muted-foreground">
                    Sugerir melhor ordem de entregas baseado na localização
                  </p>
                </div>
                <Switch
                  checked={settings.routeOptimization}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, routeOptimization: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações para Entregadores</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar push notifications quando houver nova entrega
                  </p>
                </div>
                <Switch
                  checked={settings.courierNotifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, courierNotifications: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rastreamento pelo Cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que clientes acompanhem o status da entrega
                  </p>
                </div>
                <Switch
                  checked={settings.customerTracking}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, customerTracking: checked }))
                  }
                />
              </div>

              <div className="pt-4">
                <Button className="w-full sm:w-auto">
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Roteirização Inteligente
              </CardTitle>
              <CardDescription>
                Otimize as rotas de entrega para maior eficiência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Route className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
                <p className="max-w-md mx-auto">
                  A funcionalidade de roteirização inteligente está em desenvolvimento 
                  e será liberada em breve. Você será notificado quando estiver disponível.
                </p>
                <Badge variant="secondary" className="mt-4">
                  <Clock className="h-3 w-3 mr-1" />
                  Previsão: Q2 2026
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: 'ready' | 'beta' | 'coming_soon';
  link?: string;
}

function FeatureItem({ icon: Icon, title, description, status, link }: FeatureItemProps) {
  const isAvailable = ['ready', 'beta'].includes(status);

  const content = (
    <div className={`p-4 rounded-lg border transition-all ${
      isAvailable 
        ? 'bg-background hover:shadow-md cursor-pointer' 
        : 'bg-muted/50 opacity-70'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
          isAvailable ? 'bg-primary/10' : 'bg-muted'
        }`}>
          <Icon className={`h-5 w-5 ${isAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{title}</h4>
            {status === 'beta' && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Beta</Badge>
            )}
            {status === 'coming_soon' && (
              <Badge variant="secondary" className="text-xs">Em Breve</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {isAvailable && link && (
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>
    </div>
  );

  if (isAvailable && link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
}
