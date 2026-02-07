/**
 * PartnerTenantBillingPage - Partner tenant billing management (Phase 11)
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePartnerTenantBilling } from '@/hooks/usePartnerTenantBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertTriangle, 
  CheckCircle, 
  CreditCard, 
  ExternalLink, 
  RefreshCw, 
  Users,
  Loader2 
} from 'lucide-react';

export default function PartnerTenantBillingPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { 
    tenantsBilling, 
    isLoading, 
    tenantInvoices, 
    invoicesLoading,
    applyDunning,
    reactivateTenant 
  } = usePartnerTenantBilling(tenantId);

  const [selectedTenant, setSelectedTenant] = useState<string | null>(tenantId || null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Ativo' },
      trial: { variant: 'secondary', label: 'Trial' },
      past_due: { variant: 'destructive', label: 'Atrasado' },
      suspended: { variant: 'destructive', label: 'Suspenso' },
      blocked: { variant: 'destructive', label: 'Bloqueado' },
      canceled: { variant: 'outline', label: 'Cancelado' },
      pending: { variant: 'secondary', label: 'Pendente' },
      paid: { variant: 'default', label: 'Pago' },
      overdue: { variant: 'destructive', label: 'Vencido' },
      refunded: { variant: 'outline', label: 'Reembolsado' },
      chargeback: { variant: 'destructive', label: 'Chargeback' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const overdueCount = tenantsBilling.filter((t) => t.overdue_invoices > 0).length;
  const totalOverdue = tenantsBilling.reduce((sum, t) => sum + t.total_overdue, 0);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const currentTenant = tenantsBilling.find((t) => t.tenant_id === selectedTenant);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Faturamento dos Tenants</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{tenantsBilling.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com Faturas Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{overdueCount}</span>
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
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{formatCurrency(totalOverdue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Tenants</TabsTrigger>
          {selectedTenant && <TabsTrigger value="detail">Detalhes</TabsTrigger>}
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Tenants e Status de Cobrança</CardTitle>
              <CardDescription>Visão geral do faturamento de cada estabelecimento</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Próxima Renovação</TableHead>
                    <TableHead>Faturas Atrasadas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantsBilling.map((tenant) => (
                    <TableRow key={tenant.tenant_id}>
                      <TableCell className="font-medium">{tenant.tenant_name}</TableCell>
                      <TableCell>{tenant.plan_name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(tenant.subscription_status)}</TableCell>
                      <TableCell>{formatCurrency(tenant.monthly_amount)}</TableCell>
                      <TableCell>
                        {tenant.current_period_end
                          ? format(new Date(tenant.current_period_end), 'dd/MM/yyyy', { locale: ptBR })
                          : tenant.trial_ends_at
                          ? `Trial: ${format(new Date(tenant.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {tenant.overdue_invoices > 0 ? (
                          <Badge variant="destructive">
                            {tenant.overdue_invoices} ({formatCurrency(tenant.total_overdue)})
                          </Badge>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTenant(tenant.tenant_id)}
                        >
                          Ver
                        </Button>
                        {tenant.subscription_status === 'suspended' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reactivateTenant.mutate(tenant.tenant_id)}
                            disabled={reactivateTenant.isPending}
                          >
                            {reactivateTenant.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Reativar'
                            )}
                          </Button>
                        )}
                        {tenant.overdue_invoices > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyDunning.mutate(tenant.tenant_id)}
                            disabled={applyDunning.isPending}
                          >
                            {applyDunning.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Aplicar Dunning'
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          {currentTenant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{currentTenant.tenant_name}</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedTenant(null)}>
                    Voltar
                  </Button>
                </CardTitle>
                <CardDescription>Faturas e histórico de cobrança</CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <Skeleton className="h-48" />
                ) : tenantInvoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantInvoices.map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            {invoice.period_start && invoice.period_end
                              ? `${format(new Date(invoice.period_start), 'dd/MM')} - ${format(new Date(invoice.period_end), 'dd/MM/yyyy')}`
                              : '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                          <TableCell>
                            {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            {invoice.provider_payment_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.provider_payment_url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma fatura encontrada para este tenant
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
