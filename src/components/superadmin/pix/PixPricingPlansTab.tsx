import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Gift } from 'lucide-react';
import { format } from 'date-fns';
import type { PixPricingPlan } from '@/hooks/usePixAutomatico';

interface Props {
  plans: PixPricingPlan[];
  onCreate: (plan: any) => void;
  onUpdate: (updates: Partial<PixPricingPlan> & { id: string }) => void;
}

const emptyPlan: {
  name: string; slug: string; description: string;
  pricing_type: 'percentual' | 'fixo' | 'hibrido';
  percent_rate: number; fixed_rate: number; min_fee: number;
  max_fee: number | null; free_until: string | null;
  is_subsidized: boolean; subsidy_percent: number;
  is_active: boolean; display_order: number;
} = {
  name: '',
  slug: '',
  description: '',
  pricing_type: 'percentual',
  percent_rate: 0,
  fixed_rate: 0,
  min_fee: 0.01,
  max_fee: null,
  free_until: null,
  is_subsidized: false,
  subsidy_percent: 0,
  is_active: true,
  display_order: 0,
};

export function PixPricingPlansTab({ plans, onCreate, onUpdate }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (editingId) {
      onUpdate({ id: editingId, ...form });
    } else {
      onCreate(form);
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyPlan);
  };

  const handleEdit = (plan: PixPricingPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      pricing_type: plan.pricing_type as 'percentual' | 'fixo' | 'hibrido',
      percent_rate: plan.percent_rate,
      fixed_rate: plan.fixed_rate,
      min_fee: plan.min_fee,
      max_fee: plan.max_fee,
      free_until: plan.free_until,
      is_subsidized: plan.is_subsidized,
      subsidy_percent: plan.subsidy_percent || 0,
      is_active: plan.is_active,
      display_order: plan.display_order,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Planos de PIX</CardTitle>
            <CardDescription>Tabelas de preço independentes do plano SaaS</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyPlan); }}>
                <Plus className="h-4 w-4 mr-1" />Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar' : 'Novo'} Plano PIX</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nome</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.pricing_type} onValueChange={(v: any) => setForm({ ...form, pricing_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentual">Percentual</SelectItem>
                        <SelectItem value="fixo">Fixo</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ordem</Label>
                    <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>% Taxa</Label>
                    <Input type="number" step="0.0001" value={form.percent_rate} onChange={(e) => setForm({ ...form, percent_rate: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>R$ Fixo</Label>
                    <Input type="number" step="0.01" value={form.fixed_rate} onChange={(e) => setForm({ ...form, fixed_rate: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Min. R$</Label>
                    <Input type="number" step="0.01" value={form.min_fee} onChange={(e) => setForm({ ...form, min_fee: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_subsidized} onCheckedChange={(v) => setForm({ ...form, is_subsidized: v })} />
                    <Label>Subsidiado</Label>
                  </div>
                  {form.is_subsidized && (
                    <div className="flex-1">
                      <Label>% Subsídio</Label>
                      <Input type="number" step="0.01" value={form.subsidy_percent} onChange={(e) => setForm({ ...form, subsidy_percent: parseFloat(e.target.value) || 0 })} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Ativo</Label>
                </div>
                <Button onClick={handleSubmit} className="w-full">{editingId ? 'Atualizar' : 'Criar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Taxa</TableHead>
              <TableHead>Min/Max</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{plan.name}</span>
                    {plan.is_subsidized && <Gift className="h-3 w-3 inline ml-1 text-primary" />}
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{plan.pricing_type}</Badge>
                </TableCell>
                <TableCell>
                  {(plan.percent_rate * 100).toFixed(2)}%
                  {plan.fixed_rate > 0 && ` + R$ ${plan.fixed_rate.toFixed(2)}`}
                </TableCell>
                <TableCell>
                  R$ {plan.min_fee.toFixed(2)}
                  {plan.max_fee && ` / R$ ${plan.max_fee.toFixed(2)}`}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(plan)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
