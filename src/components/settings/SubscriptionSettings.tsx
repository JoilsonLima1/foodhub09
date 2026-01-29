import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Calendar, CreditCard, ExternalLink, Loader2, AlertTriangle, Check } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckoutDialog } from '@/components/checkout/CheckoutDialog';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  description: string | null;
  max_users: number | null;
  max_products: number | null;
  feature_pos: boolean | null;
  feature_stock_control: boolean | null;
  feature_ai_forecast: boolean | null;
  feature_reports_basic: boolean | null;
  feature_reports_advanced: boolean | null;
  feature_delivery_management: boolean | null;
}

export function SubscriptionSettings() {
  const { session } = useAuth();
  const { subscriptionStatus, isLoading, getDaysRemaining } = useTrialStatus();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('id, name, slug, monthly_price, description, max_users, max_products, feature_pos, feature_stock_control, feature_ai_forecast, feature_reports_basic, feature_reports_advanced, feature_delivery_management')
          .eq('is_active', true)
          .order('display_order');
        
        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!session?.access_token) {
      toast({
        title: 'Erro de autenticação',
        description: 'Faça login novamente para continuar',
        variant: 'destructive',
      });
      return;
    }

    // Free plan - just show confirmation
    if (plan.monthly_price === 0) {
      toast({
        title: 'Plano Grátis',
        description: 'Você já está utilizando o plano gratuito. Para mais recursos, escolha um plano pago.',
      });
      return;
    }

    // Open checkout dialog with payment method selection
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) {
      toast({
        title: 'Erro de autenticação',
        description: 'Faça login novamente para continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL do portal não retornada');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: 'Erro ao abrir portal',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscriptionStatus) return null;

    switch (subscriptionStatus.status) {
      case 'active':
        return (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <Check className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-500/30">
              Pagamento Confirmado
            </Badge>
          </div>
        );
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Período de Teste</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Pagamento Pendente</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="secondary">Sem Assinatura</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const isCurrentPlan = (planSlug: string) => {
    return subscriptionStatus?.planId?.includes(planSlug);
  };

  const getPlanFeatures = (plan: SubscriptionPlan): string[] => {
    const features: string[] = [];
    
    if (plan.max_users) {
      features.push(plan.max_users === -1 ? 'Usuários ilimitados' : `Até ${plan.max_users} usuários`);
    }
    if (plan.max_products) {
      features.push(plan.max_products === -1 ? 'Produtos ilimitados' : `${plan.max_products} produtos`);
    }
    if (plan.feature_pos) features.push('PDV e Pedidos');
    if (plan.feature_reports_basic) features.push('Relatórios básicos');
    if (plan.feature_reports_advanced) features.push('Relatórios avançados');
    if (plan.feature_stock_control) features.push('Controle de estoque');
    if (plan.feature_ai_forecast) features.push('Previsões de IA');
    if (plan.feature_delivery_management) features.push('Gestão de entregas');
    
    return features;
  };

  if (isLoading || loadingPlans) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isTrialing = subscriptionStatus?.isTrialing;
  const isActive = subscriptionStatus?.status === 'active';
  const isExpired = subscriptionStatus?.status === 'expired' || subscriptionStatus?.status === 'none';
  const daysRemaining = getDaysRemaining();
  
  // User has a real Stripe subscription if they have active status (not just trialing without payment)
  // or if they completed checkout (have a product_id from Stripe)
  const hasStripeSubscription = isActive || (isTrialing && subscriptionStatus?.planId);

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Status da Assinatura
          </CardTitle>
          <CardDescription>
            Gerencie sua assinatura e plano atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status Atual</p>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {isTrialing && daysRemaining > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({daysRemaining} dias restantes)
                  </span>
                )}
              </div>
            </div>
            {subscriptionStatus?.planId && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Plano</p>
                <p className="font-medium">
                  {subscriptionStatus.planId.includes('free') ? 'Grátis' :
                   subscriptionStatus.planId.includes('starter') ? 'Starter' : 
                   subscriptionStatus.planId.includes('professional') ? 'Professional' : 
                   subscriptionStatus.planId.includes('enterprise') ? 'Enterprise' : 'Básico'}
                </p>
              </div>
            )}
          </div>

          {/* Trial Warning */}
          {isTrialing && daysRemaining <= 3 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-500">
                  Seu período de teste está acabando!
                </p>
                <p className="text-sm text-muted-foreground">
                  {daysRemaining === 0 
                    ? 'Seu período de teste expira hoje.' 
                    : `Restam apenas ${daysRemaining} dias de teste.`}
                  {' '}Faça upgrade para continuar usando todas as funcionalidades.
                </p>
              </div>
            </div>
          )}

          {/* Dates */}
          {(subscriptionStatus?.trialEndDate || subscriptionStatus?.currentPeriodEnd) && (
            <div className="grid gap-4 md:grid-cols-2">
              {isTrialing && subscriptionStatus.trialEndDate && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fim do Período de Teste</p>
                    <p className="font-medium">{formatDate(subscriptionStatus.trialEndDate)}</p>
                  </div>
                </div>
              )}
              {isActive && subscriptionStatus.currentPeriodEnd && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                    <p className="font-medium">{formatDate(subscriptionStatus.currentPeriodEnd)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manage Subscription Button - Only show when user has a real Stripe subscription */}
          {hasStripeSubscription && subscriptionStatus?.isSubscribed && (
            <Button variant="outline" onClick={handleManageSubscription} disabled={isOpeningPortal}>
              {isOpeningPortal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Abrindo...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Gerenciar Assinatura
                  <ExternalLink className="h-3 w-3 ml-2" />
                </>
              )}
            </Button>
          )}
          
          {/* Info message for users in automatic trial (no Stripe customer yet) */}
          {isTrialing && !hasStripeSubscription && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 border rounded-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Período de Teste Gratuito</p>
                <p className="text-sm text-muted-foreground">
                  Você está aproveitando o período de teste. Faça upgrade para um plano pago para ter acesso ao gerenciamento de assinatura.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Overview - Dynamic from database */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Disponíveis</CardTitle>
          <CardDescription>
            Compare os planos e escolha o melhor para seu negócio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, index) => {
              const isCurrent = isCurrentPlan(plan.slug);
              const isProfessional = plan.slug === 'professional';
              const features = getPlanFeatures(plan);
              
              return (
                <div 
                  key={plan.id}
                  className={`p-4 border rounded-lg space-y-4 relative transition-all ${
                    isProfessional ? 'border-2 border-primary' : ''
                  } ${isCurrent ? 'bg-primary/10 border-primary ring-2 ring-primary/30' : ''}`}
                >
                  {isProfessional && !isCurrent && (
                    <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">
                      Mais Popular
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="absolute -top-2 right-4 bg-green-500 text-white">
                      ✓ Plano Atual
                    </Badge>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{plan.name}</h3>
                  </div>
                  
                  <p className="text-2xl font-bold">
                    {plan.monthly_price === 0 ? (
                      'Grátis'
                    ) : (
                      <>
                        R$ {plan.monthly_price}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
                      </>
                    )}
                  </p>
                  
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                  
                  <ul className="text-sm space-y-2">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full"
                    variant={isCurrent ? 'secondary' : isProfessional ? 'default' : 'outline'}
                    disabled={isCurrent || isUpgrading === plan.id}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isUpgrading === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : isCurrent ? (
                      'Plano Atual'
                    ) : plan.monthly_price === 0 ? (
                      'Selecionar Grátis'
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
                        Fazer Upgrade
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Checkout Dialog for plan upgrade */}
      {selectedPlan && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          itemType="plan"
          itemId={selectedPlan.id}
          itemName={selectedPlan.name}
          itemPrice={selectedPlan.monthly_price}
        />
      )}
    </div>
  );
}
