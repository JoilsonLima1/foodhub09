import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Percent, Users, TrendingUp } from 'lucide-react';
import {
  useWaiterCommissionConfig,
  useSaveWaiterCommissionConfig,
  useWaiterCommissions,
  useWaiterRanking,
  useApproveCommission,
  useMarkCommissionPaid,
} from '@/hooks/useWaiterCommissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/utils';

export function WaiterCommissionsManager() {
  const { data: config, isLoading: loadingConfig } = useWaiterCommissionConfig();
  const saveConfig = useSaveWaiterCommissionConfig();
  const { data: commissions, isLoading: loadingCommissions } = useWaiterCommissions();
  const { data: ranking } = useWaiterRanking('daily');
  const approveCommission = useApproveCommission();
  const markPaid = useMarkCommissionPaid();

  const [localConfig, setLocalConfig] = useState(config);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSaveConfig = () => {
    if (localConfig) {
      saveConfig.mutate(localConfig);
    }
  };

  const updateConfig = (key: string, value: boolean | number | string) => {
    setLocalConfig((prev) => prev ? { ...prev, [key]: value } : {
      is_enabled: false,
      commission_trigger: 'bill_closed',
      base_percent: 0,
      fixed_amount: 0,
      split_mode: 'individual',
      category_rates: {},
      [key]: value,
    } as any);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCommissions(
        commissions?.filter(c => c.status === 'approved').map(c => c.id) || []
      );
    } else {
      setSelectedCommissions([]);
    }
  };

  const handleMarkPaid = () => {
    if (selectedCommissions.length > 0) {
      markPaid.mutate(selectedCommissions);
      setSelectedCommissions([]);
    }
  };

  const currentConfig = localConfig || {
    is_enabled: false,
    commission_trigger: 'bill_closed',
    base_percent: 0,
    fixed_amount: 0,
    split_mode: 'individual',
    category_rates: {},
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comissões de Garçons</h2>
          <p className="text-muted-foreground">
            Configure e gerencie comissões da equipe
          </p>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Configuração de Comissões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar sistema de comissões</Label>
                  <p className="text-sm text-muted-foreground">
                    Calcular comissões automaticamente
                  </p>
                </div>
                <Switch
                  checked={currentConfig.is_enabled}
                  onCheckedChange={(checked) => updateConfig('is_enabled', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Gatilho da comissão</Label>
                <Select
                  value={currentConfig.commission_trigger}
                  onValueChange={(value) => updateConfig('commission_trigger', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_placed">Pedido feito</SelectItem>
                    <SelectItem value="order_delivered">Pedido entregue</SelectItem>
                    <SelectItem value="bill_closed">Conta fechada</SelectItem>
                    <SelectItem value="payment_received">Pagamento recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Percentual base (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={currentConfig.base_percent}
                    onChange={(e) => updateConfig('base_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor fixo (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={currentConfig.fixed_amount}
                    onChange={(e) => updateConfig('fixed_amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Modo de divisão</Label>
                <Select
                  value={currentConfig.split_mode}
                  onValueChange={(value) => updateConfig('split_mode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual (só quem atendeu)</SelectItem>
                    <SelectItem value="equal">Divisão igual entre todos</SelectItem>
                    <SelectItem value="proportional">Proporcional ao atendimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveConfig} disabled={saveConfig.isPending}>
                  {saveConfig.isPending ? 'Salvando...' : 'Salvar Configuração'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Comissões Pendentes</CardTitle>
                <CardDescription>Aprovar e marcar como pagas</CardDescription>
              </div>
              {selectedCommissions.length > 0 && (
                <Button onClick={handleMarkPaid} disabled={markPaid.isPending}>
                  Marcar {selectedCommissions.length} como Pagas
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingCommissions ? (
                <Skeleton className="h-32 w-full" />
              ) : !commissions?.length ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma comissão pendente
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCommissions.length === commissions.filter(c => c.status === 'approved').length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Garçom</TableHead>
                      <TableHead>Valor Base</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          {commission.status === 'approved' && (
                            <Checkbox
                              checked={selectedCommissions.includes(commission.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCommissions([...selectedCommissions, commission.id]);
                                } else {
                                  setSelectedCommissions(selectedCommissions.filter(id => id !== commission.id));
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>{commission.waiter_id}</TableCell>
                        <TableCell>{formatCurrency(commission.base_amount)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(commission.commission_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            commission.status === 'paid' ? 'default' :
                            commission.status === 'approved' ? 'secondary' : 'outline'
                          }>
                            {commission.status === 'paid' ? 'Paga' :
                             commission.status === 'approved' ? 'Aprovada' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {commission.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveCommission.mutate(commission.id)}
                              disabled={approveCommission.isPending}
                            >
                              Aprovar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ranking do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!ranking?.length ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado de performance ainda
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Garçom</TableHead>
                      <TableHead>Pedidos</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Comissões</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((perf, index) => (
                      <TableRow key={perf.id}>
                        <TableCell className="font-bold">{index + 1}º</TableCell>
                        <TableCell>{(perf as any).waiter?.name || 'Garçom'}</TableCell>
                        <TableCell>{perf.orders_taken}</TableCell>
                        <TableCell>{formatCurrency(perf.total_sales)}</TableCell>
                        <TableCell>{formatCurrency(perf.total_commissions)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            (perf.performance_score || 0) >= 80 ? 'default' :
                            (perf.performance_score || 0) >= 60 ? 'secondary' : 'outline'
                          }>
                            {perf.performance_score?.toFixed(0) || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
