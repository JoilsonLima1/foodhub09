import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { usePublicTheme } from '@/hooks/usePublicTheme';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { WhatsAppButton } from '@/components/landing/WhatsAppButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ArrowRight, Sparkles } from 'lucide-react';
import { partnerExamples } from '@/components/landing/PartnersCarousel';
import fallbackLogo from '@/assets/logo.png';

export default function PublicClientes() {
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
            <Users className="h-3 w-3 mr-1" />
            Tipos de Negócios
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Empresas que <span className="text-primary">crescem</span> com o {companyName}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Exemplos de modelos de negócios que utilizam nossa plataforma para organizar e escalar suas operações.
          </p>
          
          {/* Institutional Text - No fake metrics */}
          <div className="bg-primary/5 rounded-xl px-6 py-4 max-w-2xl mx-auto">
            <p className="text-muted-foreground text-center">
              Plataforma em crescimento, desenvolvida para atender <span className="text-foreground font-medium">restaurantes, pizzarias, lanchonetes</span> e operações food service em todo o Brasil.
            </p>
          </div>
        </div>
      </section>

      {/* Illustrative Examples Grid */}
      <section className="py-16">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Segmentos Atendidos
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Nossa plataforma é flexível e adaptável para diversos tipos de estabelecimentos food service.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {partnerExamples.map((partner) => (
              <Card key={partner.name} className="hover:shadow-lg transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`h-14 w-14 rounded-xl ${partner.color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                      <span className="text-xl font-bold text-white">
                        {partner.initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{partner.name}</h3>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {partner.category}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Exemplo ilustrativo
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Transparency Disclaimer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              Os exemplos acima representam modelos de negócios que podem operar com o {companyName}. 
              São ilustrações de segmentos atendidos pela plataforma.
            </p>
          </div>
        </div>
      </section>

      {/* Authority Section */}
      <section className="py-16 bg-card/30 border-y border-border">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Sistema grátis para restaurantes
            </h2>
            <p className="text-muted-foreground mb-6">
              Desenvolvido para atender restaurantes, pizzarias, lanchonetes e operações food service 
              que buscam organização, eficiência e crescimento. Comece grátis e descubra como podemos 
              transformar a gestão do seu negócio.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="outline" className="px-4 py-2">
                PDV Completo
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Gestão de Pedidos
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Controle de Estoque
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Relatórios em Tempo Real
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Quer usar o {companyName} no seu negócio?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Crie sua conta grátis e tenha acesso completo por 30 dias. 
            Após o período, continue grátis com recursos essenciais.
          </p>
          <Link 
            to="/auth?tab=signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors group"
          >
            Começar Grátis
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Sem cartão de crédito • Cancele quando quiser
          </p>
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
