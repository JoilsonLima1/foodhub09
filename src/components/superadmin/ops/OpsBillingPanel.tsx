/**
 * OpsBillingPanel - Super Admin billing operations panel (Phase 11)
 */

import { useState } from 'react';
import { useBillingOps } from '@/hooks/useBillingOps';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  RefreshCw, 
  Play,
  Loader2,
  Search
} from 'lucide-react';

export function OpsBillingPanel() {
  const { overview, isLoading, refetch, runBillingCron, syncInvoice, applyDunning } = useBillingOps();
  const [syncPaymentId, setSyncPaymentId] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      overdue: { variant: 'destructive', label: 'Vencido' },
      chargeback: { variant: 'destructive', label: 'Chargeback' },
      pending: { variant: 'secondary', label: 'Pendente' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturas Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{overview?.overdue_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{overview?.pending_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chargebacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{overview?.chargeback_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total em Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatCurrency(overview?.total_overdue_amount || 0)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações de Cobrança</CardTitle>
          <CardDescription>Operações manuais do ciclo de faturamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => runBillingCron.mutate(undefined)}
              disabled={runBillingCron.isPending}
            >
              {runBillingCron.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Executar Ciclo de Cobrança
            </Button>

            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Dados
            </Button>
          </div>

          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="Provider Payment ID (pay_...)"
              value={syncPaymentId}
              onChange={(e) => setSyncPaymentId(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (syncPaymentId) {
                  syncInvoice.mutate(syncPaymentId);
                  setSyncPaymentId('');
                }
              }}
              disabled={syncInvoice.isPending || !syncPaymentId}
            >
              {syncInvoice.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Problem Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Faturas com Problemas</CardTitle>
          <CardDescription>Faturas vencidas e chargebacks que requerem atenção</CardDescription>
        </CardHeader>
        <CardContent>
          {overview?.recent_problem_invoices && overview.recent_problem_invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recent_problem_invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.tenant_name}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyDunning.mutate(invoice.tenant_id)}
                        disabled={applyDunning.isPending}
                      >
                        {applyDunning.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Aplicar Dunning'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma fatura com problemas encontrada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
