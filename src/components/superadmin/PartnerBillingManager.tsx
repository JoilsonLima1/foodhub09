/**
 * PartnerBillingManager - Super Admin UI for partner AR billing, invoices & dunning
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, DollarSign, AlertTriangle, FileText, History } from 'lucide-react';
import { format } from 'date-fns';
import {
  useAllPartnerBillingConfigs,
  usePartnerArInvoices,
  usePartnerDunningLog,
  usePartnerDunningStatus,
  type PartnerBillingConfig,
  type PartnerArInvoice,
} from '@/hooks/usePartnerBillingConfig';

export function PartnerBillingManager() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | undefined>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Cobrança de Parceiros (AR)
        </h2>
        <p className="text-muted-foreground">
          Gerencie faturas, crédito e dunning dos parceiros
        </p>
      </div>

      <Tabs defaultValue="configs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configs">Configurações</TabsTrigger>
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="dunning">Dunning Log</TabsTrigger>
        </TabsList>

        <TabsContent value="configs">
          <BillingConfigsTab onSelectPartner={setSelectedPartnerId} />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab partnerId={selectedPartnerId} />
        </TabsContent>
        <TabsContent value="dunning">
          <DunningTab partnerId={selectedPartnerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BillingConfigsTab({ onSelectPartner }: { onSelectPartner: (id: string) => void }) {
  const { configs, isLoading, upsertConfig } = useAllPartnerBillingConfigs();
  const [editingConfig, setEditingConfig] = useState<Partial<PartnerBillingConfig> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSave = () => {
    if (!editingConfig?.partner_id) return;
    upsertConfig.mutate(editingConfig as PartnerBillingConfig);
    setIsDialogOpen(false);
    setEditingConfig(null);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mb-4" />
            <p>Nenhuma configuração de cobrança criada.</p>
            <p className="text-sm">Configure cobrança na aba Políticas Parceiros → Cobrança.</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parceiro</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Limite Crédito</TableHead>
              <TableHead>Carência</TableHead>
              <TableHead>Nível Dunning</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.partner?.name}</TableCell>
                <TableCell><Badge variant="outline">{c.collection_mode}</Badge></TableCell>
                <TableCell>R$ {c.credit_limit.toFixed(2)}</TableCell>
                <TableCell>{c.grace_days} dias</TableCell>
                <TableCell>
                  <DunningLevelBadge level={c.current_dunning_level} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditingConfig(c); setIsDialogOpen(true); }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onSelectPartner(c.partner_id)}>
                      Ver Faturas
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Config de Cobrança</DialogTitle>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Modo de Cobrança</Label>
                <Select value={editingConfig.collection_mode || 'INVOICE'} onValueChange={v => setEditingConfig({ ...editingConfig, collection_mode: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVOICE">Fatura</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CARD">Cartão</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Limite de Crédito (R$)</Label>
                  <Input type="number" step="0.01" value={editingConfig.credit_limit ?? 0} onChange={e => setEditingConfig({ ...editingConfig, credit_limit: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Dias de Carência</Label>
                  <Input type="number" value={editingConfig.grace_days ?? 5} onChange={e => setEditingConfig({ ...editingConfig, grace_days: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={editingConfig.notes || ''} onChange={e => setEditingConfig({ ...editingConfig, notes: e.target.value })} />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={upsertConfig.isPending}>
                {upsertConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoicesTab({ partnerId }: { partnerId?: string }) {
  const { invoices, isLoading, createInvoice, updateInvoice } = usePartnerArInvoices(partnerId);
  const [isCreating, setIsCreating] = useState(false);
  const [newInvoice, setNewInvoice] = useState<Partial<PartnerArInvoice>>({});

  const handleCreate = () => {
    if (!newInvoice.partner_id || !newInvoice.amount || !newInvoice.due_date || !newInvoice.invoice_number) return;
    createInvoice.mutate(newInvoice);
    setIsCreating(false);
    setNewInvoice({});
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    canceled: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {partnerId ? `Faturas do parceiro selecionado` : 'Todas as faturas'}
        </p>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova Fatura</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Fatura AR</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nº da Fatura</Label>
                <Input value={newInvoice.invoice_number || ''} onChange={e => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })} placeholder="AR-2026-001" />
              </div>
              {!partnerId && (
                <div className="space-y-2">
                  <Label>Partner ID</Label>
                  <Input value={newInvoice.partner_id || ''} onChange={e => setNewInvoice({ ...newInvoice, partner_id: e.target.value })} />
                </div>
              )}
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={newInvoice.amount ?? ''} onChange={e => setNewInvoice({ ...newInvoice, amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input type="date" value={newInvoice.due_date || ''} onChange={e => setNewInvoice({ ...newInvoice, due_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={newInvoice.description || ''} onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })} />
              </div>
              <Button onClick={() => { if (partnerId) setNewInvoice(prev => ({ ...prev, partner_id: partnerId })); handleCreate(); }} className="w-full" disabled={createInvoice.isPending}>
                Criar Fatura
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <p>Nenhuma fatura encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                <TableCell>{inv.partner?.name || inv.partner_id.slice(0, 8)}</TableCell>
                <TableCell>R$ {inv.amount.toFixed(2)}</TableCell>
                <TableCell>{format(new Date(inv.due_date), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  <Badge className={statusColors[inv.status] || ''} variant="outline">
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {inv.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => updateInvoice.mutate({ id: inv.id, status: 'paid', paid_at: new Date().toISOString() } as any)}>
                        Marcar Pago
                      </Button>
                    )}
                    {inv.status === 'overdue' && (
                      <Button size="sm" variant="outline" onClick={() => updateInvoice.mutate({ id: inv.id, status: 'paid', paid_at: new Date().toISOString() } as any)}>
                        Marcar Pago
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function DunningTab({ partnerId }: { partnerId?: string }) {
  const { logs, isLoading } = usePartnerDunningLog(partnerId);
  const { data: dunningStatus } = usePartnerDunningStatus(partnerId);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {dunningStatus?.has_config && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Status de Dunning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Nível Atual</p>
                <DunningLevelBadge level={dunningStatus.current_level} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nível Sugerido</p>
                <DunningLevelBadge level={dunningStatus.suggested_level} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor em Atraso</p>
                <p className="font-bold text-destructive">R$ {dunningStatus.overdue_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturas Atrasadas</p>
                <p className="font-bold">{dunningStatus.overdue_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mb-4" />
            <p>Nenhum registro de dunning.</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{format(new Date(log.executed_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell><DunningLevelBadge level={log.dunning_level} /></TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function DunningLevelBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    0: 'bg-green-100 text-green-800',
    1: 'bg-yellow-100 text-yellow-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-red-100 text-red-800',
    4: 'bg-red-200 text-red-900',
  };
  const labels: Record<number, string> = {
    0: 'OK',
    1: 'L1 - Aviso',
    2: 'L2 - Bloqueio Parcial',
    3: 'L3 - Bloqueio Planos',
    4: 'L4 - Suspensão',
  };
  return (
    <Badge className={colors[level] || colors[0]} variant="outline">
      {labels[level] || `L${level}`}
    </Badge>
  );
}
