import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Shield, TrendingUp, ChefHat, Truck, BarChart3, Crown, ArrowRight, Star, Gift } from 'lucide-react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import fallbackLogo from '@/assets/logo.png';
import PartnersCarousel from '@/components/landing/PartnersCarousel';

export default function Landing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plans, isLoading } = useSubscriptionPlans();
  const { branding, trialPeriod } = usePublicSettings();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Use dynamic branding or fallback
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';
  const trialDays = trialPeriod.days || 14;
  const trialText = trialPeriod.highlight_text || `${trialDays} dias grátis`;

  const handleSubscribe = async (planId: string, planSlug: string, isFree: boolean) => {
    setLoadingPlan(planId);
    
    try {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to auth with plan info
        navigate(`/auth?plan=${planSlug}&intent=signup`);
        return;
      }
      
      // If free plan, just redirect to dashboard
      if (isFree) {
        navigate('/dashboard');
        return;
      }
      
      // Call checkout edge function for paid plans
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

  const features = [
    {
      icon: ChefHat,
      title: 'Gestão de Pedidos',
      description: 'Unifique pedidos de múltiplas origens: online, PDV, WhatsApp e marketplaces.'
    },
    {
      icon: Truck,
      title: 'Entregas Otimizadas',
      description: 'Dashboard para entregadores e gestão completa de rotas e entregas.'
    },
    {
      icon: BarChart3,
      title: 'Relatórios Avançados',
      description: 'Análises detalhadas de vendas, CMV e previsões com inteligência artificial.'
    },
    {
      icon: Shield,
      title: 'Antifraude Integrado',
      description: 'Sistema robusto de detecção de duplicidades e proteção de pagamentos.'
    }
  ];

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'free': return Gift;
      case 'starter': return Zap;
      case 'professional': return TrendingUp;
      case 'enterprise': return Crown;
      default: return Zap;
    }
  };

  const getPlanFeatures = (slug: string) => {
    switch (slug) {
      case 'free':
        return [
          'Até 1 usuário',
          'PDV básico',
          'Até 20 produtos',
          'Até 50 pedidos/mês',
          'Suporte por email'
        ];
      case 'starter':
        return [
          'Até 3 usuários',
          'PDV completo',
          'Painel da cozinha',
          'Gestão de entregas',
          'Relatórios básicos',
          'Suporte via email'
        ];
      case 'professional':
        return [
          'Até 10 usuários',
          'Tudo do Starter +',
          'Controle de estoque',
          'App do entregador',
          'Relatórios avançados',
          'Relatório CMV',
          'Suporte prioritário'
        ];
      case 'enterprise':
        return [
          'Usuários ilimitados',
          'Tudo do Professional +',
          'Previsão com IA',
          'Metas e notificações',
          'Multi-unidades',
          'Acesso à API',
          'White Label',
          'Integrações personalizadas'
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt={companyName} className="h-14 w-auto" />
            <span className="text-2xl font-bold text-primary">{companyName}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth?intent=login')}>
              Entrar
            </Button>
            <Button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver Planos
            </Button>
          </div>
        </div>
      </header>

      {/* Highlight Banner */}
      <section className="pt-20 mt-16">
        <div className="bg-gradient-to-r from-primary via-primary to-primary/80 py-4 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <p className="text-lg md:text-xl font-bold text-primary-foreground animate-pulse">
              🎁 Tenha em seu restaurante, pizzaria ou lanchonete o <span className="underline decoration-2">MELHOR SISTEMA DO MERCADO</span> — <span className="text-2xl md:text-3xl">GRÁTIS</span>, sem pegadinha!
            </p>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="pt-12 pb-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge variant="outline" className="mb-6 border-primary text-primary">
            <Star className="h-3 w-3 mr-1 fill-primary" />
            Plataforma #1 para Delivery
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Transforme seu <span className="text-primary">restaurante</span> em uma{' '}
            <span className="text-primary">máquina de vendas</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Unifique pedidos de múltiplas origens, gerencie entregas, controle estoque e 
            tome decisões inteligentes com relatórios em tempo real.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg h-14 px-8"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Começar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg h-14 px-8"
              onClick={() => navigate('/auth?intent=signup')}
            >
              Teste Grátis por {trialDays} Dias
            </Button>
          </div>
        </div>
      </section>

      {/* Partners Carousel */}
      <PartnersCarousel />

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma plataforma completa para gerenciar seu negócio de alimentação
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Escolha o plano ideal para o tamanho do seu negócio. 
              Planos pagos incluem {trialDays} dias grátis para você testar.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans?.filter(p => p.is_active).sort((a, b) => a.display_order - b.display_order).map((plan) => {
                const Icon = getPlanIcon(plan.slug);
                const isPopular = plan.slug === 'professional';
                const isFree = plan.monthly_price === 0;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative bg-card border-border flex flex-col ${
                      isPopular ? 'border-primary ring-2 ring-primary/20' : ''
                    } ${isFree ? 'border-green-500/50' : ''}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          Mais Popular
                        </Badge>
                      </div>
                    )}
                    {isFree && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-green-500 text-white">
                          Grátis para Sempre
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto h-14 w-14 rounded-full ${isFree ? 'bg-green-500/10' : 'bg-primary/10'} flex items-center justify-center mb-4`}>
                        <Icon className={`h-7 w-7 ${isFree ? 'text-green-500' : 'text-primary'}`} />
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
                            <span className="text-5xl font-bold text-green-500">Grátis</span>
                          </div>
                        ) : (
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-muted-foreground">R$</span>
                            <span className="text-5xl font-bold">{plan.monthly_price}</span>
                            <span className="text-muted-foreground">/mês</span>
                          </div>
                        )}
                      </div>
                      <ul className="space-y-3">
                        {getPlanFeatures(plan.slug).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <Check className={`h-5 w-5 ${isFree ? 'text-green-500' : 'text-primary'} shrink-0 mt-0.5`} />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="pt-4">
                      <Button 
                        className="w-full" 
                        size="lg"
                        variant={isFree ? 'outline' : isPopular ? 'default' : 'outline'}
                        onClick={() => handleSubscribe(plan.id, plan.slug, isFree)}
                        disabled={loadingPlan === plan.id}
                      >
                        {loadingPlan === plan.id ? (
                          <span className="animate-spin mr-2">⏳</span>
                        ) : null}
                        {isFree ? 'Começar Grátis' : 'Começar Agora'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="text-center text-muted-foreground mt-8">
            Planos pagos incluem <strong>{trialText}</strong>. 
            Cancele a qualquer momento.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para revolucionar seu negócio?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Junte-se a centenas de restaurantes que já transformaram suas operações com o {companyName}.
          </p>
          <Button 
            size="lg" 
            className="text-lg h-14 px-8"
            onClick={() => navigate('/auth?intent=signup')}
          >
            Criar Conta Grátis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt={companyName} className="h-10 w-auto" />
              <span className="text-lg font-bold text-primary">{companyName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
