/**
 * TenantBilling - Tenant billing management page (Phase 11)
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantBilling } from '@/hooks/useTenantBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, FileText, AlertCircle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

export default function TenantBilling() {
  const { tenantId } = useAuth();
  const { summary, invoices, isLoading, updateBillingProfile, profile, subscription, plan } = useTenantBilling();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState({
    billing_name: '',
    billing_email: '',
    billing_phone: '',
    billing_doc: '',
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Ativo' },
      trial: { variant: 'secondary', label: 'Trial' },
      past_due: { variant: 'destructive', label: 'Atrasado' },
      suspended: { variant: 'destructive', label: 'Suspenso' },
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

  const handleEditProfile = () => {
    setFormData({
      billing_name: profile?.billing_name || '',
      billing_email: profile?.billing_email || '',
      billing_phone: profile?.billing_phone || '',
      billing_doc: profile?.billing_doc || '',
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    updateBillingProfile.mutate(formData, {
      onSuccess: () => setIsEditingProfile(false),
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Faturamento</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Assinatura
            </CardTitle>
            <CardDescription>Status da sua assinatura atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(subscription.status)}
                </div>
                {plan && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plano</span>
                    <span className="font-medium">{plan.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor Mensal</span>
                  <span className="font-medium">
                    {formatCurrency(subscription.monthly_amount || plan?.monthly_price || 0)}
                  </span>
                </div>
                {subscription.trial_ends_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trial até</span>
                    <span>{format(new Date(subscription.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                )}
                {subscription.current_period_end && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Próxima renovação</span>
                    <span>{format(new Date(subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma assinatura ativa</p>
            )}
          </CardContent>
        </Card>

        {/* Billing Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados de Cobrança
              </div>
              <Button variant="outline" size="sm" onClick={handleEditProfile}>
                Editar
              </Button>
            </CardTitle>
            <CardDescription>Informações para emissão de faturas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span>{profile?.billing_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{profile?.billing_email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefone</span>
              <span>{profile?.billing_phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CPF/CNPJ</span>
              <span>{profile?.billing_doc || '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
          <CardDescription>Suas últimas faturas e seus status</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {invoice.period_start && invoice.period_end
                        ? `${format(new Date(invoice.period_start), 'dd/MM')} - ${format(new Date(invoice.period_end), 'dd/MM/yyyy')}`
                        : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      {invoice.provider_payment_url && invoice.status !== 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoice.provider_payment_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                      {invoice.status === 'paid' && (
                        <CheckCircle className="h-5 w-5 text-green-500 inline" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhuma fatura encontrada</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Dados de Cobrança</DialogTitle>
            <DialogDescription>Atualize suas informações para emissão de faturas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="billing_name">Nome/Razão Social</Label>
              <Input
                id="billing_name"
                value={formData.billing_name}
                onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_email">Email</Label>
              <Input
                id="billing_email"
                type="email"
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_phone">Telefone</Label>
              <Input
                id="billing_phone"
                value={formData.billing_phone}
                onChange={(e) => setFormData({ ...formData, billing_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_doc">CPF/CNPJ</Label>
              <Input
                id="billing_doc"
                value={formData.billing_doc}
                onChange={(e) => setFormData({ ...formData, billing_doc: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateBillingProfile.isPending}>
              {updateBillingProfile.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
