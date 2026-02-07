/**
 * PartnerAddonsPage - CRUD for partner add-ons
 * Phase 12: Add-ons, Proration, Coupons, Entitlements
 */

import { useState } from 'react';
import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Package, Loader2 } from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { usePartnerAddons, PartnerAddon } from '@/hooks/usePartnerAddons';

export default function PartnerAddonsPage() {
  const { partner } = usePartnerData();
  const { addons, isLoading, createAddon, updateAddon, deleteAddon, isCreating } = usePartnerAddons(partner?.id);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<PartnerAddon | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    pricing_type: 'recurring' as 'recurring' | 'one_time',
    amount: 0,
    billing_period: 'monthly' as 'monthly' | 'yearly',
  });

  const handleOpenDialog = (addon?: PartnerAddon) => {
    if (addon) {
      setEditingAddon(addon);
      setForm({
        name: addon.name,
        description: addon.description || '',
        pricing_type: addon.pricing_type,
        amount: addon.amount,
        billing_period: addon.billing_period || 'monthly',
      });
    } else {
      setEditingAddon(null);
      setForm({ name: '', description: '', pricing_type: 'recurring', amount: 0, billing_period: 'monthly' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!partner) return;
    
    if (editingAddon) {
      await updateAddon({
        addon_id: editingAddon.id,
        ...form,
      });
    } else {
      await createAddon({
        partner_id: partner.id,
        ...form,
      });
    }
    setIsDialogOpen(false);
  };

  const handleToggleActive = async (addon: PartnerAddon) => {
    await updateAddon({ addon_id: addon.id, is_active: !addon.is_active });
  };

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Add-ons
            </h1>
            <p className="text-muted-foreground">Gerencie produtos e serviços adicionais para seus clientes</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Add-on
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seus Add-ons</CardTitle>
            <CardDescription>Produtos e serviços que podem ser contratados além do plano</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : addons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum add-on criado ainda. Clique em "Novo Add-on" para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Assinantes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addons.map((addon) => (
                    <TableRow key={addon.id}>
                      <TableCell className="font-medium">{addon.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {addon.pricing_type === 'recurring' ? 'Recorrente' : 'Único'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        R$ {addon.amount.toFixed(2)}
                        {addon.pricing_type === 'recurring' && addon.billing_period && (
                          <span className="text-muted-foreground text-xs">/{addon.billing_period === 'monthly' ? 'mês' : 'ano'}</span>
                        )}
                      </TableCell>
                      <TableCell>{addon.subscribers_count}</TableCell>
                      <TableCell>
                        <Switch checked={addon.is_active} onCheckedChange={() => handleToggleActive(addon)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(addon)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteAddon(addon.id)} disabled={addon.subscribers_count > 0}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAddon ? 'Editar Add-on' : 'Novo Add-on'}</DialogTitle>
              <DialogDescription>Configure os detalhes do add-on</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Módulo de Delivery" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o add-on..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cobrança</Label>
                  <Select value={form.pricing_type} onValueChange={(v) => setForm({ ...form, pricing_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring">Recorrente</SelectItem>
                      <SelectItem value="one_time">Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              {form.pricing_type === 'recurring' && (
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={form.billing_period} onValueChange={(v) => setForm({ ...form, billing_period: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isCreating || !form.name}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PartnerLayout>
  );
}
