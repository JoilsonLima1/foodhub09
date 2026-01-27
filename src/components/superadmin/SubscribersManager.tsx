import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Trash2, 
  Users, 
  DollarSign, 
  Clock, 
  MoreVertical,
  Pencil,
  Power,
  PowerOff,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSubscribers, Subscriber } from '@/hooks/useSubscribers';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  trialing: 'bg-blue-500',
  canceled: 'bg-red-500',
  past_due: 'bg-yellow-500',
  incomplete: 'bg-gray-500',
  inactive: 'bg-gray-400',
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Em Teste',
  canceled: 'Cancelado',
  past_due: 'Atrasado',
  incomplete: 'Incompleto',
  inactive: 'Inativo',
};

interface EditSubscriberDialogProps {
  subscriber: Subscriber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: { status: string; plan_id?: string }) => void;
  isLoading: boolean;
}

function EditSubscriberDialog({ subscriber, open, onOpenChange, onSave, isLoading }: EditSubscriberDialogProps) {
  const { plans } = useSubscriptionPlans();
  const [status, setStatus] = useState(subscriber?.status || 'active');
  const [planId, setPlanId] = useState(subscriber?.plan_id || '');

  const handleSave = () => {
    if (subscriber) {
      onSave(subscriber.id, { status, plan_id: planId || undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Assinatura</DialogTitle>
          <DialogDescription>
            Altere os detalhes da assinatura de {subscriber?.tenant?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={subscriber?.tenant?.name || ''} disabled />
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={subscriber?.tenant?.email || ''} disabled />
          </div>

          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - R$ {plan.monthly_price}/mês
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trialing">Em Teste</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
                <SelectItem value="past_due">Atrasado</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubscribersManager() {
  const { subscribers, isLoading, stats, updateSubscriber, deleteSubscriber } = useSubscribers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(true);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subscriberToEdit, setSubscriberToEdit] = useState<Subscriber | null>(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subscriberToDelete, setSubscriberToDelete] = useState<Subscriber | null>(null);

  const filteredSubscribers = subscribers?.filter(sub => {
    const matchesSearch = 
      sub.tenant?.name?.toLowerCase().includes(search.toLowerCase()) ||
      sub.tenant?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesActive = showInactive || sub.status !== 'inactive';
    return matchesSearch && matchesStatus && matchesActive;
  });

  const handleEdit = (subscriber: Subscriber) => {
    setSubscriberToEdit(subscriber);
    setEditDialogOpen(true);
  };

  const handleEditSave = (id: string, data: { status: string; plan_id?: string }) => {
    updateSubscriber.mutate({ id, status: data.status }, {
      onSuccess: () => setEditDialogOpen(false),
    });
  };

  const handleDeleteRequest = (subscriber: Subscriber) => {
    setSubscriberToDelete(subscriber);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (subscriberToDelete) {
      deleteSubscriber.mutate(subscriberToDelete.id);
      setSubscriberToDelete(null);
    }
  };

  const handleToggleActive = (subscriber: Subscriber) => {
    const newStatus = subscriber.status === 'inactive' ? 'active' : 'inactive';
    updateSubscriber.mutate({ id: subscriber.id, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assinantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Badge className="bg-green-500">{stats.active}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Teste</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trialing}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Assinantes</CardTitle>
          <CardDescription>Visualize e gerencie todas as assinaturas do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trialing">Em Teste</SelectItem>
                <SelectItem value="canceled">Cancelados</SelectItem>
                <SelectItem value="past_due">Atrasados</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive-subs"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive-subs" className="text-sm whitespace-nowrap">
                Mostrar inativos
              </Label>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Próx. Cobrança</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum assinante encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscribers?.map((sub) => (
                    <TableRow key={sub.id} className={sub.status === 'inactive' ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sub.status === 'inactive' && (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{sub.tenant?.name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{sub.tenant?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sub.subscription_plans?.name || 'Sem plano'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[sub.status] || 'bg-gray-500'}>
                          {statusLabels[sub.status] || sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.current_period_end 
                          ? format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {format(new Date(sub.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(sub)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(sub)}>
                              {sub.status === 'inactive' ? (
                                <>
                                  <Power className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              ) : (
                                <>
                                  <PowerOff className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRequest(sub)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditSubscriberDialog
        subscriber={subscriberToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditSave}
        isLoading={updateSubscriber.isPending}
      />

      <PasswordConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Excluir Assinatura"
        description={`Você está prestes a excluir a assinatura de "${subscriberToDelete?.tenant?.name}". Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Assinatura"
        isLoading={deleteSubscriber.isPending}
      />
    </div>
  );
}
