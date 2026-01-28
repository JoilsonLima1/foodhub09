import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Save, 
  Plus, 
  Trash2, 
  Settings2, 
  Users, 
  Package, 
  BarChart3,
  Zap,
  Infinity,
  DollarSign,
  Pencil,
  MoreVertical,
  Power,
  PowerOff,
  Eye,
  EyeOff,
  Gift,
} from 'lucide-react';
import { useSubscriptionPlans, PLAN_FEATURES } from '@/hooks/useSubscriptionPlans';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';
import { PlanAddonModulesTab } from './PlanAddonModulesTab';
import type { SubscriptionPlan } from '@/types/database';

interface PlanCardProps {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (plan: SubscriptionPlan) => void;
  onToggleActive: (plan: SubscriptionPlan) => void;
}

function PlanCard({ plan, onEdit, onDelete, onToggleActive }: PlanCardProps) {
  const formatLimit = (value: number) => {
    return value === -1 ? <Infinity className="h-4 w-4" /> : value;
  };

  const featureCount = PLAN_FEATURES.filter(
    (f) => f.type === 'boolean' && plan[f.key as keyof SubscriptionPlan] === true
  ).length;

  return (
    <Card className={`relative ${!plan.is_active ? 'opacity-60 border-dashed' : ''}`}>
      {!plan.is_active && (
        <Badge variant="secondary" className="absolute top-2 right-12">
          <EyeOff className="h-3 w-3 mr-1" />
          Inativo
        </Badge>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(plan)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(plan)}>
                {plan.is_active ? (
                  <>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(plan)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">R$ {plan.monthly_price}</span>
          <span className="text-muted-foreground">/mês</span>
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center text-lg font-semibold">
              {formatLimit(plan.max_users)}
            </div>
            <p className="text-xs text-muted-foreground">Usuários</p>
          </div>
          <div>
            <div className="flex items-center justify-center text-lg font-semibold">
              {formatLimit(plan.max_products)}
            </div>
            <p className="text-xs text-muted-foreground">Produtos</p>
          </div>
          <div>
            <div className="flex items-center justify-center text-lg font-semibold">
              {formatLimit(plan.max_orders_per_month)}
            </div>
            <p className="text-xs text-muted-foreground">Pedidos/mês</p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Recursos incluídos</span>
          <Badge variant="secondary">{featureCount} de {PLAN_FEATURES.filter(f => f.type === 'boolean').length}</Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Visibilidade</span>
          <Badge variant={plan.is_active ? 'default' : 'outline'}>
            {plan.is_active ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Público
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Oculto
              </>
            )}
          </Badge>
        </div>

        {plan.stripe_price_id && (
          <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
            Stripe: {plan.stripe_price_id}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EditPlanDialogProps {
  plan: SubscriptionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (plan: Partial<SubscriptionPlan> & { id?: string }) => void;
  isLoading: boolean;
}

function EditPlanDialog({ plan, open, onOpenChange, onSave, isLoading }: EditPlanDialogProps) {
  const getDefaultFormData = (): Partial<SubscriptionPlan> => ({
    name: '',
    slug: '',
    description: '',
    monthly_price: 0,
    currency: 'BRL',
    is_active: true,
    display_order: 0,
    max_users: 5,
    max_products: 100,
    max_orders_per_month: 500,
    feature_pos: true,
    feature_kitchen_display: true,
    feature_delivery_management: true,
    feature_stock_control: false,
    feature_reports_basic: true,
    feature_reports_advanced: false,
    feature_ai_forecast: false,
    feature_multi_branch: false,
    feature_api_access: false,
    feature_white_label: false,
    feature_priority_support: false,
    feature_custom_integrations: false,
    feature_cmv_reports: false,
    feature_goal_notifications: false,
    feature_courier_app: true,
    stripe_price_id: '',
    stripe_product_id: '',
  });

  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>(getDefaultFormData);

  useEffect(() => {
    if (open) {
      setFormData(plan || getDefaultFormData());
    }
  }, [open, plan]);

  const handleSubmit = () => {
    if (plan?.id) {
      onSave({ ...formData, id: plan.id });
    } else {
      onSave(formData);
    }
  };

  const updateField = (key: keyof SubscriptionPlan, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getCategoryFeatures = (category: string) => 
    PLAN_FEATURES.filter(f => f.category === category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          <DialogDescription>
            Configure todos os detalhes e recursos do plano de assinatura.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Settings2 className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="limits">
              <Users className="h-4 w-4 mr-2" />
              Limites
            </TabsTrigger>
            <TabsTrigger value="features">
              <Package className="h-4 w-4 mr-2" />
              Recursos
            </TabsTrigger>
            <TabsTrigger value="stripe">
              <DollarSign className="h-4 w-4 mr-2" />
              Stripe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Ex: Professional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (identificador único)</Label>
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/\s/g, '-'))}
                  placeholder="professional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Descreva os benefícios deste plano..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Preço Mensal (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.monthly_price || 0}
                  onChange={(e) => updateField('monthly_price', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Ordem de Exibição</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.display_order || 0}
                  onChange={(e) => updateField('display_order', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="active">Plano Ativo (visível na loja)</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => updateField('is_active', checked)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="limits" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Use -1 para recursos ilimitados.
            </p>
            
            {getCategoryFeatures('limits').map((feature) => (
              <div key={feature.key} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base">{feature.label}</Label>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <Input
                  type="number"
                  className="w-32"
                  value={(formData[feature.key as keyof SubscriptionPlan] as number) || 0}
                  onChange={(e) => updateField(feature.key as keyof SubscriptionPlan, parseInt(e.target.value))}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="features" className="space-y-6 mt-4">
            {['core', 'reports', 'advanced'].map((category) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold capitalize flex items-center gap-2">
                  {category === 'core' && <Package className="h-4 w-4" />}
                  {category === 'reports' && <BarChart3 className="h-4 w-4" />}
                  {category === 'advanced' && <Zap className="h-4 w-4" />}
                  {category === 'core' ? 'Recursos Principais' : 
                   category === 'reports' ? 'Relatórios e Análises' : 'Recursos Avançados'}
                </h3>
                <div className="grid gap-2">
                  {getCategoryFeatures(category)
                    .filter(f => f.type === 'boolean')
                    .map((feature) => (
                      <div 
                        key={feature.key} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <Label className="text-sm font-medium">{feature.label}</Label>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                        <Switch
                          checked={formData[feature.key as keyof SubscriptionPlan] as boolean}
                          onCheckedChange={(checked) => updateField(feature.key as keyof SubscriptionPlan, checked)}
                        />
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="stripe" className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                Configure os IDs do Stripe para integração com pagamentos. 
                Estes valores são obtidos no dashboard do Stripe.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripe_price_id">Price ID</Label>
              <Input
                id="stripe_price_id"
                value={formData.stripe_price_id || ''}
                onChange={(e) => updateField('stripe_price_id', e.target.value)}
                placeholder="price_xxx..."
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripe_product_id">Product ID</Label>
              <Input
                id="stripe_product_id"
                value={formData.stripe_product_id || ''}
                onChange={(e) => updateField('stripe_product_id', e.target.value)}
                placeholder="prod_xxx..."
                className="font-mono"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Plano'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlanEditor() {
  const { plans, isLoading, updatePlan, createPlan, deletePlan } = useSubscriptionPlans();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setDialogOpen(true);
  };

  const handleSave = (plan: Partial<SubscriptionPlan> & { id?: string }) => {
    if (plan.id) {
      updatePlan.mutate(plan as Partial<SubscriptionPlan> & { id: string }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createPlan.mutate(plan as Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDeleteRequest = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (planToDelete) {
      deletePlan.mutate(planToDelete.id);
      setPlanToDelete(null);
    }
  };

  const handleToggleActive = (plan: SubscriptionPlan) => {
    updatePlan.mutate({
      id: plan.id,
      is_active: !plan.is_active,
    });
  };

  const filteredPlans = plans?.filter(plan => showInactive || plan.is_active);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('plans');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Planos</h2>
          <p className="text-muted-foreground">
            Configure os planos de assinatura e seus recursos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <Package className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-2">
            <Gift className="h-4 w-4" />
            Módulos Inclusos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6 space-y-4">
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm">
                Mostrar inativos
              </Label>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans?.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="addons" className="mt-6">
          <PlanAddonModulesTab />
        </TabsContent>
      </Tabs>

      <EditPlanDialog
        plan={editingPlan}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        isLoading={updatePlan.isPending || createPlan.isPending}
      />

      <PasswordConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Excluir Plano"
        description={`Você está prestes a excluir o plano "${planToDelete?.name}". Esta ação não pode ser desfeita e tenants com este plano precisarão ser migrados.`}
        confirmLabel="Excluir Plano"
        isLoading={deletePlan.isPending}
      />
    </div>
  );
}
