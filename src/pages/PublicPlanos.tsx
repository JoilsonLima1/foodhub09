import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { usePublicTheme } from '@/hooks/usePublicTheme';
import { usePublicSubscriptionPlans } from '@/hooks/usePublicSubscriptionPlans';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { WhatsAppButton } from '@/components/landing/WhatsAppButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Gift } from 'lucide-react';
import fallbackLogo from '@/assets/logo.png';

export default function PublicPlanos() {
  const navigate = useNavigate();
  
  useEffect(() => {
    resetThemeToDefault();
  }, []);
  
  usePublicTheme();
  
  const { branding, trialPeriod } = usePublicSettings();
  const { plans, isLoading } = usePublicSubscriptionPlans();
  
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';
  const trialDays = trialPeriod.days || 14;
  const trialText = trialPeriod.highlight_text || `${trialDays} dias grátis`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <LandingHeader 
        logoUrl={logoUrl} 
        companyName={companyName}
      />

      {/* Hero Section with prominent CTA */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container px-4 mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            Planos e Preços
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Escolha o plano <span className="text-primary">ideal</span> para seu negócio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Comece grátis e evolua conforme seu negócio cresce.
          </p>
          
          {/* Explanatory badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm">
          <Badge variant="secondary" className="px-4 py-2">
            <Gift className="h-4 w-4 mr-2" />
            Sistema grátis para restaurante
          </Badge>
          <Badge variant="outline" className="px-4 py-2">
            Teste todos os recursos por 30 dias
          </Badge>
          <Badge variant="outline" className="px-4 py-2">
            Continue grátis após o período
          </Badge>
          </div>
          
          {/* Prominent CTA Button */}
          <Button 
            size="lg" 
            className="text-lg h-14 px-8 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all group"
            onClick={() => navigate('/auth?plan=free&intent=signup')}
          >
            <Gift className="mr-2 h-5 w-5" />
            Começar Grátis
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            Plano grátis disponível • Teste todos os recursos por 30 dias • Continue grátis com recursos essenciais
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection 
        plans={plans}
        isLoading={isLoading}
        trialDays={trialDays}
        trialText={trialText}
      />

      {/* FAQ Section */}
      <FAQSection />

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
