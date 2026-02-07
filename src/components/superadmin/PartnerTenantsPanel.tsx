import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Store, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { usePartnerTenants } from '@/hooks/usePartners';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PartnerTenantsPanelProps {
  partnerId: string;
}

export function PartnerTenantsPanel({ partnerId }: PartnerTenantsPanelProps) {
  const { tenants, isLoading, updateTenantStatus } = usePartnerTenants(partnerId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Suspenso
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateTenantStatus.mutateAsync({ id, status });
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Lojas Vinculadas
        </CardTitle>
        <CardDescription>
          Lojas que operam sob este parceiro white-label
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma loja vinculada a este parceiro
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Plano do Parceiro</TableHead>
                <TableHead>Data de Adesão</TableHead>
                <TableHead>Próximo Faturamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.tenant?.name || 'Loja'}</p>
                      <p className="text-xs text-muted-foreground">{tenant.tenant_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.partner_plan_id ? (
                      <Badge variant="outline">Plano Personalizado</Badge>
                    ) : (
                      <span className="text-muted-foreground">Plano padrão</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(tenant.joined_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {tenant.next_billing_date
                      ? format(new Date(tenant.next_billing_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '—'}
                  </TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {tenant.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'active')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Ativar
                          </DropdownMenuItem>
                        )}
                        {tenant.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'suspended')}>
                            <Clock className="h-4 w-4 mr-2" />
                            Suspender
                          </DropdownMenuItem>
                        )}
                        {tenant.status !== 'cancelled' && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleStatusChange(tenant.id, 'cancelled')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
