import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lightbulb, Search, Play, X, RefreshCw, Wand2 } from 'lucide-react';
import { useOpsRecommendations } from '@/hooks/useOpsBackoffice';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function OpsRecommendationsPanel() {
  const { 
    recommendations, 
    isLoading, 
    applyRecommendation, 
    dismissRecommendation,
    generateRecommendations 
  } = useOpsRecommendations();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [confirmApply, setConfirmApply] = useState<string | null>(null);

  const filteredRecommendations = recommendations.filter(rec => {
    const matchesSearch = !search || 
      rec.provider_payment_id?.toLowerCase().includes(search.toLowerCase()) ||
      rec.type.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'missing_event':
        return <Badge variant="destructive">Evento Faltante</Badge>;
      case 'mismatch_amount':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Divergência</Badge>;
      case 'orphan_payment':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pagamento Órfão</Badge>;
      case 'duplicate_suspected':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Duplicidade</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'reprocess':
        return <Badge variant="default">Reprocessar</Badge>;
      case 'insert_synthetic_event':
        return <Badge variant="secondary">Evento Sintético</Badge>;
      case 'manual_review':
        return <Badge variant="outline">Revisão Manual</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Aberto</Badge>;
      case 'applied':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aplicado</Badge>;
      case 'dismissed':
        return <Badge variant="outline">Descartado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApply = (id: string) => {
    setConfirmApply(id);
  };

  const confirmApplyAction = () => {
    if (confirmApply) {
      applyRecommendation.mutate(confirmApply);
      setConfirmApply(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Recomendações Operacionais
              </CardTitle>
              <CardDescription>
                Sugestões de correções identificadas pelo sistema
              </CardDescription>
            </div>
            <Button 
              onClick={() => generateRecommendations.mutate()}
              disabled={generateRecommendations.isPending}
              variant="outline"
            >
              <Wand2 className={`h-4 w-4 mr-2 ${generateRecommendations.isPending ? 'animate-spin' : ''}`} />
              Gerar Recomendações
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID do pagamento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="applied">Aplicados</SelectItem>
                <SelectItem value="dismissed">Descartados</SelectItem>
                <SelectItem value="failed">Falharam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>ID Pagamento</TableHead>
                  <TableHead>Ação Sugerida</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando recomendações...
                    </TableCell>
                  </TableRow>
                ) : filteredRecommendations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma recomendação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecommendations.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{getTypeBadge(rec.type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rec.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {rec.provider_payment_id || '-'}
                        </code>
                      </TableCell>
                      <TableCell>{getActionBadge(rec.suggested_action)}</TableCell>
                      <TableCell>{getStatusBadge(rec.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(rec.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {rec.status === 'open' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApply(rec.id)}
                              disabled={applyRecommendation.isPending}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Aplicar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissRecommendation.mutate(rec.id)}
                              disabled={dismissRecommendation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {rec.status === 'failed' && rec.error_message && (
                          <span className="text-xs text-red-600" title={rec.error_message}>
                            Erro: {rec.error_message.substring(0, 30)}...
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmApply} onOpenChange={() => setConfirmApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aplicação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação executará a recomendação sugerida. Dependendo do tipo, pode:
              <ul className="list-disc list-inside mt-2">
                <li>Reprocessar um evento de pagamento</li>
                <li>Criar um evento sintético para correção</li>
                <li>Marcar como revisado manualmente</li>
              </ul>
              <p className="mt-2 font-medium">Esta ação é idempotente e segura.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyAction}>
              Aplicar Recomendação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
