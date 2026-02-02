import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Eye, QrCode, Users, Receipt, Clock } from 'lucide-react';
import { useComandas, useOpenComanda, useUpdateComandaStatus, useCloseComanda } from '@/hooks/useComandas';
import { useTables } from '@/hooks/useTables';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { COMANDA_STATUS_LABELS, type ComandaStatus } from '@/types/digitalService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function ComandasManager() {
  const [statusFilter, setStatusFilter] = useState<ComandaStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>('');

  const { data: comandas, isLoading } = useComandas(
    statusFilter === 'all' ? undefined : statusFilter
  );
  const { tables } = useTables();
  const openComanda = useOpenComanda();
  const closeComanda = useCloseComanda();

  const filteredComandas = comandas?.filter((c) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      c.comanda_number.toString().includes(search) ||
      c.titular_customer?.full_name?.toLowerCase().includes(search) ||
      c.titular_customer?.phone?.includes(search)
    );
  });

  const handleOpenComanda = () => {
    openComanda.mutate(
      { tableId: selectedTableId || undefined },
      {
        onSuccess: () => {
          setIsOpenDialogOpen(false);
          setSelectedTableId('');
        },
      }
    );
  };

  const getStatusBadgeVariant = (status: ComandaStatus) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'pending_payment':
        return 'secondary';
      case 'paid':
        return 'outline';
      case 'closed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comandas</h2>
          <p className="text-muted-foreground">
            Gerencie as comandas abertas e o atendimento
          </p>
        </div>

        <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Comanda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir Nova Comanda</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mesa (opcional)</Label>
                <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma mesa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem mesa (balcão)</SelectItem>
                    {tables?.filter(t => t.is_active).map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        Mesa {table.number} - {table.name || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleOpenComanda}
                disabled={openComanda.isPending}
                className="w-full"
              >
                {openComanda.isPending ? 'Abrindo...' : 'Abrir Comanda'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ComandaStatus | 'all')}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="open">Abertas</SelectItem>
            <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
            <SelectItem value="closed">Fechadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Abertas</p>
                <p className="text-2xl font-bold">
                  {comandas?.filter((c) => c.status === 'open').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando</p>
                <p className="text-2xl font-bold">
                  {comandas?.filter((c) => c.status === 'pending_payment').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                <p className="text-2xl font-bold">
                  {comandas?.filter((c) => c.status === 'open').reduce((sum, c) => sum + (c.expected_guests || 1), 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hoje</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    comandas?.filter((c) => c.status === 'paid' || c.status === 'closed')
                      .reduce((sum, c) => sum + c.total, 0) || 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comandas Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !filteredComandas?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma comanda encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Mesa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pessoas</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pendente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aberta em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComandas.map((comanda) => (
                  <TableRow key={comanda.id}>
                    <TableCell className="font-mono font-bold">
                      #{comanda.comanda_number}
                    </TableCell>
                    <TableCell>
                      {comanda.table ? `Mesa ${comanda.table.number}` : 'Balcão'}
                    </TableCell>
                    <TableCell>
                      {comanda.titular_customer?.full_name || 'Anônimo'}
                    </TableCell>
                    <TableCell>{comanda.expected_guests || 1}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(comanda.total)}
                    </TableCell>
                    <TableCell className={comanda.pending_amount > 0 ? 'text-destructive font-medium' : ''}>
                      {formatCurrency(comanda.pending_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(comanda.status)}>
                        {COMANDA_STATUS_LABELS[comanda.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(comanda.opened_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <QrCode className="h-4 w-4" />
                        </Button>
                        {comanda.status === 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => closeComanda.mutate(comanda.id)}
                            disabled={closeComanda.isPending}
                          >
                            Fechar
                          </Button>
                        )}
                      </div>
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
