import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useAddonModules,
  useTenantAddonSubscriptions,
  AddonSubscriptionStatus,
  ADDON_STATUS_LABELS,
  ADDON_CATEGORY_LABELS,
} from '@/hooks/useAddonModules';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Trash2, 
  Loader2,
  Search,
  Package,
  Building2,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Hook to fetch all tenants for super admin
function useTenants() {
  return useQuery({
    queryKey: ['all-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });
}

export function TenantAddonsManager() {
  const { modules, isLoading: modulesLoading } = useAddonModules();
  const { subscriptions, isLoading: subsLoading, assignModule, updateSubscription, removeSubscription } = useTenantAddonSubscriptions();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<AddonSubscriptionStatus>('active');
  const [trialDays, setTrialDays] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const isLoading = modulesLoading || subsLoading || tenantsLoading;

  const handleAssignModule = async () => {
    if (!selectedTenantId || !selectedModuleId) return;

    const trialEndsAt = trialDays > 0 
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    await assignModule.mutateAsync({
      tenant_id: selectedTenantId,
      addon_module_id: selectedModuleId,
      status: trialDays > 0 ? 'trial' : selectedStatus,
      trial_ends_at: trialEndsAt,
      notes: notes || undefined,
    });

    setIsDialogOpen(false);
    setSelectedTenantId('');
    setSelectedModuleId('');
    setTrialDays(0);
    setNotes('');
  };

  const handleRemove = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este módulo do tenant?')) {
      await removeSubscription.mutateAsync(id);
    }
  };

  const handleStatusChange = async (id: string, newStatus: AddonSubscriptionStatus) => {
    await updateSubscription.mutateAsync({ id, status: newStatus });
  };

  const filteredSubscriptions = subscriptions?.filter(sub => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      sub.tenant?.name?.toLowerCase().includes(search) ||
      sub.addon_module?.name?.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Módulos por Tenant</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os módulos atribuídos a cada organização
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Atribuir Módulo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Módulo a Tenant</DialogTitle>
              <DialogDescription>
                Selecione o tenant e o módulo a ser atribuído.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{tenant.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Módulo</Label>
                <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules?.filter(m => m.is_active).map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{module.name}</span>
                          <span className="text-muted-foreground text-xs">
                            R$ {module.monthly_price.toFixed(2)}/mês
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status Inicial</Label>
                  <Select 
                    value={selectedStatus} 
                    onValueChange={(v: AddonSubscriptionStatus) => setSelectedStatus(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="trial">Período de Teste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dias de Teste (0 = sem trial)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={trialDays}
                    onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas sobre esta atribuição..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAssignModule}
                disabled={!selectedTenantId || !selectedModuleId || assignModule.isPending}
              >
                {assignModule.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Atribuir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tenant ou módulo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assinaturas de Módulos</CardTitle>
          <CardDescription>
            {filteredSubscriptions?.length || 0} assinaturas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Expiração</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma assinatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions?.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{sub.tenant?.name || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{sub.addon_module?.name || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.addon_module?.category && (
                        <Badge variant="outline">
                          {ADDON_CATEGORY_LABELS[sub.addon_module.category]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={sub.status}
                        onValueChange={(v: AddonSubscriptionStatus) => handleStatusChange(sub.id, v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ADDON_STATUS_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(sub.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.trial_ends_at && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Trial: </span>
                          {format(new Date(sub.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      )}
                      {sub.expires_at && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Expira: </span>
                          {format(new Date(sub.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      )}
                      {!sub.trial_ends_at && !sub.expires_at && (
                        <span className="text-sm text-muted-foreground">Sem expiração</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(sub.id)}
                        disabled={removeSubscription.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
