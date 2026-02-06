import { useEffect } from 'react';
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
import fallbackLogo from '@/assets/logo.png';

export default function PublicPlanos() {
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

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container px-4 mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            Planos e Preços
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Escolha o plano <span className="text-primary">ideal</span> para seu negócio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comece grátis e evolua conforme seu negócio cresce. Todos os planos incluem {trialDays} dias de teste sem compromisso.
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
