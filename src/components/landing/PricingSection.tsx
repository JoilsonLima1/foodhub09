import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, TrendingUp, Crown, Gift, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PublicSubscriptionPlan } from '@/hooks/usePublicSubscriptionPlans';
import { CheckoutDialog } from '@/components/checkout/CheckoutDialog';
import { extractPlanFeatures } from '@/lib/planFeatures';
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PublicSubscriptionPlan | null>(null);

  const handleSubscribe = async (plan: PublicSubscriptionPlan) => {
    setLoadingPlan(plan.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not logged in - redirect to signup with plan param
        navigate(`/auth?plan=${plan.slug}&intent=signup`);
        return;
      }
      
      if (plan.monthly_price === 0) {
        // Free plan - just go to dashboard
        navigate('/dashboard');
        return;
      }
      
      // Open checkout dialog with payment method selection
      setSelectedPlan(plan);
      setCheckoutOpen(true);
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
   * Uses centralized utility for consistency across all screens
   */
  const getPlanFeatures = (plan: PublicSubscriptionPlan): string[] => {
    return extractPlanFeatures(plan as unknown as Record<string, unknown>);
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
                      onClick={() => handleSubscribe(plan)}
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

      {/* Checkout Dialog */}
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
    </section>
  );
}
