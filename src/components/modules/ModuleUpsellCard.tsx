/**
 * ModuleUpsellCard Component
 * 
 * Shows an attractive upsell card when a user tries to access
 * a module they haven't purchased/activated.
 * Supports free activation and trial flows.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  CheckCircle2, 
  ShoppingCart,
  Sparkles,
  Gift,
  Play,
  Zap,
  Loader2,
} from 'lucide-react';
import { useTenantModules } from '@/hooks/useTenantModules';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useModuleTrial, TRIAL_DURATION_DAYS } from '@/hooks/useModuleTrial';

interface ModuleUpsellCardProps {
  moduleSlug: string;
  moduleName?: string;
  moduleDescription?: string;
  modulePrice?: number;
  features?: string[];
  onActivate?: () => void;
}

// Default features for known modules
const MODULE_FEATURES: Record<string, string[]> = {
  marketing_ceo: [
    'Auditoria técnica de SEO automatizada',
    'Geração de sitemap.xml e robots.txt',
    'Integração com Google Search Console',
    'Relatórios de indexação e autoridade',
    'Monitoramento de score SEO',
    'Histórico de auditorias mensais',
  ],
};

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  marketing_ceo: TrendingUp,
};

// Plans that get free access (with limits)
const FREE_PLAN_SLUGS = ['free', 'starter'];

export function ModuleUpsellCard({
  moduleSlug,
  moduleName = 'Módulo Premium',
  moduleDescription = 'Este módulo oferece funcionalidades avançadas para seu negócio.',
  modulePrice = 49.90,
  features = [],
  onActivate,
}: ModuleUpsellCardProps) {
  const Icon = MODULE_ICONS[moduleSlug] || Sparkles;
  const displayFeatures = features.length > 0 ? features : MODULE_FEATURES[moduleSlug] || [];
  
  const { tenantInfo } = useTenantModules();
  const { plans } = useSubscriptionPlans();
  const { trialInfo, activateTrial, activateFree } = useModuleTrial(moduleSlug);

  // Check if user is on a free/starter plan
  const currentPlanId = tenantInfo?.subscription_plan_id;
  const currentPlanSlug = plans?.find(p => p.id === currentPlanId)?.slug || '';
  const isOnFreePlan = FREE_PLAN_SLUGS.includes(currentPlanSlug);

  const isActivating = activateTrial.isPending || activateFree.isPending;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleActivateTrial = () => {
    activateTrial.mutate();
  };

  const handleActivateFree = () => {
    activateFree.mutate();
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full border-2 border-primary/20 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Icon className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            {isOnFreePlan ? (
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                <Zap className="h-3 w-3 mr-1" />
                Grátis no seu plano
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Gift className="h-3 w-3 mr-1" />
                Teste Grátis Disponível
              </Badge>
            )}
            <CardTitle className="text-2xl">{moduleName}</CardTitle>
            <CardDescription className="text-base max-w-md mx-auto">
              {moduleDescription}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Free/Trial Banner */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-emerald-800 dark:text-emerald-300">
                  {isOnFreePlan ? 'Instalação Grátis!' : `Teste Grátis por ${TRIAL_DURATION_DAYS} Dias!`}
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  {isOnFreePlan 
                    ? 'No plano grátis você usa este módulo sem pagar (com limites de uso mensal).'
                    : 'Experimente todas as funcionalidades sem compromisso. Sem cartão de crédito.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Price */}
          {isOnFreePlan ? (
            <div className="text-center py-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold text-emerald-600">
                  Grátis
                </span>
                <span className="text-muted-foreground line-through">
                  {formatPrice(modulePrice)}/mês
                </span>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                Uso gratuito com limites no seu plano atual
              </p>
            </div>
          ) : (
            <div className="text-center py-4 bg-muted/50 rounded-lg">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-primary">
                  {formatPrice(modulePrice)}
                </span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Após o teste • Cancele quando quiser
              </p>
            </div>
          )}

          {/* Features */}
          {displayFeatures.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-center">O que está incluído:</h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {displayFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col gap-3 pt-4">
            {isOnFreePlan ? (
              /* Free activation for free plan users */
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                size="lg" 
                onClick={handleActivateFree}
                disabled={isActivating}
              >
                {isActivating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Ativar Grátis Agora
              </Button>
            ) : trialInfo.canStartTrial ? (
              /* Trial activation */
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                size="lg" 
                onClick={handleActivateTrial}
                disabled={isActivating}
              >
                {isActivating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Iniciar Teste Grátis ({TRIAL_DURATION_DAYS} dias)
              </Button>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`/settings?tab=modules&module=${moduleSlug}`} className="flex-1">
                <Button variant="outline" className="w-full" size="lg" onClick={onActivate}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Ver na Loja de Módulos
                </Button>
              </Link>
              <Link to="/settings?tab=subscription" className="flex-1">
                <Button variant="ghost" className="w-full" size="lg">
                  Ver Planos
                </Button>
              </Link>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Ativação imediata
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Suporte incluso
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
