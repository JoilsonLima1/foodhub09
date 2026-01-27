import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, ArrowRight, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import fallbackLogo from '@/assets/logo.png';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branding } = usePublicSettings();
  const [isVerifying, setIsVerifying] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    planName?: string;
    nextBilling?: string;
  } | null>(null);

  // Use dynamic branding or fallback
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';

  useEffect(() => {
    const verifySubscription = async () => {
      const sessionId = searchParams.get('session_id');
      
      // Give Stripe a moment to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to get subscription info
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get any subscription info from the database
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*, subscription_plans(*)')
          .maybeSingle();
        
        if (subscription && subscription.subscription_plans) {
          const plan = subscription.subscription_plans as { name: string };
          setSubscriptionInfo({
            planName: plan.name,
            nextBilling: subscription.current_period_end 
              ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
              : undefined,
          });
        }
      }
      
      setIsVerifying(false);
    };

    verifySubscription();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex justify-center mb-4">
            <img src={logoUrl} alt={companyName} className="h-16 w-auto object-contain" />
          </div>
          
          {isVerifying ? (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
              <CardTitle className="text-2xl">Processando sua assinatura...</CardTitle>
              <CardDescription>
                Aguarde enquanto confirmamos seu pagamento.
              </CardDescription>
            </>
          ) : (
            <>
              <div className="relative">
                <CheckCircle className="h-20 w-20 mx-auto text-green-500" />
                <PartyPopper className="h-8 w-8 absolute top-0 right-1/3 text-yellow-500 animate-bounce" />
              </div>
              <CardTitle className="text-3xl text-green-600">
                Assinatura Confirmada!
              </CardTitle>
              <CardDescription className="text-lg">
                Bem-vindo ao {companyName}! Sua jornada começa agora.
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!isVerifying && (
            <>
              {subscriptionInfo?.planName && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">Plano selecionado</p>
                  <p className="text-xl font-bold text-primary">{subscriptionInfo.planName}</p>
                  {subscriptionInfo.nextBilling && (
                    <p className="text-sm text-muted-foreground">
                      Próxima cobrança: {subscriptionInfo.nextBilling}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold">Próximos passos:</h3>
                <ul className="text-left space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Configure os dados do seu estabelecimento</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Cadastre seus produtos e categorias</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Convide sua equipe para usar o sistema</span>
                  </li>
                </ul>
              </div>

              <Button 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Acessar o Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-muted-foreground">
                Você receberá um e-mail de confirmação com os detalhes da sua assinatura.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
