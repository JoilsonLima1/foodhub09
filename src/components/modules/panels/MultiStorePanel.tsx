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
  Building2,
  Settings2,
  Plus,
  BarChart3,
  MapPin,
  AlertCircle,
  Users,
  ShoppingBag,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface MultiStorePanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function MultiStorePanel({ module, onBack }: MultiStorePanelProps) {
  const [settings, setSettings] = useState({
    shareProducts: true,
    shareCustomers: true,
    centralizedReports: true,
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
            <Building2 className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold">Multi Lojas</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie múltiplas filiais em uma única conta
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-8 w-8 mx-auto text-indigo-600 mb-2" />
            <p className="text-2xl font-bold">1</p>
            <p className="text-sm text-muted-foreground">Lojas Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Vendas Totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Funcionários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Faturamento</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stores">
            <Building2 className="h-4 w-4 mr-2" />
            Minhas Lojas
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Consolidado
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <CardTitle>Lojas Cadastradas</CardTitle>
              <CardDescription>
                Gerencie suas filiais e unidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Matriz</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Loja Principal
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Gerenciar</Button>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nova Loja
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

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Relatório Consolidado</CardTitle>
              <CardDescription>
                Visão geral de todas as lojas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Adicione mais lojas para ver o relatório consolidado</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Multi Lojas</CardTitle>
              <CardDescription>
                Configure o comportamento entre as lojas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compartilhar Produtos</Label>
                  <p className="text-sm text-muted-foreground">
                    Usar mesmo catálogo em todas as lojas
                  </p>
                </div>
                <Switch
                  checked={settings.shareProducts}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, shareProducts: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compartilhar Clientes</Label>
                  <p className="text-sm text-muted-foreground">
                    Base de clientes unificada entre lojas
                  </p>
                </div>
                <Switch
                  checked={settings.shareCustomers}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, shareCustomers: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios Centralizados</Label>
                  <p className="text-sm text-muted-foreground">
                    Dashboard consolidado de todas as lojas
                  </p>
                </div>
                <Switch
                  checked={settings.centralizedReports}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, centralizedReports: checked }))
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
