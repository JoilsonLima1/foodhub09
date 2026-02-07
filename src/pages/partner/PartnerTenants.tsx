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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Plus, MoreHorizontal, Search, Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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
      <div className="grid gap-4 md:grid-cols-3">
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
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
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
                  <TableHead>Status Assinatura</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Ações Faturamento</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((pt) => {
                  const subscriptionStatus = pt.subscription?.status || pt.tenant?.subscription_status || 'pending';
                  
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
                        <Badge variant={subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                          {subscriptionStatus === 'active' ? 'Ativa' : 
                           subscriptionStatus === 'trial' ? 'Teste' :
                           subscriptionStatus === 'past_due' ? 'Vencida' :
                           subscriptionStatus === 'expired' ? 'Expirada' :
                           subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {pt.joined_at 
                          ? format(new Date(pt.joined_at), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
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
