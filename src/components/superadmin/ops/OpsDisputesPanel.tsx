import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Gavel, Search, Eye, History, AlertTriangle } from 'lucide-react';
import { useDisputes, type Dispute, type DisputeTimeline } from '@/hooks/useOpsBackoffice';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';

export function OpsDisputesPanel() {
  const { disputes, isLoading, getDisputeTimeline, updateDisputeStatus } = useDisputes();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState('');

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = !search || 
      dispute.provider_payment_id.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    const matchesType = typeFilter === 'all' || dispute.dispute_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const { data: timeline } = useQuery({
    queryKey: ['dispute-timeline', selectedDispute?.id],
    queryFn: () => selectedDispute ? getDisputeTimeline(selectedDispute.id) : Promise.resolve([]),
    enabled: !!selectedDispute,
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'chargeback':
        return <Badge variant="destructive">Chargeback</Badge>;
      case 'refund':
        return <Badge variant="secondary">Estorno</Badge>;
      case 'partial_refund':
        return <Badge variant="secondary">Estorno Parcial</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'opened':
        return <Badge variant="destructive">Aberto</Badge>;
      case 'under_review':
        return <Badge variant="secondary">Em Análise</Badge>;
      case 'evidence_requested':
        return <Badge variant="secondary">Evidência Solicitada</Badge>;
      case 'won':
        return <Badge variant="default">Ganho</Badge>;
      case 'lost':
        return <Badge variant="destructive">Perdido</Badge>;
      case 'closed':
        return <Badge variant="outline">Encerrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleUpdateStatus = () => {
    if (selectedDispute && newStatus) {
      updateDisputeStatus.mutate({
        disputeId: selectedDispute.id,
        newStatus,
        notes: notes || undefined,
      });
      setSelectedDispute(null);
      setNewStatus('');
      setNotes('');
    }
  };

  const stats = {
    total: disputes.length,
    opened: disputes.filter(d => d.status === 'opened').length,
    underReview: disputes.filter(d => d.status === 'under_review').length,
    resolved: disputes.filter(d => ['won', 'lost', 'closed'].includes(d.status)).length,
    totalAmount: disputes.reduce((sum, d) => sum + (d.amount || 0), 0),
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Disputas (Chargebacks e Estornos)
              </CardTitle>
              <CardDescription>
                Gerencie disputas e acompanhe o status de contestações
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg">
              {stats.opened} abertas
            </Badge>
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
                <div className="text-2xl font-bold text-destructive">{stats.opened}</div>
                <p className="text-sm text-muted-foreground">Abertas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-muted-foreground">{stats.underReview}</div>
                <p className="text-sm text-muted-foreground">Em Análise</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </CardContent>
            </Card>
          </div>

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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="chargeback">Chargeback</SelectItem>
                <SelectItem value="refund">Estorno</SelectItem>
                <SelectItem value="partial_refund">Estorno Parcial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="opened">Aberto</SelectItem>
                <SelectItem value="under_review">Em Análise</SelectItem>
                <SelectItem value="evidence_requested">Evidência Solicitada</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
                <SelectItem value="closed">Encerrado</SelectItem>
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
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aberto em</TableHead>
                  <TableHead>Prazo Evidência</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Carregando disputas...
                    </TableCell>
                  </TableRow>
                ) : filteredDisputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma disputa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell>{getTypeBadge(dispute.dispute_type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{dispute.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {dispute.provider_payment_id}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(dispute.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(dispute.opened_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {dispute.evidence_deadline_at ? (
                          <span className="text-sm flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(dispute.evidence_deadline_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDispute(dispute)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Detalhes da Disputa
            </DialogTitle>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <div className="mt-1">{getTypeBadge(selectedDispute.dispute_type)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedDispute.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor</label>
                  <div className="mt-1 font-mono">{formatCurrency(selectedDispute.amount)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Pagamento</label>
                  <div className="mt-1">
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {selectedDispute.provider_payment_id}
                    </code>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedDispute.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notas</label>
                  <p className="mt-1 text-sm">{selectedDispute.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </label>
                <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                  {timeline?.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 text-sm border-l-2 pl-3 py-1">
                      <span className="text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                      <span className="font-medium capitalize">{entry.action.replace('_', ' ')}</span>
                      {entry.new_status && (
                        <span>→ {entry.new_status}</span>
                      )}
                    </div>
                  )) || <p className="text-muted-foreground">Carregando...</p>}
                </div>
              </div>

              {/* Update Status */}
              {!['won', 'lost', 'closed'].includes(selectedDispute.status) && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium">Atualizar Status</label>
                  <div className="flex gap-2 mt-2">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Novo status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_review">Em Análise</SelectItem>
                        <SelectItem value="evidence_requested">Evidência Solicitada</SelectItem>
                        <SelectItem value="won">Ganho</SelectItem>
                        <SelectItem value="lost">Perdido</SelectItem>
                        <SelectItem value="closed">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Notas (opcional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Fechar
            </Button>
            {selectedDispute && !['won', 'lost', 'closed'].includes(selectedDispute.status) && newStatus && (
              <Button onClick={handleUpdateStatus} disabled={updateDisputeStatus.isPending}>
                Atualizar Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
