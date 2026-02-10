/**
 * PartnerBillingPage - Partner's own AR invoices, payment status, and dunning history
 */

import { useState } from 'react';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { usePartnerArInvoices, usePartnerDunningLog, usePartnerDunningStatus } from '@/hooks/usePartnerBillingConfig';
import { usePartnerAccessState } from '@/hooks/usePartnerAccessState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShieldAlert,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  paid: { label: 'Paga', variant: 'default', icon: CheckCircle2 },
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  overdue: { label: 'Vencida', variant: 'destructive', icon: AlertTriangle },
  canceled: { label: 'Cancelada', variant: 'outline', icon: XCircle },
  partially_paid: { label: 'Parcial', variant: 'secondary', icon: TrendingDown },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) => {
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return date;
  }
};

export default function PartnerBillingPage() {
  const { currentPartner } = usePartnerContext();
  const partnerId = currentPartner?.id;
  const { invoices, isLoading: loadingInvoices } = usePartnerArInvoices(partnerId);
  const { logs, isLoading: loadingLogs } = usePartnerDunningLog(partnerId);
  const { data: dunningStatus, isLoading: loadingStatus } = usePartnerDunningStatus(partnerId);
  const { dunningLevel, isBlocked, isReadOnly } = usePartnerAccessState();

  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const paidInvoices = invoices.filter(i => i.status === 'paid');

  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);

  if (loadingInvoices || loadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Faturamento</h1>
        <p className="text-muted-foreground">Suas faturas, status de pagamento e histórico de cobrança</p>
      </div>

      {/* Dunning Alert */}
      {dunningLevel >= 2 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Conta com restrições (L{dunningLevel})</AlertTitle>
          <AlertDescription>
            {isBlocked 
              ? 'Seu acesso está totalmente bloqueado. Regularize as faturas abaixo para restaurar.' 
              : isReadOnly 
                ? 'Seu painel está em modo somente leitura. Efetue o pagamento para restaurar as operações.'
                : 'Algumas funcionalidades estão restritas devido a faturas vencidas.'}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Vencido</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalOverdue > 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(totalOverdue)}
            </p>
            <p className="text-xs text-muted-foreground">{overdueInvoices.length} fatura(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A Vencer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-muted-foreground">{pendingInvoices.length} fatura(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nível Dunning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">L{dunningLevel}</p>
              <Badge variant={dunningLevel >= 3 ? 'destructive' : dunningLevel >= 1 ? 'secondary' : 'default'}>
                {dunningLevel === 0 ? 'Normal' : dunningLevel <= 2 ? 'Alerta' : 'Crítico'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faturas Pagas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{paidInvoices.length}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(paidInvoices.reduce((s, i) => s + i.amount, 0))} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="dunning">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Histórico Dunning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Suas Faturas</CardTitle>
              <CardDescription>Faturas AR geradas pela plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma fatura encontrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => {
                      const cfg = statusConfig[inv.status] || statusConfig.pending;
                      const StatusIcon = cfg.icon;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                          <TableCell>
                            {inv.reference_period_start
                              ? `${formatDate(inv.reference_period_start)} - ${formatDate(inv.reference_period_end || '')}`
                              : '—'}
                          </TableCell>
                          <TableCell>{formatDate(inv.due_date)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(inv.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {inv.paid_at ? formatDate(inv.paid_at) : inv.payment_method || '—'}
                          </TableCell>
                          <TableCell>
                            {inv.gateway_invoice_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={inv.gateway_invoice_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dunning">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Dunning</CardTitle>
              <CardDescription>Registro de ações de cobrança e escaladas</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum registro de dunning.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Revertido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.executed_at || log.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={log.dunning_level >= 3 ? 'destructive' : 'secondary'}>
                            L{log.dunning_level}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[300px] truncate">
                          {log.description || '—'}
                        </TableCell>
                        <TableCell>
                          {log.reversed_at ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {formatDate(log.reversed_at)}
                            </Badge>
                          ) : '—'}
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
