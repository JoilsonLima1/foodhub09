import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, TrendingUp, Crown, Gift, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PublicSubscriptionPlan } from '@/hooks/usePublicSubscriptionPlans';

interface PricingSectionProps {
  plans: PublicSubscriptionPlan[] | undefined;
  isLoading: boolean;
  trialDays: number;
  trialText: string;
}

export function PricingSection({ plans, isLoading, trialDays, trialText }: PricingSectionProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, planSlug: string, isFree: boolean) => {
    setLoadingPlan(planId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate(`/auth?plan=${planSlug}&intent=signup`);
        return;
      }
      
      if (isFree) {
        navigate('/dashboard');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Erro ao iniciar checkout',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive'
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'free': return Gift;
      case 'starter': return Zap;
      case 'professional': return TrendingUp;
      case 'enterprise': return Crown;
      default: return Zap;
    }
  };

  /**
   * Generate features dynamically from plan data configured in Super Admin
   */
  const getPlanFeatures = (plan: PublicSubscriptionPlan): string[] => {
    const features: string[] = [];
    
    // Limits
    if (plan.max_users !== undefined && plan.max_users !== null) {
      features.push(plan.max_users === -1 ? 'Usuários ilimitados' : `Até ${plan.max_users} usuário${plan.max_users > 1 ? 's' : ''}`);
    }
    if (plan.max_products !== undefined && plan.max_products !== null) {
      features.push(plan.max_products === -1 ? 'Produtos ilimitados' : `Até ${plan.max_products} produtos`);
    }
    if (plan.max_orders_per_month !== undefined && plan.max_orders_per_month !== null) {
      features.push(plan.max_orders_per_month === -1 ? 'Pedidos ilimitados' : `Até ${plan.max_orders_per_month} pedidos/mês`);
    }
    
    // Core features
    if (plan.feature_public_menu) features.push('Cardápio na Internet');
    if (plan.feature_pos) features.push('PDV completo');
    if (plan.feature_kitchen_display) features.push('Painel da cozinha');
    if (plan.feature_delivery_management) features.push('Gestão de entregas');
    if (plan.feature_stock_control) features.push('Controle de estoque');
    if (plan.feature_courier_app) features.push('App do entregador');
    
    // Reports
    if (plan.feature_reports_basic) features.push('Relatórios básicos');
    if (plan.feature_reports_advanced) features.push('Relatórios avançados');
    if (plan.feature_cmv_reports) features.push('Relatório CMV');
    if (plan.feature_ai_forecast) features.push('Previsão com IA');
    if (plan.feature_goal_notifications) features.push('Metas e notificações');
    
    // Advanced
    if (plan.feature_multi_branch) features.push('Multi-lojas (base inclusa)');
    if (plan.feature_api_access) features.push('Acesso à API');
    if (plan.feature_api_access) features.push('Acesso à API');
    if (plan.feature_white_label) features.push('White Label');
    if (plan.feature_custom_integrations) features.push('Integrações personalizadas');
    if (plan.feature_priority_support) features.push('Suporte prioritário');
    
    return features;
  };

  const getPlanGradient = (slug: string) => {
    switch (slug) {
      case 'free': return 'from-emerald-500/20 to-green-500/5';
      case 'starter': return 'from-blue-500/20 to-cyan-500/5';
      case 'professional': return 'from-primary/30 to-yellow-500/5';
      case 'enterprise': return 'from-purple-500/20 to-pink-500/5';
      default: return 'from-primary/20 to-primary/5';
    }
  };

  // Get plans sorted by display order (all plans from public function are already active)
  const activePlans = plans?.sort((a, b) => a.display_order - b.display_order) || [];

  return (
    <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-background via-card/30 to-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Preços</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Planos que cabem no seu <span className="text-primary">bolso</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escolha o plano ideal para o tamanho do seu negócio. 
            Planos pagos incluem <span className="text-primary font-semibold">{trialDays} dias grátis</span> para você testar.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activePlans.map((plan) => {
              const Icon = getPlanIcon(plan.slug);
              const isPopular = plan.slug === 'professional';
              const isFree = plan.monthly_price === 0;
              const gradient = getPlanGradient(plan.slug);
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative bg-gradient-to-b ${gradient} border-border flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                    isPopular ? 'border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10' : ''
                  } ${isFree ? 'border-emerald-500/50' : ''}`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-lg">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  {isFree && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white px-4 py-1">
                        Grátis para Sempre
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4 pt-8">
                    <div className={`mx-auto h-16 w-16 rounded-2xl ${isFree ? 'bg-emerald-500/20' : 'bg-primary/20'} flex items-center justify-center mb-4`}>
                      <Icon className={`h-8 w-8 ${isFree ? 'text-emerald-500' : 'text-primary'}`} />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="min-h-[48px]">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1">
                    <div className="text-center mb-6">
                      {isFree ? (
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-bold text-emerald-500">Grátis</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-muted-foreground text-xl">R$</span>
                            <span className="text-5xl font-bold">{plan.monthly_price}</span>
                            <span className="text-muted-foreground">/mês</span>
                          </div>
                          <p className="text-sm text-primary mt-2">
                            {trialDays} dias grátis para testar
                          </p>
                        </>
                      )}
                    </div>
                    
                    <ul className="space-y-3">
                      {getPlanFeatures(plan).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className={`h-5 w-5 ${isFree ? 'text-emerald-500' : 'text-primary'} shrink-0 mt-0.5`} />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter className="pt-4">
                    <Button 
                      className={`w-full rounded-full h-12 ${isPopular ? 'shadow-lg shadow-primary/30' : ''}`}
                      size="lg"
                      variant={isFree ? 'outline' : isPopular ? 'default' : 'outline'}
                      onClick={() => handleSubscribe(plan.id, plan.slug, isFree)}
                      disabled={loadingPlan === plan.id}
                    >
                      {loadingPlan === plan.id ? (
                        <span className="animate-spin mr-2">⏳</span>
                      ) : null}
                      {isFree ? 'Começar Grátis' : `Testar ${trialDays} dias grátis`}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-muted-foreground mt-12 text-lg">
          💡 Todos os planos pagos incluem <strong className="text-primary">{trialText}</strong>. 
          Sem cartão de crédito. Cancele a qualquer momento.
        </p>
      </div>
    </section>
  );
}
