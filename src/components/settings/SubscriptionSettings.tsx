import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Calendar, CreditCard, ExternalLink, Loader2, AlertTriangle, Check, Clock, Gift, Receipt, Wallet } from 'lucide-react';
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
  const { subscriptionStatus, isLoading, getDaysRemaining, getTrialStartDisplay, getExpirationDisplay } = useTrialStatus();
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

    if (plan.monthly_price === 0) {
      toast({
        title: 'Plano Grátis',
        description: 'Você já está utilizando o plano gratuito. Para mais recursos, escolha um plano pago.',
      });
      return;
    }

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

    const { status, hasContractedPlan, tenantPlanId, tenantPlanName } = subscriptionStatus;

    switch (status) {
      case 'active':
        return (
          <div className="flex items-center gap-2 flex-wrap">
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
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Gift className="h-3 w-3 mr-1" />
              Período de Teste Gratuito
            </Badge>
            {(hasContractedPlan || tenantPlanId) && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <Check className="h-3 w-3 mr-1" />
                Plano Contratado: {tenantPlanName || 'Ativo'}
              </Badge>
            )}
          </div>
        );
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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getPaymentMethodLabel = (method: string | null): string => {
    if (!method) return 'N/A';
    const labels: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      boleto: 'Boleto Bancário',
      multiple: 'Múltiplos Métodos',
      unknown: 'Não Identificado',
    };
    return labels[method] || method;
  };

  const getPaymentStatusLabel = (status: string | null): string => {
    if (!status) return 'N/A';
    const labels: Record<string, string> = {
      confirmed: 'Confirmado',
      pending: 'Pendente',
      paid: 'Pago',
      failed: 'Falhou',
    };
    return labels[status] || status;
  };

  const isCurrentPlan = (planId: string) => {
    // SINGLE SOURCE OF TRUTH: Use tenantPlanId directly from the database
    if (subscriptionStatus?.tenantPlanId === planId) {
      return true;
    }
    // Fallback to check planId from edge function (Stripe product_id)
    // This handles legacy Stripe subscriptions
    if (subscriptionStatus?.planId === planId) {
      return true;
    }
    return false;
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
  const daysRemaining = subscriptionStatus?.daysRemaining || 0;
  const daysUsed = subscriptionStatus?.daysUsed || 0;
  const totalTrialDays = subscriptionStatus?.totalTrialDays || 14;
  const hasContractedPlan = subscriptionStatus?.hasContractedPlan || !!subscriptionStatus?.tenantPlanId;
  const hasTrialBenefit = subscriptionStatus?.hasTrialBenefit;
  const trialBenefitMessage = subscriptionStatus?.trialBenefitMessage;
  const tenantPlanName = subscriptionStatus?.tenantPlanName;
  const paymentInfo = subscriptionStatus?.paymentInfo;
  
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
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge()}
              </div>
            </div>
            <div className="text-right space-y-1">
              {isTrialing && (
                <div>
                  <p className="text-sm text-muted-foreground">Dias restantes</p>
                  <p className="font-medium text-blue-600 text-lg">
                    {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contracted Plan Display - Single Source of Truth */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className={`flex items-center gap-3 p-4 border rounded-lg ${hasContractedPlan ? 'border-green-500/30 bg-green-500/5' : ''}`}>
              <Crown className={`h-5 w-5 ${hasContractedPlan ? 'text-green-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Plano Contratado</p>
                {hasContractedPlan && tenantPlanName ? (
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-green-600">{tenantPlanName}</p>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                      Ativo
                    </Badge>
                  </div>
                ) : (
                  <p className="font-medium text-muted-foreground">Nenhum plano contratado</p>
                )}
              </div>
            </div>

            {/* Contracted Date */}
            {hasContractedPlan && paymentInfo?.lastPaymentAt && (
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Contratado em</p>
                  <p className="font-medium">{formatDateTime(paymentInfo.lastPaymentAt)}</p>
                </div>
              </div>
            )}

            {/* Next Payment Date */}
            {hasContractedPlan && subscriptionStatus?.currentPeriodEnd && (
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isActive ? 'Próxima Renovação' : 'Próximo Pagamento'}
                  </p>
                  <p className="font-medium">{formatDate(subscriptionStatus.currentPeriodEnd)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Trial Details Card */}
          {isTrialing && (
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-700 dark:text-blue-400">Detalhes do Período de Teste</h4>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Data de Início</p>
                  <p className="font-medium">{getTrialStartDisplay() || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total de Dias Grátis</p>
                  <p className="font-medium">{totalTrialDays} dias</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Data Final do Teste</p>
                  <p className="font-medium">{getExpirationDisplay() || 'N/A'}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dias utilizados</p>
                    <p className="font-medium">{daysUsed} dias</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                  <Gift className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dias restantes</p>
                    <p className="font-medium text-blue-600">{daysRemaining} dias</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trial Benefit Message (when user has contracted a plan during trial) */}
          {hasContractedPlan && hasTrialBenefit && trialBenefitMessage && (
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-500">
                  Benefício do Período de Teste
                </p>
                <p className="text-sm text-muted-foreground">
                  Você contratou o plano {tenantPlanName || 'selecionado'}, mas ainda possui {daysRemaining} dias restantes de teste gratuito. Após isso, inicia seu ciclo pago.
                </p>
              </div>
            </div>
          )}

          {/* Trial Warning */}
          {isTrialing && daysRemaining <= 3 && !hasContractedPlan && (
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
                  {' '}Contrate um plano para continuar usando todas as funcionalidades.
                </p>
              </div>
            </div>
          )}

          {/* Manage Subscription Button */}
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
          
          {/* Info message for users in trial without plan */}
          {isTrialing && !hasContractedPlan && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 border rounded-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Período de Teste Gratuito</p>
                <p className="text-sm text-muted-foreground">
                  Você está aproveitando o período de teste. Contrate um plano pago para garantir acesso contínuo após o término do teste.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Information Card */}
      {hasContractedPlan && paymentInfo && paymentInfo.lastPaymentAt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Informações de Pagamento
            </CardTitle>
            <CardDescription>
              Detalhes do último pagamento confirmado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Pagamento Confirmado em</p>
                  <p className="font-medium">{formatDateTime(paymentInfo.lastPaymentAt)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-medium">{getPaymentMethodLabel(paymentInfo.lastPaymentMethod)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Gateway</p>
                  <p className="font-medium capitalize">{paymentInfo.lastPaymentProvider || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Status da Cobrança</p>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    {getPaymentStatusLabel(paymentInfo.lastPaymentStatus)}
                  </Badge>
                </div>
              </div>
            </div>
            
            {paymentInfo.asaasPaymentId && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">ID da Cobrança</p>
                <p className="font-mono text-sm">{paymentInfo.asaasPaymentId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Plan Card (if user has one) */}
      {hasContractedPlan && subscriptionStatus?.tenantPlanId && (
        <Card className="border-green-500/30 ring-2 ring-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Seu Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plans.filter(p => p.id === subscriptionStatus.tenantPlanId).map(plan => {
              const features = getPlanFeatures(plan);
              return (
                <div key={plan.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                      <Badge className="bg-green-500 text-white">
                        ✓ Plano Atual
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold">
                      R$ {plan.monthly_price}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {features.slice(0, 4).map((feature, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {features.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{features.length - 4} mais
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Plans Overview - Dynamic from database */}
      <Card>
        <CardHeader>
          <CardTitle>
            {hasContractedPlan ? 'Fazer Upgrade' : 'Planos Disponíveis'}
          </CardTitle>
          <CardDescription>
            {hasContractedPlan 
              ? 'Escolha um plano superior para mais recursos'
              : 'Compare os planos e escolha o melhor para seu negócio'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan.id);
              const isProfessional = plan.slug === 'professional';
              const features = getPlanFeatures(plan);
              
              return (
                <div 
                  key={plan.id}
                  className={`p-4 border rounded-lg space-y-4 relative transition-all ${
                    isProfessional && !isCurrent ? 'border-2 border-primary' : ''
                  } ${isCurrent ? 'bg-green-500/5 border-green-500/30 ring-2 ring-green-500/20' : ''}`}
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
                    variant={isCurrent ? 'outline' : isProfessional ? 'default' : 'outline'}
                    disabled={isCurrent || isUpgrading === plan.id}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isUpgrading === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : isCurrent ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Plano Atual
                      </>
                    ) : plan.monthly_price === 0 ? (
                      'Selecionar Grátis'
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
                        {hasContractedPlan ? 'Fazer Upgrade' : 'Contratar Plano'}
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
