import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  CreditCard,
  Settings2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BarChart3,
  Clock,
  Wifi,
  Loader2,
  DollarSign,
  History,
  Ban,
} from 'lucide-react';
import { ModuleStatusBadge } from '../ModuleStatusBadge';
import type { TenantModuleDetailed } from '@/hooks/useTenantModules';
import { useTEFIntegration, TEF_PROVIDERS } from '@/hooks/useTEFIntegration';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TEFIntegrationPanelProps {
  module?: TenantModuleDetailed;
  onBack: () => void;
}

export function TEFIntegrationPanel({ module, onBack }: TEFIntegrationPanelProps) {
  const {
    config,
    transactions,
    stats,
    isLoading,
    saveConfig,
    processPayment,
    cancelTransaction,
    testConnection,
  } = useTEFIntegration();

  const [testAmount, setTestAmount] = useState('10.00');
  const [testType, setTestType] = useState<'credit' | 'debit' | 'pix'>('credit');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Aprovado</Badge>;
      case 'declined':
        return <Badge variant="destructive">Recusado</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600">Processando</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit': return 'Crédito';
      case 'debit': return 'Débito';
      case 'pix': return 'PIX';
      case 'voucher': return 'Voucher';
      default: return type;
    }
  };

  const handleTestPayment = () => {
    const amount = parseFloat(testAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    processPayment.mutate({
      amount: amount * 100, // Convert to cents
      transaction_type: testType,
      installments: 1,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold">TEF PINPAD</h1>
            <ModuleStatusBadge status="ready" />
          </div>
          <p className="text-sm text-muted-foreground">
            Integração com máquina de cartão via TEF
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config?.is_active ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold">
                  {config?.is_active ? 'TEF Configurado' : 'Aguardando Configuração'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {config?.is_active 
                    ? `Provedor: ${TEF_PROVIDERS.find(p => p.value === config.provider)?.label || config.provider}`
                    : 'Configure seu PINPAD para começar'
                  }
                </p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => testConnection.mutate()}
              disabled={testConnection.isPending || !config?.com_port}
            >
              {testConnection.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">{stats.transactionsToday}</p>
            <p className="text-sm text-muted-foreground">Transações Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">
              R$ {(stats.totalVolume / 100).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Volume Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{stats.approvedCount}</p>
            <p className="text-sm text-muted-foreground">Aprovados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">{stats.approvalRate}%</p>
            <p className="text-sm text-muted-foreground">Taxa Aprovação</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">
            <History className="h-4 w-4 mr-2" />
            Transações
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="hardware">
            <Wifi className="h-4 w-4 mr-2" />
            Hardware
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transações de Hoje</CardTitle>
              <CardDescription>
                Histórico de transações TEF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma transação hoje</p>
                  <p className="text-sm">As transações aparecerão aqui</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              tx.status === 'approved' 
                                ? 'bg-green-100 dark:bg-green-900' 
                                : tx.status === 'declined'
                                  ? 'bg-red-100 dark:bg-red-900'
                                  : 'bg-muted'
                            }`}>
                              <CreditCard className={`h-5 w-5 ${
                                tx.status === 'approved' 
                                  ? 'text-green-600' 
                                  : tx.status === 'declined'
                                    ? 'text-red-600'
                                    : 'text-muted-foreground'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">
                                  R$ {(tx.amount / 100).toFixed(2)}
                                </span>
                                <Badge variant="outline">
                                  {getTypeLabel(tx.transaction_type)}
                                </Badge>
                                {getStatusBadge(tx.status)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {tx.card_brand && (
                                  <span>{tx.card_brand} •••• {tx.card_last4}</span>
                                )}
                                {tx.authorization_code && (
                                  <span>Auth: {tx.authorization_code}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(tx.created_at), "HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                          </div>
                          {tx.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => cancelTransaction.mutate(tx.id)}
                              disabled={cancelTransaction.isPending}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Estornar
                            </Button>
                          )}
                        </div>
                        {tx.error_message && (
                          <p className="text-xs text-destructive mt-2">{tx.error_message}</p>
                        )}
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
            <CardHeader>
              <CardTitle>Configurações de Transação</CardTitle>
              <CardDescription>
                Personalize o comportamento das transações TEF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Captura Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Capturar transação automaticamente após aprovação
                  </p>
                </div>
                <Switch
                  checked={config?.auto_capture ?? true}
                  onCheckedChange={(checked) => saveConfig.mutate({ auto_capture: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Imprimir Comprovante</Label>
                  <p className="text-sm text-muted-foreground">
                    Imprimir comprovante automaticamente
                  </p>
                </div>
                <Switch
                  checked={config?.print_receipt ?? true}
                  onCheckedChange={(checked) => saveConfig.mutate({ print_receipt: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Confirmação Manual</Label>
                  <p className="text-sm text-muted-foreground">
                    Exigir confirmação do operador antes de processar
                  </p>
                </div>
                <Switch
                  checked={config?.confirmation_required ?? true}
                  onCheckedChange={(checked) => saveConfig.mutate({ confirmation_required: checked })}
                />
              </div>

              <Separator />

              {/* Test Transaction */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">Transação de Teste</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={testAmount}
                      onChange={(e) => setTestAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={testType} onValueChange={(v: 'credit' | 'debit' | 'pix') => setTestType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Crédito</SelectItem>
                        <SelectItem value="debit">Débito</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      className="w-full"
                      onClick={handleTestPayment}
                      disabled={processPayment.isPending || !config?.is_active}
                    >
                      {processPayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Simular
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={() => saveConfig.mutate({ is_active: true })} disabled={saveConfig.isPending}>
                  {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hardware">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do PINPAD</CardTitle>
              <CardDescription>
                Configure a conexão com o terminal TEF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provedor TEF</Label>
                <Select 
                  value={config?.provider || ''} 
                  onValueChange={(value) => saveConfig.mutate({ provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEF_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Porta de Comunicação</Label>
                  <Input 
                    placeholder="Ex: COM1"
                    value={config?.com_port || ''}
                    onChange={(e) => saveConfig.mutate({ com_port: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terminal ID</Label>
                  <Input 
                    placeholder="ID do terminal"
                    value={config?.terminal_id || ''}
                    onChange={(e) => saveConfig.mutate({ terminal_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Código do Estabelecimento</Label>
                <Input 
                  placeholder="Código do estabelecimento"
                  value={config?.establishment_code || ''}
                  onChange={(e) => saveConfig.mutate({ establishment_code: e.target.value })}
                />
              </div>
              <div className="pt-4 flex gap-2">
                <Button 
                  onClick={() => testConnection.mutate()}
                  disabled={testConnection.isPending || !config?.com_port}
                >
                  {testConnection.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Detectar PINPAD
                </Button>
                <Button variant="outline" onClick={() => saveConfig.mutate({ is_active: true })} disabled={saveConfig.isPending}>
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
