import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Upload,
  Loader2,
} from 'lucide-react';
import { useIFoodMenuSync, type MenuMapping } from '@/hooks/useIFoodMenuSync';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function IFoodMenuSyncPanel() {
  const {
    menuMappings,
    syncStats,
    isLoading,
    isSyncing,
    syncAllProducts,
    syncSingleProduct,
    updateAvailability,
    refetch,
  } = useIFoodMenuSync();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredMappings = menuMappings.filter((mapping) => {
    const matchesSearch = mapping.product?.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = !filterStatus || mapping.sync_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-500">Sincronizado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sincronização de Cardápio</CardTitle>
            <CardDescription>
              Gerencie os produtos sincronizados com o iFood
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => syncAllProducts.mutate()}
              disabled={isSyncing || syncAllProducts.isPending}
            >
              {syncAllProducts.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Sincronizar Tudo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{syncStats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <p className="text-2xl font-bold text-green-500">{syncStats.synced}</p>
            <p className="text-xs text-muted-foreground">Sincronizados</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
            <p className="text-2xl font-bold text-yellow-500">{syncStats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 text-center">
            <p className="text-2xl font-bold text-red-500">{syncStats.error}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(null)}
            >
              Todos
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
            >
              Pendentes
            </Button>
            <Button
              variant={filterStatus === 'error' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('error')}
            >
              Erros
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Última Sync</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? 'Nenhum produto encontrado'
                        : 'Nenhum produto cadastrado para sincronização'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {mapping.product?.image_url && (
                          <img
                            src={mapping.product.image_url}
                            alt={mapping.product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{mapping.product?.name}</p>
                          {mapping.ifood_item_id && (
                            <p className="text-xs text-muted-foreground font-mono">
                              ID: {mapping.ifood_item_id.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(mapping.product?.category as { name: string } | null)?.name || 'Sem categoria'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(mapping.product?.base_price || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(mapping.sync_status)}
                    </TableCell>
                    <TableCell>
                      {mapping.last_synced_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(mapping.last_synced_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => syncSingleProduct.mutate(mapping.product_id)}
                        disabled={syncSingleProduct.isPending}
                      >
                        {syncSingleProduct.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground">
          A sincronização envia os dados dos produtos para o iFood. Para que os produtos apareçam
          no cardápio do iFood, é necessário também configurar no Portal do Parceiro iFood.
        </p>
      </CardContent>
    </Card>
  );
}
