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
  Star,
  Settings2,
  Gift,
  Users,
  BarChart3,
  Trophy,
  AlertCircle,
  Coins,
  Crown,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface LoyaltyProgramPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function LoyaltyProgramPanel({ module, onBack }: LoyaltyProgramPanelProps) {
  const [settings, setSettings] = useState({
    active: true,
    birthdayBonus: true,
    referralBonus: true,
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
            <Star className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-bold">Programa de Fidelidade</h1>
            <ModuleStatusBadge status="coming_soon" />
          </div>
          <p className="text-sm text-muted-foreground">
            Recompense seus clientes mais fiéis
          </p>
        </div>
      </div>

      {/* Program Status */}
      <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Status do Programa</p>
              <p className="text-2xl font-bold">Inativo</p>
              <p className="text-sm opacity-75 mt-1">Configure para começar a fidelizar clientes</p>
            </div>
            <Crown className="h-16 w-16 opacity-30" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Membros Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Coins className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Pontos Emitidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Recompensas Resgatadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Clientes VIP</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">
            <Star className="h-4 w-4 mr-2" />
            Regras de Pontos
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Gift className="h-4 w-4 mr-2" />
            Recompensas
          </TabsTrigger>
          <TabsTrigger value="tiers">
            <Crown className="h-4 w-4 mr-2" />
            Níveis VIP
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Acúmulo</CardTitle>
              <CardDescription>
                Configure como os clientes ganham pontos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pontos por Real Gasto</Label>
                <Input type="number" placeholder="Ex: 1 ponto a cada R$ 1,00" disabled />
              </div>
              <div className="space-y-2">
                <Label>Pontos por Pedido</Label>
                <Input type="number" placeholder="Pontos fixos por pedido concluído" disabled />
              </div>
              <div className="space-y-2">
                <Label>Bônus de Primeira Compra</Label>
                <Input type="number" placeholder="Pontos extras no primeiro pedido" disabled />
              </div>
              <div className="pt-4">
                <Button disabled>Salvar Regras</Button>
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

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de Recompensas</CardTitle>
              <CardDescription>
                Configure as recompensas disponíveis para resgate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma recompensa cadastrada</p>
                <Button className="mt-4" variant="outline" disabled>
                  Adicionar Recompensa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <CardTitle>Níveis do Programa</CardTitle>
              <CardDescription>
                Configure os níveis VIP e seus benefícios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 border rounded-lg text-center">
                  <div className="h-10 w-10 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-2">
                    <Star className="h-5 w-5 text-gray-600" />
                  </div>
                  <h4 className="font-semibold">Bronze</h4>
                  <p className="text-sm text-muted-foreground">0 - 500 pontos</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="h-10 w-10 mx-auto bg-gray-300 rounded-full flex items-center justify-center mb-2">
                    <Star className="h-5 w-5 text-gray-700" />
                  </div>
                  <h4 className="font-semibold">Prata</h4>
                  <p className="text-sm text-muted-foreground">501 - 1500 pontos</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="h-10 w-10 mx-auto bg-amber-400 rounded-full flex items-center justify-center mb-2">
                    <Crown className="h-5 w-5 text-amber-800" />
                  </div>
                  <h4 className="font-semibold">Ouro</h4>
                  <p className="text-sm text-muted-foreground">1501+ pontos</p>
                </div>
              </div>
              <div className="pt-4">
                <Button disabled>Personalizar Níveis</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure o comportamento do programa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Programa Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Habilitar acúmulo e resgate de pontos
                  </p>
                </div>
                <Switch
                  checked={settings.active}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, active: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bônus de Aniversário</Label>
                  <p className="text-sm text-muted-foreground">
                    Dar pontos extras no aniversário do cliente
                  </p>
                </div>
                <Switch
                  checked={settings.birthdayBonus}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, birthdayBonus: checked }))
                  }
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bônus de Indicação</Label>
                  <p className="text-sm text-muted-foreground">
                    Dar pontos quando cliente indicar amigos
                  </p>
                </div>
                <Switch
                  checked={settings.referralBonus}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, referralBonus: checked }))
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
