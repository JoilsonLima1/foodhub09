import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useReconciliation } from '@/hooks/useOpsBackoffice';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OpsReconciliationPanel() {
  const { reconciliations, isLoading, runReconciliation } = useReconciliation();
  const [search, setSearch] = useState('');

  const filteredReconciliations = reconciliations.filter(rec => {
    return !search || 
      rec.provider_payment_id.toLowerCase().includes(search.toLowerCase()) ||
      rec.provider.toLowerCase().includes(search.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            Conciliado
          </Badge>
        );
      case 'mismatch':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Divergência
          </Badge>
        );
      case 'missing_internal':
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Falta Interno
          </Badge>
        );
      case 'missing_provider':
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Falta Provider
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const stats = {
    total: reconciliations.length,
    matched: reconciliations.filter(r => r.status === 'matched').length,
    mismatched: reconciliations.filter(r => r.status === 'mismatch').length,
    missing: reconciliations.filter(r => r.status.includes('missing')).length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Reconciliação Financeira
            </CardTitle>
            <CardDescription>
              Compare pagamentos do provider com registros internos
            </CardDescription>
          </div>
          <Button 
            onClick={() => runReconciliation.mutate({})}
            disabled={runReconciliation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${runReconciliation.isPending ? 'animate-spin' : ''}`} />
            Executar Reconciliação
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{stats.matched}</div>
              <p className="text-sm text-muted-foreground">Conciliados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.mismatched}</div>
              <p className="text-sm text-muted-foreground">Divergências</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-muted-foreground">{stats.missing}</div>
              <p className="text-sm text-muted-foreground">Faltantes</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID do pagamento ou provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>ID Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Provider</TableHead>
                <TableHead className="text-right">Valor Esperado</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead>Última Verificação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando reconciliações...
                  </TableCell>
                </TableRow>
              ) : filteredReconciliations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma reconciliação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredReconciliations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <Badge variant="outline">{rec.provider}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {rec.provider_payment_id}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(rec.provider_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(rec.expected_amount)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${rec.difference && rec.difference !== 0 ? 'text-destructive font-bold' : ''}`}>
                      {formatCurrency(rec.difference)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(rec.checked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
