/**
 * PartnerTenants - List and manage partner's tenants
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartnerTenantsData } from '@/hooks/usePartnerData';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { PartnerTenantBillingActions } from '@/components/partner/PartnerTenantBillingActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  MoreHorizontal, 
  Search, 
  Building2, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Receipt,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { format, differenceInDays, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PartnerTenants() {
  const navigate = useNavigate();
  const { currentPartner } = usePartnerContext();
  const { tenants, isLoading, stats, updateStatus, refetch } = usePartnerTenantsData();
  const [search, setSearch] = useState('');

  const filteredTenants = tenants.filter(t =>
    t.tenant?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.tenant?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const canCreateMore = (currentPartner?.max_tenants || 0) > stats.total;

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatus.mutate({ id, status: newStatus });
  };

  // Helper to get trial status display
  const getTrialStatus = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null;
    const endDate = parseISO(trialEndsAt);
    const daysRemaining = differenceInDays(endDate, new Date());
    
    if (isPast(endDate)) {
      return { text: 'Expirado', variant: 'destructive' as const };
    }
    if (daysRemaining <= 3) {
      return { text: `${daysRemaining}d restante`, variant: 'secondary' as const, warning: true };
    }
    return { text: `${daysRemaining}d restante`, variant: 'outline' as const };
  };

  // Helper to get subscription status badge
  const getStatusBadge = (status: string, delinquencyStage?: string | null) => {
    if (delinquencyStage === 'full') {
      return { label: 'Bloqueado', variant: 'destructive' as const };
    }
    if (delinquencyStage === 'partial') {
      return { label: 'Bloqueio Parcial', variant: 'destructive' as const };
    }
    if (delinquencyStage === 'warning') {
      return { label: 'Aviso Enviado', variant: 'secondary' as const };
    }
    
    switch (status) {
      case 'active':
        return { label: 'Ativa', variant: 'default' as const };
      case 'trial':
        return { label: 'Teste', variant: 'secondary' as const };
      case 'past_due':
        return { label: 'Vencida', variant: 'destructive' as const };
      case 'expired':
        return { label: 'Expirada', variant: 'outline' as const };
      case 'canceled':
        return { label: 'Cancelada', variant: 'outline' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Organizações</h1>
          <p className="text-muted-foreground">
            Gerencie as organizações vinculadas ao seu parceiro
          </p>
        </div>
        <Button 
          onClick={() => navigate('/partner/tenants/create')}
          disabled={!canCreateMore}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Organização
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">
              {tenants.filter(t => t.subscription?.status === 'trial').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Limite Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(currentPartner?.max_tenants || 0) - stats.total}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar organização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium">Nenhuma organização encontrada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'Tente ajustar sua busca' : 'Crie sua primeira organização para começar'}
              </p>
              {!search && canCreateMore && (
                <Button className="mt-4" onClick={() => navigate('/partner/tenants/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Organização
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial/Vencimento</TableHead>
                  <TableHead>Ações Faturamento</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((pt) => {
                  const subscriptionStatus = pt.subscription?.status || pt.tenant?.subscription_status || 'pending';
                  const statusBadge = getStatusBadge(subscriptionStatus, pt.subscription?.delinquency_stage);
                  const trialStatus = pt.subscription?.status === 'trial' 
                    ? getTrialStatus(pt.subscription?.trial_ends_at || null)
                    : null;
                  
                  return (
                    <TableRow key={pt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pt.tenant?.name || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{pt.tenant?.email || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {pt.plan ? (
                          <Badge variant="outline">{pt.plan.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {trialStatus ? (
                          <div className="flex items-center gap-2">
                            {trialStatus.warning && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            <Badge variant={trialStatus.variant}>{trialStatus.text}</Badge>
                          </div>
                        ) : pt.subscription?.current_period_end ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(pt.subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pt.subscription?.id && pt.plan ? (
                          <PartnerTenantBillingActions
                            tenantId={pt.tenant_id}
                            tenantSubscriptionId={pt.subscription.id}
                            tenantName={pt.tenant?.name || 'Organização'}
                            planName={pt.plan.name}
                            planPrice={pt.plan.monthly_price}
                            subscriptionStatus={subscriptionStatus}
                            onSuccess={() => refetch()}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/partner/invoices?tenant=${pt.tenant_id}`)}
                            >
                              <Receipt className="h-4 w-4 mr-2" />
                              Ver Faturas
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {pt.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(pt.id, 'suspended')}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Suspender
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(pt.id, 'active')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Ativar
                              </DropdownMenuItem>
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
    </div>
  );
}
