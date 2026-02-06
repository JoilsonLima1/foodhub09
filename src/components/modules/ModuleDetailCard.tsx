/**
 * ModuleDetailCard Component
 * 
 * Shows detailed module info with plan limits comparison,
 * status, and purchase CTA for the Module Store.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check,
  CheckCircle2,
  Gift,
  Infinity,
  ShoppingCart,
  TrendingUp,
  ArrowUpCircle,
  Loader2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useTenantModules } from '@/hooks/useTenantModules';
import { useModuleUsage } from '@/hooks/useModuleUsage';
import { useModulePlanLimits } from '@/hooks/useModuleUsage';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { AddonModule } from '@/hooks/useAddonModules';

interface ModuleDetailCardProps {
  module: AddonModule;
  onPurchase?: (module: AddonModule) => void;
  isPending?: boolean;
  pendingPaymentUrl?: string | null;
}

// Plan limit keys for this module
const MARKETING_CEO_LIMITS = ['audits_per_month', 'pages_per_month'];

const LIMIT_LABELS: Record<string, string> = {
  audits_per_month: 'Auditorias/mês',
  pages_per_month: 'Páginas/mês',
};

export function ModuleDetailCard({
  module,
  onPurchase,
  isPending = false,
  pendingPaymentUrl,
}: ModuleDetailCardProps) {
  const { tenantInfo, isModuleActive, isModuleIncludedInPlan } = useTenantModules();
  const { limits, isLoading: usageLoading } = useModuleUsage(module.slug, MARKETING_CEO_LIMITS);
  const { planLimits } = useModulePlanLimits(module.slug);
  const { plans } = useSubscriptionPlans();
  
  const isActive = isModuleActive(module.id);
  const isIncludedInPlan = isModuleIncludedInPlan(module.id);
  const currentPlanId = tenantInfo?.subscription_plan_id;
  const currentPlan = tenantInfo?.subscription_plans as { name?: string } | undefined;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatLimit = (value: number): string => {
    return value === -1 ? 'Ilimitado' : String(value);
  };

  // Group limits by plan for comparison table
  const getLimitsForPlan = (planId: string): Record<string, number> => {
    const result: Record<string, number> = {};
    planLimits?.forEach((limit) => {
      if (limit.plan_id === planId) {
        result[limit.limit_key] = limit.limit_value;
      }
    });
    return result;
  };

  // Get display-ordered plans
  const orderedPlans = plans?.filter(p => p.is_active).sort((a, b) => 
    (a.display_order ?? 99) - (b.display_order ?? 99)
  ) || [];

  // Determine CTA state
  const getCtaState = () => {
    if (isActive || isIncludedInPlan) {
      return { type: 'active' as const, label: 'Módulo Ativo' };
    }
    if (isPending) {
      return { type: 'pending' as const, label: 'Pagamento Pendente' };
    }
    return { type: 'purchase' as const, label: 'Ativar Módulo' };
  };

  const ctaState = getCtaState();

  return (
    <Card className="flex flex-col border-2 border-primary/20 shadow-lg overflow-hidden">
      {/* Header with gradient */}
      <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 pb-4">
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-xl bg-primary/20">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col items-end gap-2">
            {isActive ? (
              <Badge className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            ) : isIncludedInPlan ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Gift className="h-3 w-3 mr-1" />
                Incluso no plano
              </Badge>
            ) : (
              <Badge variant="outline">
                <Sparkles className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-xl mt-3">{module.name}</CardTitle>
        <CardDescription className="text-sm">
          {module.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-6 pt-6">
        {/* Features List */}
        {module.features && (module.features as string[]).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Recursos incluídos:</h4>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {(module.features as string[]).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Plan Limits Comparison */}
        {orderedPlans.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Limites por plano:</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Plano</th>
                    {MARKETING_CEO_LIMITS.map((key) => (
                      <th key={key} className="px-3 py-2 text-center font-medium">
                        {LIMIT_LABELS[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedPlans.map((plan) => {
                    const planLimitsData = getLimitsForPlan(plan.id);
                    const isCurrent = plan.id === currentPlanId;
                    return (
                      <tr 
                        key={plan.id} 
                        className={cn(
                          "border-t",
                          isCurrent && "bg-primary/5"
                        )}
                      >
                        <td className="px-3 py-2 font-medium">
                          {plan.name}
                          {isCurrent && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Atual
                            </Badge>
                          )}
                        </td>
                        {MARKETING_CEO_LIMITS.map((key) => (
                          <td key={key} className="px-3 py-2 text-center">
                            {planLimitsData[key] !== undefined ? (
                              planLimitsData[key] === -1 ? (
                                <span className="inline-flex items-center gap-1 text-primary font-medium">
                                  <Infinity className="h-4 w-4" />
                                </span>
                              ) : (
                                <span>{planLimitsData[key]}</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Current Usage (if module is active) */}
        {isActive && !usageLoading && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Uso este mês:</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {MARKETING_CEO_LIMITS.map((key) => {
                const limitData = limits[key];
                if (!limitData) return null;
                
                const isUnlimited = limitData.limit === -1;
                const percentUsed = isUnlimited ? 0 : Math.min(100, (limitData.used / limitData.limit) * 100);
                const isWarning = !isUnlimited && percentUsed >= 80;
                
                return (
                  <div 
                    key={key}
                    className={cn(
                      "p-3 rounded-lg border",
                      isWarning ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30" : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">{LIMIT_LABELS[key]}</span>
                      <span className="font-medium text-sm">
                        {isUnlimited ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Infinity className="h-4 w-4" />
                            Ilimitado
                          </span>
                        ) : (
                          `${limitData.used}/${limitData.limit}`
                        )}
                      </span>
                    </div>
                    {!isUnlimited && (
                      <Progress value={percentUsed} className="h-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 pt-2">
          <span className="text-3xl font-bold text-primary">
            {formatPrice(module.monthly_price)}
          </span>
          <span className="text-muted-foreground">/mês</span>
          {module.setup_fee > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              + {formatPrice(module.setup_fee)} setup
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-3 pt-4 border-t bg-muted/20">
        {ctaState.type === 'active' ? (
          <Link to="/marketing" className="w-full">
            <Button variant="default" className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Acessar Módulo
            </Button>
          </Link>
        ) : ctaState.type === 'pending' ? (
          <div className="w-full space-y-2">
            <div className="w-full text-center py-2 px-3 rounded-md bg-amber-100 dark:bg-amber-900/30">
              <div className="flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Pagamento em processamento</span>
              </div>
            </div>
            {pendingPaymentUrl && (
              <Button 
                variant="outline"
                onClick={() => window.open(pendingPaymentUrl, '_blank')}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ir para Pagamento
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => onPurchase?.(module)}
              className="flex-1"
              disabled={isPending}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ativar Agora
            </Button>
            <Link to="/settings?tab=subscription" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Ver Planos
              </Button>
            </Link>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Ativação imediata
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Cancele quando quiser
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
