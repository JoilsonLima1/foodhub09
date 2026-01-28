import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Check,
  Gift,
  Plug2,
  Settings2,
  Megaphone,
  HardDrive,
  Truck,
} from 'lucide-react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useAddonModules, ADDON_CATEGORY_LABELS, type AddonModuleCategory } from '@/hooks/useAddonModules';
import { usePlanAddonModules } from '@/hooks/usePlanAddonModules';
import type { SubscriptionPlan } from '@/types/database';

// Icon mapping for module categories
const CATEGORY_ICONS: Record<AddonModuleCategory, React.ComponentType<{ className?: string }>> = {
  integrations: Plug2,
  operations: Settings2,
  marketing: Megaphone,
  hardware: HardDrive,
  logistics: Truck,
};

export function PlanAddonModulesTab() {
  const { plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { modules, isLoading: modulesLoading } = useAddonModules();
  const { allPlanAddons, isLoadingAll, toggleModuleInPlan, isPlanAddonIncluded } = usePlanAddonModules();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const isLoading = plansLoading || modulesLoading || isLoadingAll;
  const selectedPlan = plans?.find(p => p.id === selectedPlanId);

  const handleToggle = async (addonModuleId: string, isIncluded: boolean) => {
    if (!selectedPlanId) return;
    setIsUpdating(addonModuleId);
    try {
      await toggleModuleInPlan(selectedPlanId, addonModuleId, isIncluded);
    } finally {
      setIsUpdating(null);
    }
  };

  const getModulesIncludedCount = (planId: string) => {
    if (!allPlanAddons) return 0;
    return allPlanAddons.filter(pa => pa.plan_id === planId).length;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Módulos Gratuitos por Plano
          </CardTitle>
          <CardDescription>
            Selecione quais módulos adicionais estão inclusos gratuitamente em cada plano de assinatura.
            Clientes com estes módulos já ativos verão como "Incluso no plano" no catálogo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Selector */}
          <div className="space-y-2">
            <Label>Selecione o Plano</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecione um plano para configurar..." />
              </SelectTrigger>
              <SelectContent>
                {plans?.filter(p => p.is_active).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex items-center gap-2">
                      <span>{plan.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getModulesIncludedCount(plan.id)} módulos
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plans Summary Cards */}
          {!selectedPlanId && (
            <div className="grid gap-4 md:grid-cols-3">
              {plans?.filter(p => p.is_active).map((plan) => {
                const includedCount = getModulesIncludedCount(plan.id);
                return (
                  <Card
                    key={plan.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>R$ {plan.monthly_price}/mês</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {includedCount} módulo{includedCount !== 1 ? 's' : ''} incluso{includedCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Module Selection for Selected Plan */}
          {selectedPlanId && selectedPlan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione os módulos que serão gratuitos para este plano
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSelectedPlanId('')}>
                  Voltar
                </Button>
              </div>

              <Separator />

              {/* Modules by Category */}
              {Object.entries(ADDON_CATEGORY_LABELS).map(([categoryKey, categoryLabel]) => {
                const categoryModules = modules?.filter(m => m.category === categoryKey && m.is_active) || [];
                if (categoryModules.length === 0) return null;

                const CategoryIcon = CATEGORY_ICONS[categoryKey as AddonModuleCategory];

                return (
                  <div key={categoryKey} className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4" />
                      {categoryLabel}
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {categoryModules.map((module) => {
                        const isIncluded = isPlanAddonIncluded(selectedPlanId, module.id);
                        const isLoading = isUpdating === module.id;

                        return (
                          <div
                            key={module.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                              isIncluded ? 'bg-primary/5 border-primary/30' : 'hover:bg-accent/50'
                            }`}
                          >
                            <Checkbox
                              id={`module-${module.id}`}
                              checked={isIncluded}
                              disabled={isLoading}
                              onCheckedChange={() => handleToggle(module.id, isIncluded)}
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={`module-${module.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {module.name}
                              </Label>
                              <p className="text-xs text-muted-foreground truncate">
                                Normalmente R$ {module.monthly_price}/mês
                              </p>
                            </div>
                            {isIncluded && (
                              <Badge variant="default" className="gap-1 shrink-0">
                                <Gift className="h-3 w-3" />
                                Grátis
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {(!modules || modules.filter(m => m.is_active).length === 0) && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum módulo adicional cadastrado.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
