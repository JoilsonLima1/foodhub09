import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Star, Settings2, Gift, Users, Coins, Trophy, Crown, Loader2 } from 'lucide-react';
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';

interface LoyaltyProgramPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function LoyaltyProgramPanel({ module, onBack }: LoyaltyProgramPanelProps) {
  const { config, customers, stats, isLoading, saveConfig, addPoints, redeemPoints } = useLoyaltyProgram();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const getTierBadge = (points: number) => {
    if (points >= (config?.vip_threshold || 1500)) return <Badge className="bg-amber-500">Ouro</Badge>;
    if (points >= 500) return <Badge className="bg-gray-400">Prata</Badge>;
    return <Badge variant="secondary">Bronze</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-bold">Programa de Fidelidade</h1>
            <Badge variant="outline">{module?.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Recompense seus clientes fiéis</p>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Status</p>
              <p className="text-2xl font-bold">{config?.is_active ? 'Ativo' : 'Inativo'}</p>
              <p className="text-sm opacity-75">{config?.points_per_real || 1} ponto(s) por R$ 1,00</p>
            </div>
            <Switch checked={config?.is_active ?? false} onCheckedChange={(checked) => saveConfig.mutate({ is_active: checked })} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><Users className="h-8 w-8 mx-auto text-amber-600 mb-2" /><p className="text-2xl font-bold">{stats.totalCustomers}</p><p className="text-sm text-muted-foreground">Membros</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Coins className="h-8 w-8 mx-auto text-yellow-600 mb-2" /><p className="text-2xl font-bold">{stats.totalPointsCirculating.toLocaleString()}</p><p className="text-sm text-muted-foreground">Pontos Ativos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Gift className="h-8 w-8 mx-auto text-green-600 mb-2" /><p className="text-2xl font-bold">{stats.avgPointsPerCustomer}</p><p className="text-sm text-muted-foreground">Média/Cliente</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" /><p className="text-2xl font-bold">{stats.vipCustomers}</p><p className="text-sm text-muted-foreground">VIPs</p></CardContent></Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers"><Users className="h-4 w-4 mr-2" />Clientes</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-2" />Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          <Card>
            <CardHeader><CardTitle>Clientes</CardTitle><CardDescription>Gerencie pontos</CardDescription></CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Nenhum cliente</p></div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {customers.map((c) => (
                      <div key={c.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{c.name || 'Cliente'}</span>
                            {getTierBadge(c.current_points)}
                          </div>
                          <span className="text-sm text-muted-foreground">{c.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-600">{c.current_points} pts</span>
                          <Button size="sm" variant="outline" onClick={() => addPoints.mutate({ customerId: c.id, points: 100 })}><Coins className="h-3 w-3 mr-1" />+100</Button>
                          <Button size="sm" variant="outline" onClick={() => redeemPoints.mutate({ customerId: c.id, points: 100 })} disabled={c.current_points < 100}><Gift className="h-3 w-3 mr-1" />-100</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Pontos por Real</Label><Input type="number" defaultValue={config?.points_per_real || 1} onBlur={(e) => saveConfig.mutate({ points_per_real: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Mínimo para Resgate</Label><Input type="number" defaultValue={config?.min_points_redemption || 100} onBlur={(e) => saveConfig.mutate({ min_points_redemption: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Threshold VIP</Label><Input type="number" defaultValue={config?.vip_threshold || 1500} onBlur={(e) => saveConfig.mutate({ vip_threshold: parseInt(e.target.value) })} /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
