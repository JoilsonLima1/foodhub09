import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, CreditCard, Users, DoorOpen, Bell, Percent } from 'lucide-react';
import { useTenantServiceConfig, useSaveTenantServiceConfig } from '@/hooks/useDigitalServiceConfig';
import { Skeleton } from '@/components/ui/skeleton';

export function TenantServiceSettings() {
  const { data: config, isLoading } = useTenantServiceConfig();
  const saveConfig = useSaveTenantServiceConfig();
  
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = () => {
    if (localConfig) {
      saveConfig.mutate(localConfig);
    }
  };

  const updateConfig = (key: string, value: boolean | number | string) => {
    setLocalConfig((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Initialize default config if not exists
  const currentConfig = localConfig || {
    allow_customer_ordering: true,
    order_requires_waiter_approval: false,
    allow_order_modification: true,
    allow_order_cancellation: true,
    modification_deadline_minutes: 5,
    allow_customer_payment: true,
    payment_requires_waiter_approval: false,
    allow_partial_payment: true,
    allow_split_payment: true,
    block_payment_until_orders_complete: false,
    allow_subcomanda: true,
    subcomanda_requires_titular_approval: true,
    subcomanda_requires_waiter_approval: false,
    exit_control_enabled: true,
    exit_requires_full_payment: true,
    exit_validation_method: 'waiter' as const,
    allow_waiter_change: false,
    waiter_change_requires_approval: true,
    notify_waiter: true,
    notify_kitchen: true,
    notify_bar: false,
    notify_cashier: false,
    service_fee_percent: 10,
    service_fee_optional: false,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configurações do Atendimento Digital</h2>
          <p className="text-muted-foreground">
            Configure os fluxos de pedidos, pagamentos e controle de saída
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveConfig.isPending}>
          {saveConfig.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="subcomanda" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Subcomanda
          </TabsTrigger>
          <TabsTrigger value="exit" className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            Saída
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Taxas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Pedidos</CardTitle>
              <CardDescription>
                Como os clientes podem fazer e modificar pedidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir pedidos pelo cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    Clientes podem fazer pedidos pelo app
                  </p>
                </div>
                <Switch
                  checked={currentConfig.allow_customer_ordering}
                  onCheckedChange={(checked) => updateConfig('allow_customer_ordering', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pedido requer aprovação do garçom</Label>
                  <p className="text-sm text-muted-foreground">
                    Pedidos precisam ser confirmados pelo garçom
                  </p>
                </div>
                <Switch
                  checked={currentConfig.order_requires_waiter_approval}
                  onCheckedChange={(checked) => updateConfig('order_requires_waiter_approval', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir modificação de pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Clientes podem alterar pedidos antes do preparo
                  </p>
                </div>
                <Switch
                  checked={currentConfig.allow_order_modification}
                  onCheckedChange={(checked) => updateConfig('allow_order_modification', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir cancelamento de pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Clientes podem cancelar pedidos antes do preparo
                  </p>
                </div>
                <Switch
                  checked={currentConfig.allow_order_cancellation}
                  onCheckedChange={(checked) => updateConfig('allow_order_cancellation', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Tempo limite para modificação (minutos)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={currentConfig.modification_deadline_minutes}
                  onChange={(e) => updateConfig('modification_deadline_minutes', parseInt(e.target.value) || 5)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Pagamento</CardTitle>
              <CardDescription>
                Como os clientes podem pagar suas comandas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir pagamento pelo cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    Clientes podem pagar pelo app
                  </p>
                </div>
                <Switch
                  checked={currentConfig.allow_customer_payment}
                  onCheckedChange={(checked) => updateConfig('allow_customer_payment', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pagamento requer aprovação do garçom</Label>
                  <p className="text-sm text-muted-foreground">
                    Garçom deve confirmar antes de processar
                  </p>
                </div>
                <Switch
                  checked={currentConfig.payment_requires_waiter_approval}
                  onCheckedChange={(checked) => updateConfig('payment_requires_waiter_approval', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir pagamento parcial</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente pode pagar apenas parte da conta
                  </p>
                </div>
                <Switch
                  checked={currentConfig.allow_partial_payment}
                  onCheckedChange={(checked) => updateConfig('allow_partial_payment', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir divisão de conta</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente pode dividir conta com outros
                  </p>
                </div>
                <Switch
                  checked={currentConfig.allow_split_payment}
                  onCheckedChange={(checked) => updateConfig('allow_split_payment', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bloquear pagamento até pedidos finalizados</Label>
                  <p className="text-sm text-muted-foreground">
                    Só permite pagar após todos os pedidos serem entregues
                  </p>
                </div>
                <Switch
                  checked={currentConfig.block_payment_until_orders_complete}
                  onCheckedChange={(checked) => updateConfig('block_payment_until_orders_complete', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcomanda" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Subcomanda</CardTitle>
              <CardDescription>
                Como acompanhantes podem participar da comanda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir subcomanda</Label>
                  <p className="text-sm text-muted-foreground">
                    Titular pode convidar acompanhantes
                  </p>
                </div>
                <Switch
                  checked={currentConfig.allow_subcomanda}
                  onCheckedChange={(checked) => updateConfig('allow_subcomanda', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Requer aprovação do titular</Label>
                  <p className="text-sm text-muted-foreground">
                    Titular deve aprovar cada acompanhante
                  </p>
                </div>
                <Switch
                  checked={currentConfig.subcomanda_requires_titular_approval}
                  onCheckedChange={(checked) => updateConfig('subcomanda_requires_titular_approval', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Requer aprovação do garçom</Label>
                  <p className="text-sm text-muted-foreground">
                    Garçom deve aprovar novos acompanhantes
                  </p>
                </div>
                <Switch
                  checked={currentConfig.subcomanda_requires_waiter_approval}
                  onCheckedChange={(checked) => updateConfig('subcomanda_requires_waiter_approval', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Controle de Saída</CardTitle>
              <CardDescription>
                Configurações para liberação de saída
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar controle de saída</Label>
                  <p className="text-sm text-muted-foreground">
                    Gerar QR Code para validação na porta
                  </p>
                </div>
                <Switch
                  checked={currentConfig.exit_control_enabled}
                  onCheckedChange={(checked) => updateConfig('exit_control_enabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir pagamento total</Label>
                  <p className="text-sm text-muted-foreground">
                    Só libera saída após pagar 100%
                  </p>
                </div>
                <Switch
                  checked={currentConfig.exit_requires_full_payment}
                  onCheckedChange={(checked) => updateConfig('exit_requires_full_payment', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Método de validação</Label>
                <Select
                  value={currentConfig.exit_validation_method}
                  onValueChange={(value) => updateConfig('exit_validation_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automático</SelectItem>
                    <SelectItem value="waiter">Apenas Garçom</SelectItem>
                    <SelectItem value="cashier">Apenas Caixa</SelectItem>
                    <SelectItem value="both">Garçom + Caixa</SelectItem>
                    <SelectItem value="admin">Apenas Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir troca de garçom</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente pode solicitar outro garçom
                  </p>
                </div>
                <Switch
                  checked={currentConfig.allow_waiter_change}
                  onCheckedChange={(checked) => updateConfig('allow_waiter_change', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Destinatários de Notificações</CardTitle>
              <CardDescription>
                Quem recebe notificações de novos pedidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Garçom</Label>
                <Switch
                  checked={currentConfig.notify_waiter}
                  onCheckedChange={(checked) => updateConfig('notify_waiter', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label>Cozinha</Label>
                <Switch
                  checked={currentConfig.notify_kitchen}
                  onCheckedChange={(checked) => updateConfig('notify_kitchen', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label>Bar</Label>
                <Switch
                  checked={currentConfig.notify_bar}
                  onCheckedChange={(checked) => updateConfig('notify_bar', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label>Caixa</Label>
                <Switch
                  checked={currentConfig.notify_cashier}
                  onCheckedChange={(checked) => updateConfig('notify_cashier', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Serviço</CardTitle>
              <CardDescription>
                Configuração da taxa de serviço (gorjeta)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Percentual da taxa de serviço</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={currentConfig.service_fee_percent}
                    onChange={(e) => updateConfig('service_fee_percent', parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Taxa opcional</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente pode optar por não pagar a taxa
                  </p>
                </div>
                <Switch
                  checked={currentConfig.service_fee_optional}
                  onCheckedChange={(checked) => updateConfig('service_fee_optional', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
