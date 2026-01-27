import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Infinity } from 'lucide-react';
import { useSubscriptionPlans, PLAN_FEATURES } from '@/hooks/useSubscriptionPlans';
import type { SubscriptionPlan } from '@/types/database';

export function FeatureComparison() {
  const { plans, isLoading } = useSubscriptionPlans();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activePlans = plans?.filter(p => p.is_active).sort((a, b) => a.display_order - b.display_order) || [];

  const formatValue = (plan: SubscriptionPlan, key: string, type: string) => {
    const value = plan[key as keyof SubscriptionPlan];
    
    if (type === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-500" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground" />
      );
    }
    
    if (type === 'number') {
      return value === -1 ? (
        <div className="flex items-center gap-1">
          <Infinity className="h-4 w-4" />
          <span>Ilimitado</span>
        </div>
      ) : (
        <span className="font-semibold">{value}</span>
      );
    }
    
    return String(value);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'limits': return 'Limites';
      case 'core': return 'Recursos Principais';
      case 'reports': return 'Relatórios e Análises';
      case 'advanced': return 'Recursos Avançados';
      default: return category;
    }
  };

  const categories = ['limits', 'core', 'reports', 'advanced'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo de Planos</CardTitle>
        <CardDescription>
          Visualize todas as funcionalidades disponíveis em cada plano
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-2 font-medium text-muted-foreground w-1/3">
                  Recurso
                </th>
                {activePlans.map((plan) => (
                  <th key={plan.id} className="text-center py-4 px-4">
                    <div className="space-y-1">
                      <div className="font-bold text-lg">{plan.name}</div>
                      <Badge variant="outline">R$ {plan.monthly_price}/mês</Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <>
                  <tr key={`header-${category}`} className="bg-muted/50">
                    <td colSpan={activePlans.length + 1} className="py-3 px-2 font-semibold">
                      {getCategoryLabel(category)}
                    </td>
                  </tr>
                  {PLAN_FEATURES.filter(f => f.category === category).map((feature) => (
                    <tr key={feature.key} className="border-b hover:bg-accent/30">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{feature.label}</div>
                          <div className="text-xs text-muted-foreground">{feature.description}</div>
                        </div>
                      </td>
                      {activePlans.map((plan) => (
                        <td key={`${plan.id}-${feature.key}`} className="text-center py-3 px-4">
                          <div className="flex justify-center">
                            {formatValue(plan, feature.key, feature.type)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
