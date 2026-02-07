/**
 * PartnerSettlementsPage - Settlement management dashboard
 * 
 * READ-ONLY consumption of ledger data through Settlement Engine (Phase 6)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  ArrowRight,
  FileText,
  RefreshCw,
  Shield
} from 'lucide-react';
import { usePartnerSettlements, SettlementData } from '@/hooks/usePartnerSettlements';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  processing: { label: 'Processando', variant: 'default' },
  paid: { label: 'Pago', variant: 'default' },
  completed: { label: 'Concluído', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function PartnerSettlementsPage() {
  const { 
    settlements, 
    payouts, 
    financialSummary, 
    stats, 
    isLoading,
    generateSettlement,
    executePayout 
  } = usePartnerSettlements();
  
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const handleGenerateSettlement = () => {
    generateSettlement.mutate({ periodStart, periodEnd }, {
      onSuccess: () => setGenerateDialogOpen(false),
    });
  };

  const handleExecutePayout = (settlement: SettlementData) => {
    if (settlement.status !== 'pending') return;
    executePayout.mutate({ settlementId: settlement.id });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Liquidação & Repasses</h1>
            <p className="text-muted-foreground">
              Gerencie settlements e acompanhe repasses financeiros
            </p>
          </div>
          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Gerar Settlement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Gerar Novo Settlement</DialogTitle>
                <DialogDescription>
                  Selecione o período para consolidar transações não liquidadas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period-start">Data Início</Label>
                    <Input
                      id="period-start"
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period-end">Data Fim</Label>
                    <Input
                      id="period-end"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3 text-sm">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Este processo é idempotente. Gerar múltiplas vezes para o mesmo período não cria duplicatas.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleGenerateSettlement}
                  disabled={generateSettlement.isPending}
                >
                  {generateSettlement.isPending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    'Gerar Settlement'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {formatCurrency(financialSummary?.available_balance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Fora da janela de chargeback (14 dias)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Janela de Chargeback</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {formatCurrency(financialSummary?.in_chargeback_window || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Bloqueado por 14 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Repasse</CardTitle>
              <AlertCircle className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-500">
                {formatCurrency(financialSummary?.pending_settlement || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingSettlements} settlement(s) pendente(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Repassado</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(financialSummary?.total_paid || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.paidSettlements} settlement(s) pago(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Settlements Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Settlements</CardTitle>
            <CardDescription>
              Consolidações de transações por período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum settlement gerado ainda.</p>
                <p className="text-sm">Clique em "Gerar Settlement" para consolidar transações.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Taxa Plataforma</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead className="text-center">Transações</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(settlement.period_start), 'dd/MM', { locale: ptBR })}
                          <ArrowRight className="h-3 w-3" />
                          {format(new Date(settlement.period_end), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(settlement.total_gross)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(settlement.total_platform_fee)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-500">
                        {formatCurrency(settlement.total_partner_net)}
                      </TableCell>
                      <TableCell className="text-center">
                        {settlement.transaction_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusConfig[settlement.status]?.variant || 'secondary'}>
                          {statusConfig[settlement.status]?.label || settlement.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {settlement.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleExecutePayout(settlement)}
                            disabled={executePayout.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Marcar Pago
                          </Button>
                        )}
                        {settlement.status === 'paid' && settlement.paid_at && (
                          <span className="text-xs text-muted-foreground">
                            Pago em {format(new Date(settlement.paid_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payouts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Repasses</CardTitle>
            <CardDescription>
              Pagamentos executados para o parceiro
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum repasse executado ainda.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {payout.executed_at 
                          ? format(new Date(payout.executed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : format(new Date(payout.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        }
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(payout.amount)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payout.payout_method.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payout.provider_reference || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusConfig[payout.status]?.variant || 'secondary'}>
                          {statusConfig[payout.status]?.label || payout.status}
                        </Badge>
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
