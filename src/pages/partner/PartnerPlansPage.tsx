/**
 * PartnerPlans - Manage partner plans
 */

import { useState } from 'react';
import { usePartnerPlansData } from '@/hooks/usePartnerData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react';

export default function PartnerPlansPage() {
  const { plans, isLoading, createPlan, updatePlan, deletePlan } = usePartnerPlansData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    monthly_price: 0,
    currency: 'BRL',
    max_users: 5,
    max_products: 100,
    max_orders_per_month: 1000,
    is_active: true,
    display_order: 0,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      monthly_price: 0,
      currency: 'BRL',
      max_users: 5,
      max_products: 100,
      max_orders_per_month: 1000,
      is_active: true,
      display_order: 0,
    });
  };

  const handleSave = () => {
    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, ...formData }, {
        onSuccess: () => {
          setEditingPlan(null);
          resetForm();
        },
      });
    } else {
      createPlan.mutate(formData as any, {
        onSuccess: () => {
          setIsAddOpen(false);
          resetForm();
        },
      });
    }
  };

  const handleEdit = (plan: any) => {
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      monthly_price: plan.monthly_price,
      currency: plan.currency || 'BRL',
      max_users: plan.max_users || 5,
      max_products: plan.max_products || 100,
      max_orders_per_month: plan.max_orders_per_month || 1000,
      is_active: plan.is_active,
      display_order: plan.display_order || 0,
    });
    setEditingPlan(plan);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano?')) {
      deletePlan.mutate(id);
    }
  };

  const DialogForm = () => (
    <div className="space-y-4 py-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome do Plano</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Plano Básico"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            placeholder="basico"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descrição do plano"
          rows={2}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Preço Mensal (R$)</Label>
          <Input
            type="number"
            value={formData.monthly_price}
            onChange={(e) => setFormData(prev => ({ ...prev, monthly_price: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Ordem de Exibição</Label>
          <Input
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData(prev => ({ ...prev, display_order: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Máx. Usuários</Label>
          <Input
            type="number"
            value={formData.max_users}
            onChange={(e) => setFormData(prev => ({ ...prev, max_users: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Máx. Produtos</Label>
          <Input
            type="number"
            value={formData.max_products}
            onChange={(e) => setFormData(prev => ({ ...prev, max_products: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Máx. Pedidos/Mês</Label>
          <Input
            type="number"
            value={formData.max_orders_per_month}
            onChange={(e) => setFormData(prev => ({ ...prev, max_orders_per_month: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
        />
        <Label>Plano Ativo</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-muted-foreground">
            Gerencie os planos oferecidos às suas organizações
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Plano</DialogTitle>
              <DialogDescription>
                Defina as características do novo plano
              </DialogDescription>
            </DialogHeader>
            <DialogForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={createPlan.isPending}>
                {createPlan.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Plano
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium">Nenhum plano configurado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Crie planos personalizados para suas organizações
              </p>
              <Button className="mt-4" onClick={() => { resetForm(); setIsAddOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Plano
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Limites</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">{plan.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {plan.monthly_price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {plan.max_users} usuários • {plan.max_products} produtos
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Atualize as informações do plano
            </DialogDescription>
          </DialogHeader>
          <DialogForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updatePlan.isPending}>
              {updatePlan.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
