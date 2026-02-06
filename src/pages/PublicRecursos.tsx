import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { usePublicTheme } from '@/hooks/usePublicTheme';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { WhatsAppButton } from '@/components/landing/WhatsAppButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  ChefHat, 
  Truck, 
  BarChart3, 
  Package, 
  Users, 
  CreditCard, 
  Smartphone,
  QrCode,
  Bell,
  Zap,
  Shield,
  Clock,
  Globe,
  MessageSquare,
  Layers
} from 'lucide-react';
import fallbackLogo from '@/assets/logo.png';

const features = [
  {
    icon: ShoppingCart,
    title: 'PDV Completo',
    description: 'Ponto de venda profissional com controle de caixa, múltiplas formas de pagamento e integração com balanças e leitores de código de barras.',
    badge: 'Core',
  },
  {
    icon: ChefHat,
    title: 'Monitor de Cozinha',
    description: 'Acompanhe os pedidos em tempo real na cozinha. Organize a produção e melhore o tempo de entrega.',
    badge: 'Produção',
  },
  {
    icon: Truck,
    title: 'Gestão de Entregas',
    description: 'Gerencie entregadores, rotas e status de entregas. App exclusivo para entregadores com notificações push.',
    badge: 'Delivery',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Dashboards completos com análise de vendas, CMV, produtos mais vendidos e previsão de faturamento com IA.',
    badge: 'Analytics',
  },
  {
    icon: Package,
    title: 'Controle de Estoque',
    description: 'Gestão automática de estoque com alertas de baixa, histórico de movimentações e cálculo de CMV.',
    badge: 'Estoque',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Cadastro de clientes, histórico de pedidos, programa de fidelidade e segmentação para marketing.',
    badge: 'CRM',
  },
  {
    icon: QrCode,
    title: 'Comandas Digitais',
    description: 'Sistema de comandas por QR Code. Clientes fazem pedidos direto da mesa com pagamento integrado.',
    badge: 'Inovação',
  },
  {
    icon: CreditCard,
    title: 'Múltiplos Pagamentos',
    description: 'PIX, cartões, dinheiro, vouchers e vales. Integração com maquininhas e TEF.',
    badge: 'Financeiro',
  },
  {
    icon: Smartphone,
    title: 'Menu Digital',
    description: 'Cardápio online personalizado para seus clientes fazerem pedidos de qualquer lugar.',
    badge: 'Digital',
  },
  {
    icon: Bell,
    title: 'Notificações Inteligentes',
    description: 'Alertas automáticos para metas de vendas, estoque baixo e pedidos pendentes.',
    badge: 'Automação',
  },
  {
    icon: Globe,
    title: 'Multi-Lojas',
    description: 'Gerencie múltiplas filiais em um único painel com relatórios consolidados.',
    badge: 'Expansão',
  },
  {
    icon: Layers,
    title: 'Integrações',
    description: 'Conecte com iFood, marketplaces e outras plataformas de forma simples.',
    badge: 'Integração',
  },
];

const benefits = [
  {
    icon: Zap,
    title: 'Rápido e Intuitivo',
    description: 'Interface moderna que sua equipe aprende em minutos.',
  },
  {
    icon: Shield,
    title: 'Seguro e Confiável',
    description: 'Seus dados protegidos com criptografia de ponta.',
  },
  {
    icon: Clock,
    title: 'Suporte 24/7',
    description: 'Equipe dedicada para ajudar quando você precisar.',
  },
  {
    icon: MessageSquare,
    title: 'Atualizações Constantes',
    description: 'Novas funcionalidades toda semana sem custo extra.',
  },
];

export default function PublicRecursos() {
  useEffect(() => {
    resetThemeToDefault();
  }, []);
  
  usePublicTheme();
  
  const { branding } = usePublicSettings();
  
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <LandingHeader 
        logoUrl={logoUrl} 
        companyName={companyName}
      />

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container px-4 mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            Recursos Completos
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Tudo que você precisa para <span className="text-primary">gerenciar</span> seu negócio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Ferramentas profissionais para restaurantes, lanchonetes, pizzarias, bares e muito mais. 
            Simples de usar, poderoso nos resultados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/auth?tab=signup"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Começar Grátis
            </Link>
            <Link 
              to="/#planos"
              className="inline-flex items-center justify-center gap-2 border border-input bg-background px-6 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Ver Planos
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Funcionalidades</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Conheça todas as ferramentas disponíveis para você
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="secondary">{feature.badge}</Badge>
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-muted/50">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que escolher o {companyName}?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Mais do que um sistema, uma parceria para o sucesso do seu negócio
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Pronto para transformar seu negócio?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Comece agora gratuitamente. Sem cartão de crédito, sem compromisso.
          </p>
          <Link 
            to="/auth?tab=signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-medium text-lg hover:bg-primary/90 transition-colors"
          >
            Criar Minha Loja Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter 
        logoUrl={logoUrl}
        companyName={companyName}
      />

      {/* Floating WhatsApp */}
      <WhatsAppButton 
        phoneNumber="" 
        companyName={companyName}
        variant="floating"
      />
    </div>
  );
}
