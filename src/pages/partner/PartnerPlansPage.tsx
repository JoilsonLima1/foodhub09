/**
 * PartnerPlansPage - Manage partner plans with policy validation
 */

import { useState, useEffect } from 'react';
import { usePartnerPlansData } from '@/hooks/usePartnerData';
import { usePartnerPolicy } from '@/hooks/usePartnerPolicy';
import { useAddonModules } from '@/hooks/useAddonModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Plus, Pencil, Trash2, Loader2, Package, AlertTriangle, Info } from 'lucide-react';

// Available features (same as in PartnerPoliciesManager)
const AVAILABLE_FEATURES = [
  { key: 'kyc_selfie', label: 'Exigir Selfie (KYC)' },
  { key: 'kyc_document', label: 'Exigir Documento (KYC)' },
  { key: 'subcomanda', label: 'Subcomandas' },
  { key: 'split_payment', label: 'Divisão de Pagamento' },
  { key: 'table_reservation', label: 'Reserva de Mesas' },
  { key: 'customer_app', label: 'App do Cliente' },
  { key: 'waiter_app', label: 'App do Garçom' },
  { key: 'kitchen_display', label: 'Display da Cozinha' },
  { key: 'multi_store', label: 'Multi-Loja' },
  { key: 'api_access', label: 'Acesso à API' },
  { key: 'custom_domain', label: 'Domínio Personalizado' },
  { key: 'white_label', label: 'White Label' },
  { key: 'priority_support', label: 'Suporte Prioritário' },
  { key: 'advanced_reports', label: 'Relatórios Avançados' },
];

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  monthly_price: number;
  currency: string;
  max_users: number | null;
  max_products: number | null;
  max_orders_per_month: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_default: boolean;
  display_order: number;
  trial_days: number;
  is_free: boolean;
  included_modules: string[];
  included_features: string[];
}

