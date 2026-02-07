import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Building2, Ban, Check } from 'lucide-react';
import { usePlatformFees } from '@/hooks/usePlatformFees';
import { useSubscribers } from '@/hooks/useSubscribers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TenantOverridesTabProps {
  overrides: any[] | undefined;
}

export function TenantOverridesTab({ overrides }: TenantOverridesTabProps) {
  const { createOverride, updateOverride, deleteOverride } = usePlatformFees();
  const { subscribers } = useSubscribers();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    tenant_id: '',
    enabled: true,
    override_percent: '',
    override_fixed: '',
    notes: '',
  });

  const handleOpenCreate = () => {
    setEditingOverride(null);
    setFormData({
      tenant_id: '',
      enabled: true,
      override_percent: '',
      override_fixed: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (override: any) => {
    setEditingOverride(override);
    setFormData({
      tenant_id: override.tenant_id,
      enabled: override.enabled ?? true,
      override_percent: override.override_percent?.toString() || '',
      override_fixed: override.override_fixed?.toString() || '',
      notes: override.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleToggleEnabled = async (override: any) => {
    await updateOverride.mutateAsync({
      id: override.id,
      enabled: !override.enabled,
    });
  };

  const handleSubmit = async () => {
    const payload = {
      tenant_id: formData.tenant_id,
      enabled: formData.enabled,
      override_percent: formData.override_percent ? parseFloat(formData.override_percent) : undefined,
      override_fixed: formData.override_fixed ? parseFloat(formData.override_fixed) : undefined,
      notes: formData.notes || undefined,
    };

    if (editingOverride) {
      await updateOverride.mutateAsync({
        id: editingOverride.id,
        ...payload,
      });
    } else {
      await createOverride.mutateAsync(payload);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este override?')) {
      await deleteOverride.mutateAsync(id);
    }
  };

  // Filter out tenants that already have overrides
  const availableTenants = subscribers?.filter(
    (sub) => !overrides?.some((o) => o.tenant_id === sub.tenant_id)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Configurações por Loja
            </CardTitle>
            <CardDescription>
              Desative a monetização ou configure taxas personalizadas para lojas específicas
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Override
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingOverride ? 'Editar Configuração' : 'Nova Configuração de Loja'}
                </DialogTitle>
                <DialogDescription>
                  Configure taxas personalizadas ou desative a monetização para uma loja específica
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {!editingOverride && (
                  <div className="space-y-2">
                    <Label>Loja (Tenant)</Label>
                    <Select
                      value={formData.tenant_id}
                      onValueChange={(v) => setFormData({ ...formData, tenant_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma loja" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTenants?.map((sub) => (
                          <SelectItem key={sub.tenant_id} value={sub.tenant_id}>
                            {sub.tenant?.name || sub.tenant?.email || sub.tenant_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Cobrar Monetização</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.enabled
                        ? 'Taxas serão cobradas desta loja'
                        : 'Loja isenta de taxas (acordo especial)'}
                    </p>
                  </div>
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                </div>

                {formData.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Percentual (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="Taxa padrão"
                          value={formData.override_percent}
                          onChange={(e) => setFormData({ ...formData, override_percent: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Deixe vazio para usar taxa padrão</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Fixo (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Taxa padrão"
                          value={formData.override_fixed}
                          onChange={(e) => setFormData({ ...formData, override_fixed: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Deixe vazio para usar taxa padrão</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Ex: Acordo comercial especial até 12/2025"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={(!editingOverride && !formData.tenant_id) || createOverride.isPending || updateOverride.isPending}
                >
                  {(createOverride.isPending || updateOverride.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingOverride ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {overrides && overrides.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Percentual</TableHead>
                <TableHead>Fixo</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map((override: any) => (
                <TableRow key={override.id} className={!override.enabled ? 'opacity-75 bg-muted/50' : ''}>
                  <TableCell className="font-medium">
                    {override.tenant?.name || override.tenant_id.substring(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={override.enabled ?? true}
                        onCheckedChange={() => handleToggleEnabled(override)}
                        disabled={updateOverride.isPending}
                      />
                      {override.enabled === false ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Ban className="h-3 w-3" />
                          Isento
                      </Badge>
                      ) : (
                        <Badge variant="default" className="flex items-center gap-1 bg-primary">
                          <Check className="h-3 w-3" />
                          Ativo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {override.enabled !== false && override.override_percent != null
                      ? `${override.override_percent}%`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {override.enabled !== false && override.override_fixed != null
                      ? `R$ ${override.override_fixed.toFixed(2)}`
                      : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {override.notes || '-'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(override.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(override)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(override.id)}
                        disabled={deleteOverride.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma configuração especial. Todas as lojas usam as taxas padrão do plano.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
