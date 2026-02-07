/**
 * PublicParceiros - Partner Program Landing Page (Marketing)
 * 
 * Public page showcasing the partner program with benefits,
 * how it works, FAQ and CTA to create partner account.
 */

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
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Handshake,
  TrendingUp,
  Palette,
  CreditCard,
  Globe,
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Rocket,
  Shield,
  Banknote,
  HeadphonesIcon,
  Clock,
} from 'lucide-react';
import fallbackLogo from '@/assets/logo.png';

const BENEFITS = [
  {
    icon: Banknote,
    title: 'Comissões Recorrentes',
    description: 'Ganhe comissão sobre cada pagamento dos seus clientes, todo mês.',
  },
  {
    icon: Palette,
    title: '100% White-label',
    description: 'Sua marca, seu logo, suas cores. Seus clientes nem sabem que somos nós.',
  },
  {
    icon: Globe,
    title: 'Domínio Próprio',
    description: 'Use seu domínio personalizado para app e site de vendas.',
  },
  {
    icon: CreditCard,
    title: 'Você Define os Preços',
    description: 'Crie seus próprios planos e defina quanto cobrar.',
  },
  {
    icon: Shield,
    title: 'Suporte Técnico Incluso',
    description: 'Nós cuidamos da infraestrutura, você cuida das vendas.',
  },
  {
    icon: TrendingUp,
    title: 'Repasses Automáticos',
    description: 'Receba suas comissões automaticamente via PIX.',
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Crie sua conta',
    description: 'Cadastre-se gratuitamente e acesse o painel de parceiro.',
    icon: Users,
  },
  {
    step: 2,
    title: 'Configure sua marca',
    description: 'Personalize logo, cores e domínios para sua operação.',
    icon: Palette,
  },
  {
    step: 3,
    title: 'Crie seus planos',
    description: 'Defina preços e recursos para oferecer aos seus clientes.',
    icon: CreditCard,
  },
  {
    step: 4,
    title: 'Comece a vender',
    description: 'Cadastre clientes e receba comissões automaticamente.',
    icon: Rocket,
  },
];

const FAQ_ITEMS = [
  {
    question: 'Preciso pagar para ser parceiro?',
    answer: 'Não! O programa de parceiros é 100% gratuito. Você só ganha quando seus clientes pagam.',
  },
  {
    question: 'Quanto posso ganhar?',
    answer: 'Você define seus próprios preços. A margem é sua. Exemplo: se cobra R$149/mês do cliente e o custo base é R$49, você fica com R$100.',
  },
  {
    question: 'Como recebo minhas comissões?',
    answer: 'As comissões são calculadas automaticamente e transferidas para sua conta via PIX, conforme a frequência que você escolher (semanal, quinzenal ou mensal).',
  },
  {
    question: 'Preciso dar suporte técnico?',
    answer: 'Você pode escolher. Oferecemos suporte técnico de segundo nível, mas muitos parceiros preferem atender seus clientes diretamente para fortalecer o relacionamento.',
  },
  {
    question: 'Posso usar meu próprio domínio?',
    answer: 'Sim! Você pode configurar seu domínio para a landing page e para o app dos seus clientes. Tudo fica com a sua marca.',
  },
  {
    question: 'Quantos clientes posso ter?',
    answer: 'Não há limite! Quanto mais clientes você trouxer, mais você ganha.',
  },
];

export default function PublicParceiros() {
  useEffect(() => {
    resetThemeToDefault();
  }, []);
  
  usePublicTheme();
  
  const { branding } = usePublicSettings();
  
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader logoUrl={logoUrl} companyName={companyName} />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary/10 via-primary/5 to-background">
        <div className="container px-4 mx-auto text-center">
          <Badge variant="outline" className="mb-4 border-primary text-primary">
            <Handshake className="h-3 w-3 mr-1" />
            Programa de Parceiros
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Ganhe vendendo o <span className="text-primary">sistema</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Revenda nossa plataforma com sua marca, seus preços e seus clientes. 
            Receba comissões recorrentes sem precisar desenvolver nada.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/parceiros/cadastrar">
                <Sparkles className="h-5 w-5 mr-2" />
                Criar conta de parceiro
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <a href="#como-funciona">
                Saiba como funciona
                <ArrowRight className="h-5 w-5 ml-2" />
              </a>
            </Button>
          </div>
          
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              100% Gratuito
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Comissões Recorrentes
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              White-label Completo
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que ser parceiro?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tudo o que você precisa para criar sua própria operação de software para restaurantes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <Card key={benefit.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="como-funciona" className="py-16 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Como funciona</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Em 4 passos simples você começa a vender e ganhar.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative mx-auto mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                    {item.step}
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg">
              <Link to="/parceiros/cadastrar">
                Começar agora
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container px-4 mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Perguntas frequentes</h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container px-4 mx-auto text-center">
          <Handshake className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-lg opacity-90 max-w-xl mx-auto mb-8">
            Crie sua conta de parceiro gratuitamente e comece a ganhar vendendo 
            o melhor sistema para restaurantes do mercado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-8">
              <Link to="/parceiros/cadastrar">
                <Sparkles className="h-5 w-5 mr-2" />
                Criar conta de parceiro
              </Link>
            </Button>
          </div>
          <p className="text-sm opacity-70 mt-4">
            Sem taxas de adesão • Comece a ganhar hoje
          </p>
        </div>
      </section>

      <LandingFooter logoUrl={logoUrl} companyName={companyName} />
      
      <WhatsAppButton phoneNumber="" companyName={companyName} variant="floating" />
    </div>
  );
}
