/**
 * PartnerInvoicesPage - View and manage partner tenant invoices
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePartnerInvoices, InvoiceFilters } from '@/hooks/usePartnerInvoices';
import { usePartnerTenantsData } from '@/hooks/usePartnerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Receipt,
  Loader2,
  MoreHorizontal,
  ExternalLink,
  Copy,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  paid: { label: 'Pago', variant: 'default' },
  overdue: { label: 'Vencido', variant: 'destructive' },
  canceled: { label: 'Cancelado', variant: 'outline' },
};

export default function PartnerInvoicesPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { tenants } = usePartnerTenantsData();
  
  const [filters, setFilters] = useState<InvoiceFilters>({
    tenant_id: searchParams.get('tenant') || undefined,
    status: undefined,
  });
  
  const { invoices, isLoading, stats, resendInvoice, markAsPaid, refetch } = usePartnerInvoices(filters);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; invoiceId: string; subscriptionId: string } | null>(null);

  useEffect(() => {
    const tenantParam = searchParams.get('tenant');
    if (tenantParam) {
      setFilters(prev => ({ ...prev, tenant_id: tenantParam }));
    }
  }, [searchParams]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const getDaysStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return { text: `${Math.abs(days)}d vencido`, color: 'text-destructive' };
    if (days === 0) return { text: 'Vence hoje', color: 'text-orange-500' };
    if (days <= 3) return { text: `${days}d restante`, color: 'text-orange-500' };
    return { text: `${days}d restante`, color: 'text-muted-foreground' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Faturas</h1>
          <p className="text-muted-foreground">
            Gerencie as cobranças das suas organizações
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.paidAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select
          value={filters.tenant_id || 'all'}
          onValueChange={(v) => setFilters(prev => ({ ...prev, tenant_id: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Todas organizações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas organizações</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.tenant_id} value={t.tenant_id}>
                {t.tenant?.name || 'Sem nome'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="canceled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium">Nenhuma fatura encontrada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajuste os filtros ou aguarde novas cobranças
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const daysStatus = getDaysStatus(invoice.due_date);
                  const statusInfo = statusLabels[invoice.status] || { label: invoice.status, variant: 'secondary' as const };

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.tenant?.name || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{invoice.tenant?.email || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.plan?.name || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{invoice.due_date ? format(parseISO(invoice.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
                          {daysStatus && invoice.status !== 'paid' && (
                            <p className={`text-xs ${daysStatus.color}`}>{daysStatus.text}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {invoice.billing_type === 'PIX' && 'PIX'}
                          {invoice.billing_type === 'BOLETO' && 'Boleto'}
                          {invoice.billing_type === 'CREDIT_CARD' && 'Cartão'}
                          {invoice.billing_type === 'UNDEFINED' && 'Múltiplo'}
                          {!invoice.billing_type && '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.gateway_invoice_url && (
                              <DropdownMenuItem onClick={() => window.open(invoice.gateway_invoice_url!, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir Link de Pagamento
                              </DropdownMenuItem>
                            )}
                            {/* PIX and Boleto actions will be available when Asaas provides these URLs */}
                            {invoice.status !== 'paid' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => resendInvoice.mutate(invoice.id)}
                                  disabled={resendInvoice.isPending}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Reenviar Cobrança
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setConfirmDialog({
                                    open: true,
                                    invoiceId: invoice.id,
                                    subscriptionId: invoice.tenant_subscription_id,
                                  })}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marcar como Pago
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Mark as Paid Dialog */}
      <Dialog open={!!confirmDialog?.open} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento Manual</DialogTitle>
            <DialogDescription>
              Ao marcar como pago, a assinatura será ativada automaticamente. 
              Use apenas se você já recebeu o pagamento por outros meios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (confirmDialog) {
                  markAsPaid.mutate({
                    invoiceId: confirmDialog.invoiceId,
                    subscriptionId: confirmDialog.subscriptionId,
                  });
                  setConfirmDialog(null);
                }
              }}
              disabled={markAsPaid.isPending}
            >
              {markAsPaid.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
