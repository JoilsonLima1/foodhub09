/**
 * PartnerPaymentsPage - Partner payment management page
 * Shows onboarding status, settlement config, and transfer history
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePartnerPaymentAccount } from '@/hooks/usePartnerPaymentAccount';
import { usePartnerSettlementConfig } from '@/hooks/usePartnerSettlementConfig';
import { usePartnerTransfers } from '@/hooks/usePartnerTransfers';
import { useActivePaymentGateways } from '@/hooks/useActivePaymentGateways';
import { 
  CreditCard, 
  Settings, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Loader2,
  ExternalLink,
  Landmark,
  Zap,
  Ban,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: string; icon: React.ComponentType<any> }> = {
  not_started: { label: 'Não Iniciado', variant: 'secondary', icon: Clock },
  pending: { label: 'Pendente', variant: 'outline', icon: Clock },
  approved: { label: 'Aprovado', variant: 'default', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', variant: 'destructive', icon: XCircle },
  disabled: { label: 'Desabilitado', variant: 'secondary', icon: Ban },
};

export default function PartnerPaymentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Pagamentos
        </h1>
        <p className="text-muted-foreground">
          Gerencie seu onboarding de pagamentos, configurações de repasse e histórico de transferências
        </p>
      </div>

      <Tabs defaultValue="gateways" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gateways" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Gateways
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Status do Onboarding
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações de Repasse
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gateways">
          <PartnerGatewaysSection />
        </TabsContent>

        <TabsContent value="status">
          <OnboardingStatusSection />
        </TabsContent>

        <TabsContent value="config">
          <SettlementConfigSection />
        </TabsContent>

        <TabsContent value="history">
          <TransferHistorySection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Partner Gateways Section
// ============================================

function PartnerGatewaysSection() {
  const { data: gateways, isLoading } = useActivePaymentGateways();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const providerLabels: Record<string, string> = {
    stripe: 'Stripe',
    asaas: 'Asaas',
    stone: 'Stone',
    pix: 'PIX Manual',
  };

  // Always show Stone even if not in active gateways
  const hasStone = gateways?.some(g => g.provider === 'stone');
  const displayGateways = gateways || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Gateways de Pagamento</h3>
        <p className="text-sm text-muted-foreground">Provedores de pagamento disponíveis para o seu escopo</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {displayGateways.map(gateway => (
          <Card key={gateway.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {gateway.provider === 'stone' ? <Landmark className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                {gateway.name}
              </CardTitle>
              <CardDescription>{providerLabels[gateway.provider] || gateway.provider}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="default">Ativo</Badge>
              {gateway.is_default && <Badge variant="secondary" className="ml-1">Padrão</Badge>}
              {gateway.provider === 'stone' && (
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.location.href = '/partner/stone'}>
                  <Landmark className="h-4 w-4 mr-2" /> Configurar Stone
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Always show Stone card if not already in the list */}
        {!hasStone && (
          <Card className="opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Stone
              </CardTitle>
              <CardDescription>Stone (Repasse/Conta)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="secondary">Não habilitado</Badge>
              <p className="text-xs text-muted-foreground">Habilitação requerida pelo Super Admin</p>
            </CardContent>
          </Card>
        )}

        {displayGateways.length === 0 && hasStone === false && (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum gateway ativo. Contate o Super Admin.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================
// Onboarding Status Section
// ============================================

function OnboardingStatusSection() {
  const { 
    account, 
    isLoading, 
    startOnboarding, 
    syncStatus, 
    isSplitAvailable,
    isTransfersAvailable,
    canStartOnboarding,
    canSyncStatus,
  } = usePartnerPaymentAccount();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  const status = account?.status || 'not_started';
  const config = statusConfig[status] || statusConfig.not_started;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Conta de Pagamentos</CardTitle>
          <CardDescription>
            Sua conta de subadquirente para receber pagamentos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Status */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className={`p-3 rounded-full ${
              status === 'approved' ? 'bg-primary/10 text-primary' : 
              status === 'rejected' ? 'bg-destructive/10 text-destructive' : 
              'bg-muted text-muted-foreground'
            }`}>
              <StatusIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{config.label}</span>
                <Badge variant={config.variant as any}>{status}</Badge>
              </div>
              {account?.kyc_level && (
                <p className="text-sm text-muted-foreground">
                  Nível KYC: {account.kyc_level}
                </p>
              )}
            </div>
          </div>

          {/* Capabilities */}
          {account?.status === 'approved' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className={`p-4 rounded-lg border ${isSplitAvailable ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center gap-3">
                  <Zap className={`h-5 w-5 ${isSplitAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">Split de Pagamento</p>
                    <p className="text-sm text-muted-foreground">
                      {isSplitAvailable 
                        ? 'Disponível - Receba sua parte automaticamente' 
                        : 'Indisponível - Usando repasse manual'}
                    </p>
                  </div>
                  {isSplitAvailable ? (
                    <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground ml-auto" />
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${isTransfersAvailable ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center gap-3">
                  <Landmark className={`h-5 w-5 ${isTransfersAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">Transferências PIX</p>
                    <p className="text-sm text-muted-foreground">
                      {isTransfersAvailable 
                        ? 'Disponível - Transferências automáticas' 
                        : 'Indisponível'}
                    </p>
                  </div>
                  {isTransfersAvailable ? (
                    <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground ml-auto" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {status === 'not_started' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Onboarding Necessário</AlertTitle>
              <AlertDescription>
                Para receber pagamentos automaticamente, você precisa concluir o cadastro da sua conta de pagamentos.
                Clique no botão abaixo para iniciar o processo.
              </AlertDescription>
            </Alert>
          )}

          {status === 'pending' && (
            <Alert variant="default">
              <Clock className="h-4 w-4" />
              <AlertTitle>Aguardando Aprovação</AlertTitle>
              <AlertDescription>
                Seu cadastro está sendo analisado. Isso pode levar até 48 horas.
                Clique em "Sincronizar Status" para verificar atualizações.
              </AlertDescription>
            </Alert>
          )}

          {status === 'rejected' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Cadastro Rejeitado</AlertTitle>
              <AlertDescription>
                Seu cadastro foi rejeitado. Entre em contato com o suporte para mais informações.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {canStartOnboarding && (
              <Button 
                onClick={() => startOnboarding.mutate()}
                disabled={startOnboarding.isPending}
              >
                {startOnboarding.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Iniciar Onboarding
              </Button>
            )}

            {canSyncStatus && (
              <Button 
                variant="outline"
                onClick={() => syncStatus.mutate()}
                disabled={syncStatus.isPending}
              >
                {syncStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar Status
              </Button>
            )}

            {account?.onboarding_url && status === 'pending' && (
              <Button variant="outline" asChild>
                <a href={account.onboarding_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Continuar Cadastro
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Settlement Config Section
// ============================================

function SettlementConfigSection() {
  const { config, isLoading, updateConfig } = usePartnerSettlementConfig();
  const { isSplitAvailable } = usePartnerPaymentAccount();
  
  type SettlementMode = 'split' | 'invoice' | 'manual';
  type PayoutSchedule = 'daily' | 'weekly' | 'manual';
  
  const [formData, setFormData] = useState<{
    settlement_mode: SettlementMode;
    payout_schedule: PayoutSchedule;
    payout_min_amount: number;
  }>({
    settlement_mode: (config?.settlement_mode as SettlementMode) || 'manual',
    payout_schedule: (config?.payout_schedule as PayoutSchedule) || 'manual',
    payout_min_amount: config?.payout_min_amount || 100,
  });

  // Update form when config loads
  useState(() => {
    if (config) {
      setFormData({
        settlement_mode: config.settlement_mode as SettlementMode,
        payout_schedule: config.payout_schedule as PayoutSchedule,
        payout_min_amount: config.payout_min_amount,
      });
    }
  });

  const handleSave = () => {
    updateConfig.mutate({
      settlement_mode: formData.settlement_mode as any,
      payout_schedule: formData.payout_schedule as any,
      payout_min_amount: formData.payout_min_amount,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Repasse</CardTitle>
        <CardDescription>
          Configure como você deseja receber seus pagamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Settlement Mode */}
        <div className="space-y-2">
          <Label>Modo de Liquidação</Label>
          <Select 
            value={formData.settlement_mode}
            onValueChange={(value: SettlementMode) => setFormData(prev => ({ ...prev, settlement_mode: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="split" disabled={!isSplitAvailable}>
                Split Automático {!isSplitAvailable && '(Indisponível)'}
              </SelectItem>
              <SelectItem value="invoice">
                Fatura Mensal
              </SelectItem>
              <SelectItem value="manual">
                Repasse Manual
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {formData.settlement_mode === 'split' && 'Sua parte é separada automaticamente em cada transação.'}
            {formData.settlement_mode === 'invoice' && 'Você recebe uma fatura consolidada mensalmente.'}
            {formData.settlement_mode === 'manual' && 'Repasses são feitos manualmente pela plataforma.'}
          </p>
        </div>

        {/* Payout Schedule */}
        <div className="space-y-2">
          <Label>Agenda de Repasse</Label>
          <Select 
            value={formData.payout_schedule}
            onValueChange={(value: PayoutSchedule) => setFormData(prev => ({ ...prev, payout_schedule: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {formData.payout_schedule === 'daily' && 'Repasses são processados diariamente.'}
            {formData.payout_schedule === 'weekly' && 'Repasses são processados semanalmente.'}
            {formData.payout_schedule === 'manual' && 'Repasses são solicitados manualmente.'}
          </p>
        </div>

        {/* Minimum Amount */}
        <div className="space-y-2">
          <Label>Valor Mínimo para Repasse (R$)</Label>
          <Input
            type="number"
            min={0}
            step={10}
            value={formData.payout_min_amount}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              payout_min_amount: Math.max(0, Number(e.target.value)) 
            }))}
          />
          <p className="text-sm text-muted-foreground">
            Repasses só serão feitos quando o saldo atingir este valor.
          </p>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          disabled={updateConfig.isPending}
        >
          {updateConfig.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Transfer History Section
// ============================================

function TransferHistorySection() {
  const { payouts, transfers, isLoading, refetch } = usePartnerTransfers();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: string) => 
    format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Payouts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Repasses (Payouts)</CardTitle>
              <CardDescription>Histórico de repasses para sua conta</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum repasse encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{formatDate(payout.created_at)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payout.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        payout.status === 'paid' ? 'default' :
                        payout.status === 'pending' ? 'outline' :
                        payout.status === 'failed' ? 'destructive' : 'secondary'
                      }>
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payout.executed_at ? formatDate(payout.executed_at) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Provider Transfers */}
      <Card>
        <CardHeader>
          <CardTitle>Transferências do Provedor</CardTitle>
          <CardDescription>Transferências realizadas pelo gateway de pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma transferência encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID Transferência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{formatDate(transfer.created_at)}</TableCell>
                    <TableCell>{transfer.provider}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(transfer.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        transfer.status === 'completed' ? 'default' :
                        transfer.status === 'pending' ? 'outline' :
                        transfer.status === 'failed' ? 'destructive' : 'secondary'
                      }>
                        {transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {transfer.provider_transfer_id || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