export default function PartnerPlansPage() {
  const { plans, isLoading, createPlan, updatePlan, deletePlan } = usePartnerPlansData();
  const { policy, validatePlan } = usePartnerPolicy();
  const { modules } = useAddonModules();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    slug: '',
    description: '',
    monthly_price: 0,
    currency: 'BRL',
    max_users: 5,
    max_products: 100,
    max_orders_per_month: 1000,
    is_active: true,
    is_featured: false,
    is_default: false,
    display_order: 0,
    trial_days: 14,
    is_free: false,
    included_modules: [],
    included_features: [],
  });

  // Validate on form change
  useEffect(() => {
    if (policy) {
      const result = validatePlan({
        is_free: formData.is_free,
        monthly_price: formData.monthly_price,
        trial_days: formData.trial_days,
        included_modules: formData.included_modules,
        included_features: formData.included_features,
      });
      setValidationErrors(result.errors);
    }
  }, [formData, policy, validatePlan]);

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      monthly_price: policy?.min_paid_plan_price || 49.90,
      currency: 'BRL',
      max_users: 5,
      max_products: 100,
      max_orders_per_month: 1000,
      is_active: true,
      is_featured: false,
      is_default: false,
      display_order: plans.length,
      trial_days: 14,
      is_free: false,
      included_modules: [],
      included_features: [],
    });
    setValidationErrors([]);
  };

  const handleSave = () => {
    if (validationErrors.length > 0) return;

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
      is_featured: plan.is_featured || false,
      is_default: plan.is_default || false,
      display_order: plan.display_order || 0,
      trial_days: plan.trial_days || 14,
      is_free: plan.is_free || false,
      included_modules: plan.included_modules || [],
      included_features: plan.included_features || [],
    });
    setEditingPlan(plan);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano?')) {
      deletePlan.mutate(id);
    }
  };

  const toggleModule = (moduleSlug: string) => {
    setFormData(prev => ({
      ...prev,
      included_modules: prev.included_modules.includes(moduleSlug)
        ? prev.included_modules.filter(m => m !== moduleSlug)
        : [...prev.included_modules, moduleSlug],
    }));
  };

  const toggleFeature = (featureKey: string) => {
    setFormData(prev => ({
      ...prev,
      included_features: prev.included_features.includes(featureKey)
        ? prev.included_features.filter(f => f !== featureKey)
        : [...prev.included_features, featureKey],
    }));
  };

  // Filter available modules/features based on policy
  const allowedModules = modules.filter(m => policy?.allowed_modules_catalog?.includes(m.slug));
  const allowedFeatures = AVAILABLE_FEATURES.filter(f => policy?.allowed_features_catalog?.includes(f.key));

  const canCreateMore = policy ? plans.length < policy.max_plans_per_partner : true;

  const DialogForm = () => (
    <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Policy Info */}
      {policy && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Limites: máx {policy.max_trial_days_allowed} dias trial • 
            mín R$ {policy.min_paid_plan_price.toFixed(2)} para plano pago • 
            {policy.max_modules_per_plan} módulos • 
            {policy.max_features_per_plan} features
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome do Plano *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Plano Básico"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug *</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
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

      {/* Free Plan Toggle */}
      {policy?.allow_free_plan && (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Plano Gratuito</p>
            <p className="text-sm text-muted-foreground">
              Sem cobrança mensal (máx {policy.free_plan_max_modules} módulos, {policy.free_plan_max_features} features)
            </p>
          </div>
          <Switch
            checked={formData.is_free}
            onCheckedChange={(v) => setFormData(prev => ({ 
              ...prev, 
              is_free: v,
              monthly_price: v ? 0 : policy.min_paid_plan_price,
            }))}
          />
        </div>
      )}

      {/* Price and Trial */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Preço Mensal (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.monthly_price}
            onChange={(e) => setFormData(prev => ({ ...prev, monthly_price: Number(e.target.value) }))}
            disabled={formData.is_free}
            min={formData.is_free ? 0 : policy?.min_paid_plan_price || 0}
          />
        </div>
        <div className="space-y-2">
          <Label>Dias de Trial</Label>
          <Input
            type="number"
            value={formData.trial_days}
            onChange={(e) => setFormData(prev => ({ ...prev, trial_days: Number(e.target.value) }))}
            min={0}
            max={policy?.max_trial_days_allowed || 30}
          />
          <p className="text-xs text-muted-foreground">
            Máx: {policy?.max_trial_days_allowed || 30} dias
          </p>
        </div>
        <div className="space-y-2">
          <Label>Ordem</Label>
          <Input
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData(prev => ({ ...prev, display_order: Number(e.target.value) }))}
          />
        </div>
      </div>

      {/* Usage Limits */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Máx. Usuários</Label>
          <Input
            type="number"
            value={formData.max_users || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, max_users: e.target.value ? Number(e.target.value) : null }))}
            placeholder="Ilimitado"
          />
        </div>
        <div className="space-y-2">
          <Label>Máx. Produtos</Label>
          <Input
            type="number"
            value={formData.max_products || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, max_products: e.target.value ? Number(e.target.value) : null }))}
            placeholder="Ilimitado"
          />
        </div>
        <div className="space-y-2">
          <Label>Máx. Pedidos/Mês</Label>
          <Input
            type="number"
            value={formData.max_orders_per_month || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, max_orders_per_month: e.target.value ? Number(e.target.value) : null }))}
            placeholder="Ilimitado"
          />
        </div>
      </div>

      {/* Modules Selection */}
      {allowedModules.length > 0 && (
        <div className="space-y-3">
          <Label>Módulos Incluídos ({formData.included_modules.length}/{policy?.max_modules_per_plan})</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {allowedModules.map((module) => (
              <div
                key={module.id}
                className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors ${
                  formData.included_modules.includes(module.slug)
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleModule(module.slug)}
              >
                <span className="text-sm">{module.name}</span>
                {formData.included_modules.includes(module.slug) && (
                  <Badge variant="default" className="text-xs">✓</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features Selection */}
      {allowedFeatures.length > 0 && (
        <div className="space-y-3">
          <Label>Features Incluídas ({formData.included_features.length}/{policy?.max_features_per_plan})</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {allowedFeatures.map((feature) => (
              <div
                key={feature.key}
                className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors ${
                  formData.included_features.includes(feature.key)
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleFeature(feature.key)}
              >
                <span className="text-sm">{feature.label}</span>
                {formData.included_features.includes(feature.key) && (
                  <Badge variant="default" className="text-xs">✓</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
          />
          <Label>Plano Ativo</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_featured}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_featured: v }))}
          />
          <Label>Destaque</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_default}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_default: v }))}
          />
          <Label>Padrão</Label>
        </div>
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
            {policy && ` (${plans.length}/${policy.max_plans_per_partner})`}
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={!canCreateMore}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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
              <Button 
                onClick={handleSave} 
                disabled={createPlan.isPending || validationErrors.length > 0}
              >
                {createPlan.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Plano
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Limit Warning */}
      {!canCreateMore && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você atingiu o limite de {policy?.max_plans_per_partner} planos.
          </AlertDescription>
        </Alert>
      )}

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
                  <TableHead>Trial</TableHead>
                  <TableHead>Módulos/Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">{plan.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.is_free ? (
                        <Badge variant="secondary">Grátis</Badge>
                      ) : (
                        <>
                          <span className="font-medium">
                            R$ {plan.monthly_price.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground text-sm">/mês</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.trial_days > 0 ? (
                        <span className="text-sm">{plan.trial_days} dias</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem trial</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {plan.included_modules?.length || 0} módulos • {plan.included_features?.length || 0} features
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                          {plan.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {plan.is_featured && <Badge variant="outline">⭐</Badge>}
                        {plan.is_default && <Badge variant="outline">Padrão</Badge>}
                      </div>
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
        <DialogContent className="max-w-2xl">
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
            <Button 
              onClick={handleSave} 
              disabled={updatePlan.isPending || validationErrors.length > 0}
            >
              {updatePlan.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
