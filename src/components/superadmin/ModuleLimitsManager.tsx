/**
 * ModuleLimitsManager Component
 * 
 * Super Admin panel for configuring per-plan limits for modules.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings2, 
  Infinity, 
  Plus, 
  Pencil, 
  Save, 
  Loader2,
  BarChart3,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { useModulePlanLimits } from '@/hooks/useModuleUsage';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useAddonModules } from '@/hooks/useAddonModules';

// Known limit keys with descriptions
const LIMIT_KEY_INFO: Record<string, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  audits_per_month: {
    label: 'Auditorias/mês',
    description: 'Número de auditorias SEO permitidas por mês',
    icon: BarChart3,
  },
  pages_per_month: {
    label: 'Páginas/mês',
    description: 'Número de páginas que podem ser analisadas por mês',
    icon: FileText,
  },
};

export function ModuleLimitsManager() {
  const { planLimits, isLoading, updateLimit, createLimit, refetch } = useModulePlanLimits();
  const { plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { modules, isLoading: modulesLoading } = useAddonModules();
  
  const [selectedModule, setSelectedModule] = useState<string>('marketing_ceo');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<{
    id?: string;
    module_slug: string;
    plan_id: string;
    limit_key: string;
    limit_value: number;
  } | null>(null);

  const loading = isLoading || plansLoading || modulesLoading;

  // Get unique modules from limits
  const uniqueModules = [...new Set(planLimits?.map(l => l.module_slug) || [])];
  const availableModules = modules?.filter(m => 
    uniqueModules.includes(m.slug) || m.slug === 'marketing_ceo'
  ) || [];

  // Filter limits for selected module
  const moduleLimits = planLimits?.filter(l => l.module_slug === selectedModule) || [];

  // Group by plan for display
  const limitsByPlan = plans?.reduce((acc, plan) => {
    acc[plan.id] = {
      plan,
      limits: moduleLimits.filter(l => l.plan_id === plan.id),
    };
    return acc;
  }, {} as Record<string, { plan: any; limits: typeof moduleLimits }>);

  const handleEditLimit = (limit: typeof editingLimit) => {
    setEditingLimit(limit);
    setIsDialogOpen(true);
  };

  const handleCreateLimit = () => {
    setEditingLimit({
      module_slug: selectedModule,
      plan_id: plans?.[0]?.id || '',
      limit_key: 'audits_per_month',
      limit_value: 5,
    });
    setIsDialogOpen(true);
  };

  const handleSaveLimit = async () => {
    if (!editingLimit) return;

    if (editingLimit.id) {
      await updateLimit.mutateAsync({
        id: editingLimit.id,
        limit_value: editingLimit.limit_value,
      });
    } else {
      await createLimit.mutateAsync({
        module_slug: editingLimit.module_slug,
        plan_id: editingLimit.plan_id,
        limit_key: editingLimit.limit_key,
        limit_value: editingLimit.limit_value,
      });
    }
    setIsDialogOpen(false);
    setEditingLimit(null);
    refetch();
  };

  const formatLimitValue = (value: number) => {
    if (value === -1) return 'Ilimitado';
    return value.toString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Limites de Uso por Módulo</CardTitle>
            </div>
            <Button onClick={handleCreateLimit} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Limite
            </Button>
          </div>
          <CardDescription>
            Configure limites de uso para cada módulo por plano de assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Module selector */}
          <div className="mb-6">
            <Label>Selecione o Módulo</Label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-64 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModules.map(mod => (
                  <SelectItem key={mod.slug} value={mod.slug}>
                    {mod.name}
                  </SelectItem>
                ))}
                {availableModules.length === 0 && (
                  <SelectItem value="marketing_ceo">CEO de Marketing</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Limits table by plan */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Tipo de Limite</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map(plan => {
                const planLimitsData = limitsByPlan?.[plan.id]?.limits || [];
                
                if (planLimitsData.length === 0) {
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Infinity className="h-4 w-4" />
                          Sem limites configurados (ilimitado)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLimit({
                            module_slug: selectedModule,
                            plan_id: plan.id,
                            limit_key: 'audits_per_month',
                            limit_value: 5,
                          })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }

                return planLimitsData.map((limit, idx) => {
                  const keyInfo = LIMIT_KEY_INFO[limit.limit_key];
                  const Icon = keyInfo?.icon || Settings2;
                  
                  return (
                    <TableRow key={limit.id}>
                      {idx === 0 && (
                        <TableCell 
                          className="font-medium align-top" 
                          rowSpan={planLimitsData.length}
                        >
                          <Badge variant={plan.name.includes('Enterprise') ? 'default' : 'outline'}>
                            {plan.name}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{keyInfo?.label || limit.limit_key}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={limit.limit_value === -1 ? 'secondary' : 'outline'}>
                          {limit.limit_value === -1 ? (
                            <span className="flex items-center gap-1">
                              <Infinity className="h-3 w-3" />
                              Ilimitado
                            </span>
                          ) : (
                            limit.limit_value
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLimit({
                            id: limit.id,
                            module_slug: limit.module_slug,
                            plan_id: limit.plan_id || '',
                            limit_key: limit.limit_key,
                            limit_value: limit.limit_value,
                          })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLimit?.id ? 'Editar Limite' : 'Criar Limite'}
            </DialogTitle>
            <DialogDescription>
              Configure o limite de uso para o módulo
            </DialogDescription>
          </DialogHeader>

          {editingLimit && (
            <div className="space-y-4 py-4">
              {!editingLimit.id && (
                <>
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select
                      value={editingLimit.plan_id}
                      onValueChange={(v) => setEditingLimit({ ...editingLimit, plan_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans?.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Limite</Label>
                    <Select
                      value={editingLimit.limit_key}
                      onValueChange={(v) => setEditingLimit({ ...editingLimit, limit_key: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LIMIT_KEY_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {info.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {LIMIT_KEY_INFO[editingLimit.limit_key] && (
                      <p className="text-xs text-muted-foreground">
                        {LIMIT_KEY_INFO[editingLimit.limit_key].description}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Valor do Limite</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editingLimit.limit_value === -1 ? '' : editingLimit.limit_value}
                    onChange={(e) => setEditingLimit({
                      ...editingLimit,
                      limit_value: e.target.value === '' ? -1 : parseInt(e.target.value),
                    })}
                    placeholder="Deixe vazio para ilimitado"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLimit({ ...editingLimit, limit_value: -1 })}
                  >
                    <Infinity className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use -1 ou deixe vazio para ilimitado
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveLimit}
              disabled={updateLimit.isPending || createLimit.isPending}
            >
              {(updateLimit.isPending || createLimit.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
