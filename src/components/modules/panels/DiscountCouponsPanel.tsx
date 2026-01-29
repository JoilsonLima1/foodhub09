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
  Ticket,
  Settings2,
  Plus,
  Users,
  BarChart3,
  Clock,
  AlertCircle,
  Percent,
  Calendar,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface DiscountCouponsPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function DiscountCouponsPanel({ module, onBack }: DiscountCouponsPanelProps) {
  const [settings, setSettings] = useState({
    allowMultiple: false,
    firstOrderOnly: true,
    limitPerCustomer: true,
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
            <Ticket className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold">Cupons de Desconto Avançado</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Crie cupons personalizados com regras avançadas
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Ticket className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Cupons Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Usos Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Percent className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Desconto Médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Conversão</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="coupons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coupons">
            <Ticket className="h-4 w-4 mr-2" />
            Meus Cupons
          </TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Criar Cupom
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Settings2 className="h-4 w-4 mr-2" />
            Regras Globais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons">
          <Card>
            <CardHeader>
              <CardTitle>Cupons Cadastrados</CardTitle>
              <CardDescription>
                Gerencie seus cupons de desconto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum cupom cadastrado</p>
                <p className="text-sm">Crie seu primeiro cupom na aba "Criar Cupom"</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Cupom</CardTitle>
              <CardDescription>
                Configure um novo cupom de desconto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Código do Cupom</Label>
                  <Input placeholder="Ex: PRIMEIRACOMPRA" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Input placeholder="Percentual ou Valor Fixo" disabled />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Valor do Desconto</Label>
                  <Input type="number" placeholder="Ex: 10" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Pedido Mínimo</Label>
                  <Input type="number" placeholder="Valor mínimo para aplicar" disabled />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input type="date" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Data de Expiração</Label>
                  <Input type="date" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Limite de Usos</Label>
                <Input type="number" placeholder="Deixe vazio para ilimitado" disabled />
              </div>
              <div className="pt-4">
                <Button disabled>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Cupom
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

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Regras Globais de Cupons</CardTitle>
              <CardDescription>
                Configure comportamentos padrão para todos os cupons
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir Múltiplos Cupons</Label>
                  <p className="text-sm text-muted-foreground">
                    Clientes podem usar mais de um cupom por pedido
                  </p>
                </div>
                <Switch
                  checked={settings.allowMultiple}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, allowMultiple: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Apenas Primeiro Pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Cupons funcionam apenas para novos clientes
                  </p>
                </div>
                <Switch
                  checked={settings.firstOrderOnly}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, firstOrderOnly: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Limite por Cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    Cada cliente pode usar cada cupom apenas uma vez
                  </p>
                </div>
                <Switch
                  checked={settings.limitPerCustomer}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, limitPerCustomer: checked }))
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
