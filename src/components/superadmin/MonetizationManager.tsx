import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, DollarSign, Percent, CreditCard, FileText, History, Building2, AlertTriangle } from 'lucide-react';
import { usePlatformFees, type MethodFeeConfig } from '@/hooks/usePlatformFees';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAYMENT_METHODS = [
  { key: 'pix', label: 'PIX' },
  { key: 'credit_card', label: 'Cartão de Crédito' },
  { key: 'debit_card', label: 'Cartão de Débito' },
  { key: 'boleto', label: 'Boleto' },
];

const PLANS = [
  { key: 'free', label: 'Free' },
  { key: 'starter', label: 'Starter' },
  { key: 'professional', label: 'Professional' },
  { key: 'enterprise', label: 'Enterprise' },
];

export function MonetizationManager() {
  const { config, overrides, auditLogs, isLoading, updateConfig } = usePlatformFees();
  
  const [localConfig, setLocalConfig] = useState<typeof config | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize local config when data loads
  if (config && !localConfig) {
    setLocalConfig(config);
  }

  const handleToggleEnabled = (enabled: boolean) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, enabled });
    setIsDirty(true);
  };

  const handleModeChange = (mode: 'manual' | 'automatic') => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, mode });
    setIsDirty(true);
  };

  const handleDefaultFeeChange = (field: 'default_percent' | 'default_fixed', value: string) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [field]: parseFloat(value) || 0 });
    setIsDirty(true);
  };

  const handleMethodFeeChange = (method: string, field: 'percent' | 'fixed', value: string) => {
    if (!localConfig) return;
    const newMethodConfig = {
      ...localConfig.per_method_config,
      [method]: {
        ...localConfig.per_method_config[method as keyof typeof localConfig.per_method_config],
        [field]: parseFloat(value) || 0,
      },
    };
    setLocalConfig({ ...localConfig, per_method_config: newMethodConfig });
    setIsDirty(true);
  };

  const handlePlanFeeChange = (plan: string, field: 'percent' | 'fixed', value: string) => {
    if (!localConfig) return;
    const newPlanConfig = {
      ...localConfig.per_plan_config,
      [plan]: {
        ...localConfig.per_plan_config[plan as keyof typeof localConfig.per_plan_config],
        [field]: parseFloat(value) || 0,
      },
    };
    setLocalConfig({ ...localConfig, per_plan_config: newPlanConfig });
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!localConfig) return;
    updateConfig.mutate(localConfig, {
      onSuccess: () => setIsDirty(false),
    });
  };

  if (isLoading || !localConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Monetização por Transação
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure taxas operacionais cobradas por transação processada
          </p>
        </div>
        {isDirty && (
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        )}
      </div>

      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status da Cobrança</span>
            <Switch
              checked={localConfig.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </CardTitle>
          <CardDescription>
            {localConfig.enabled 
              ? 'Taxas operacionais estão ativas. A plataforma cobra uma taxa por transação.'
              : 'Taxas operacionais estão desativadas. Nenhuma taxa será cobrada.'}
          </CardDescription>
        </CardHeader>
        {!localConfig.enabled && (
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Com as taxas desativadas, a plataforma não cobra nenhum valor sobre as transações dos lojistas.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {localConfig.enabled && (
        <Tabs defaultValue="default" className="space-y-4">
          <TabsList>
            <TabsTrigger value="default" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Taxa Padrão
            </TabsTrigger>
            <TabsTrigger value="methods" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Por Método
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Por Plano
            </TabsTrigger>
            <TabsTrigger value="overrides" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Overrides
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          {/* Default Fee */}
          <TabsContent value="default">
            <Card>
              <CardHeader>
                <CardTitle>Taxa Padrão</CardTitle>
                <CardDescription>
                  Taxa aplicada quando não há configuração específica por método ou plano
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>Modo de Cálculo</Label>
                  <Select value={localConfig.mode} onValueChange={(v) => handleModeChange(v as 'manual' | 'automatic')}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automático (Split)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="default_percent">Percentual (%)</Label>
                    <div className="relative">
                      <Input
                        id="default_percent"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={localConfig.default_percent}
                        onChange={(e) => handleDefaultFeeChange('default_percent', e.target.value)}
                        className="pr-8"
                      />
                      <Percent className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_fixed">Valor Fixo (R$)</Label>
                    <div className="relative">
                      <Input
                        id="default_fixed"
                        type="number"
                        step="0.01"
                        min="0"
                        value={localConfig.default_fixed}
                        onChange={(e) => handleDefaultFeeChange('default_fixed', e.target.value)}
                        className="pl-10"
                      />
                      <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Fórmula:</strong> Taxa = (Valor × {localConfig.default_percent}%) + R$ {localConfig.default_fixed.toFixed(2)}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Payment Method */}
          <TabsContent value="methods">
            <Card>
              <CardHeader>
                <CardTitle>Taxas por Método de Pagamento</CardTitle>
                <CardDescription>
                  Configure taxas específicas para cada método de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead>Percentual (%)</TableHead>
                      <TableHead>Fixo (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PAYMENT_METHODS.map((method) => {
                      const fee = localConfig.per_method_config[method.key as keyof typeof localConfig.per_method_config];
                      return (
                        <TableRow key={method.key}>
                          <TableCell className="font-medium">{method.label}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={fee.percent}
                              onChange={(e) => handleMethodFeeChange(method.key, 'percent', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={fee.fixed}
                              onChange={(e) => handleMethodFeeChange(method.key, 'fixed', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Plan */}
          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>Taxas por Plano de Assinatura</CardTitle>
                <CardDescription>
                  Configure taxas específicas para cada plano (sobrescreve configuração por método)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plano</TableHead>
                      <TableHead>Percentual (%)</TableHead>
                      <TableHead>Fixo (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PLANS.map((plan) => {
                      const fee = localConfig.per_plan_config[plan.key as keyof typeof localConfig.per_plan_config];
                      return (
                        <TableRow key={plan.key}>
                          <TableCell className="font-medium">{plan.label}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={fee.percent}
                              onChange={(e) => handlePlanFeeChange(plan.key, 'percent', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={fee.fixed}
                              onChange={(e) => handlePlanFeeChange(plan.key, 'fixed', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tenant Overrides */}
          <TabsContent value="overrides">
            <Card>
              <CardHeader>
                <CardTitle>Taxas Personalizadas por Tenant</CardTitle>
                <CardDescription>
                  Overrides individuais para tenants específicos (maior prioridade)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overrides && overrides.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Percentual</TableHead>
                        <TableHead>Fixo</TableHead>
                        <TableHead>Notas</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overrides.map((override: any) => (
                        <TableRow key={override.id}>
                          <TableCell className="font-medium">
                            {override.tenant?.name || override.tenant_id}
                          </TableCell>
                          <TableCell>
                            {override.override_percent != null ? `${override.override_percent}%` : '-'}
                          </TableCell>
                          <TableCell>
                            {override.override_fixed != null ? `R$ ${override.override_fixed.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {override.notes || '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(override.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum override configurado. Todos os tenants usam as taxas padrão.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Log de Auditoria</CardTitle>
                <CardDescription>
                  Histórico de todas as alterações nas configurações de taxas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs && auditLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.action === 'update' ? 'default' : 'secondary'}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.entity_type}</TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {log.new_values ? JSON.stringify(log.new_values).substring(0, 50) + '...' : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum registro de auditoria encontrado.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
