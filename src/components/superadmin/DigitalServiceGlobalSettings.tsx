import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, DoorOpen, Settings, Bell } from 'lucide-react';
import { useGlobalServiceConfig, useSaveGlobalServiceConfig } from '@/hooks/useDigitalServiceConfig';
import { Skeleton } from '@/components/ui/skeleton';

export function DigitalServiceGlobalSettings() {
  const { data: config, isLoading } = useGlobalServiceConfig();
  const saveConfig = useSaveGlobalServiceConfig();
  
  const [localConfig, setLocalConfig] = useState(config);

  // Sync local state when data loads
  if (config && !localConfig) {
    setLocalConfig(config);
  }

  const handleSave = () => {
    if (localConfig) {
      saveConfig.mutate(localConfig);
    }
  };

  const updateConfig = (key: string, value: boolean | number) => {
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

  if (!localConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Configuração não encontrada. Inicializando...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configurações Globais do Atendimento Digital</h2>
          <p className="text-muted-foreground">
            Defina as regras padrão para todos os tenants
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveConfig.isPending}>
          {saveConfig.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Tabs defaultValue="kyc">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="kyc" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            KYC
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Fluxos
          </TabsTrigger>
          <TabsTrigger value="exit" className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            Saída
          </TabsTrigger>
          <TabsTrigger value="escalation" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Escalação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kyc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Requisitos de Cadastro Completo (KYC)
              </CardTitle>
              <CardDescription>
                Define quais ações exigem cadastro completo com documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir para fazer pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente precisa de cadastro completo para fazer pedidos
                  </p>
                </div>
                <Switch
                  checked={localConfig.kyc_required_for_ordering}
                  onCheckedChange={(checked) => updateConfig('kyc_required_for_ordering', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir para pagamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente precisa de cadastro completo para pagar
                  </p>
                </div>
                <Switch
                  checked={localConfig.kyc_required_for_payment}
                  onCheckedChange={(checked) => updateConfig('kyc_required_for_payment', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir para modificar pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente precisa de cadastro completo para alterar pedidos
                  </p>
                </div>
                <Switch
                  checked={localConfig.kyc_required_for_modification}
                  onCheckedChange={(checked) => updateConfig('kyc_required_for_modification', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir para saída</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente precisa de cadastro completo para liberar saída
                  </p>
                </div>
                <Switch
                  checked={localConfig.kyc_required_for_exit}
                  onCheckedChange={(checked) => updateConfig('kyc_required_for_exit', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir selfie</Label>
                  <p className="text-sm text-muted-foreground">
                    Cadastro completo inclui foto do rosto
                  </p>
                </div>
                <Switch
                  checked={localConfig.kyc_require_selfie}
                  onCheckedChange={(checked) => updateConfig('kyc_require_selfie', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir documento (RG/CNH)</Label>
                  <p className="text-sm text-muted-foreground">
                    Cadastro completo inclui foto do documento
                  </p>
                </div>
                <Switch
                  checked={localConfig.kyc_require_document}
                  onCheckedChange={(checked) => updateConfig('kyc_require_document', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Fluxos Padrão
              </CardTitle>
              <CardDescription>
                Configurações padrão para aprovações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pedido requer aprovação do garçom</Label>
                  <p className="text-sm text-muted-foreground">
                    Pedidos do cliente precisam de confirmação
                  </p>
                </div>
                <Switch
                  checked={localConfig.default_order_requires_waiter}
                  onCheckedChange={(checked) => updateConfig('default_order_requires_waiter', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pagamento requer aprovação do garçom</Label>
                  <p className="text-sm text-muted-foreground">
                    Pagamentos precisam de confirmação do garçom
                  </p>
                </div>
                <Switch
                  checked={localConfig.default_payment_requires_waiter}
                  onCheckedChange={(checked) => updateConfig('default_payment_requires_waiter', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />
                Controle de Saída
              </CardTitle>
              <CardDescription>
                Configurações padrão para liberação de saída
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Saída requer confirmação do garçom</Label>
                  <p className="text-sm text-muted-foreground">
                    Garçom deve confirmar número de pessoas
                  </p>
                </div>
                <Switch
                  checked={localConfig.default_exit_requires_waiter}
                  onCheckedChange={(checked) => updateConfig('default_exit_requires_waiter', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Saída requer confirmação do caixa</Label>
                  <p className="text-sm text-muted-foreground">
                    Caixa deve verificar pagamento
                  </p>
                </div>
                <Switch
                  checked={localConfig.default_exit_requires_cashier}
                  onCheckedChange={(checked) => updateConfig('default_exit_requires_cashier', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Escalação de Chamados
              </CardTitle>
              <CardDescription>
                Configurações de timeout e níveis de escalação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Timeout para escalação (minutos)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={localConfig.default_call_timeout_minutes}
                  onChange={(e) => updateConfig('default_call_timeout_minutes', parseInt(e.target.value) || 5)}
                />
                <p className="text-sm text-muted-foreground">
                  Tempo até escalar chamado não atendido
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Níveis de escalação</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={localConfig.default_escalation_levels}
                  onChange={(e) => updateConfig('default_escalation_levels', parseInt(e.target.value) || 2)}
                />
                <p className="text-sm text-muted-foreground">
                  Quantidade de níveis antes de notificar gerente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
