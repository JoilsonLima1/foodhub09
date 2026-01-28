import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import fallbackLogo from '@/assets/logo.png';
import PartnersCarousel from '@/components/landing/PartnersCarousel';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { CategoriesSection } from '@/components/landing/CategoriesSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { AdvantagesSection } from '@/components/landing/AdvantagesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { AIChatWidget } from '@/components/landing/AIChatWidget';
import { WhatsAppButton } from '@/components/landing/WhatsAppButton';

export default function Landing() {
  const { plans, isLoading } = useSubscriptionPlans();
  const { branding, trialPeriod } = usePublicSettings();
  const { whatsapp } = useSystemSettings();

  // Use dynamic branding or fallback
  const logoUrl = branding.logo_url || fallbackLogo;
  const companyName = branding.company_name || 'FoodHub09';
  const trialDays = trialPeriod.days || 14;
  const trialText = trialPeriod.highlight_text || `${trialDays} dias grátis`;
  
  // Get WhatsApp number from system settings
  const whatsappNumber = whatsapp?.number || undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <LandingHeader 
        logoUrl={logoUrl} 
        companyName={companyName} 
        whatsappNumber={whatsappNumber}
      />

      {/* Hero Section */}
      <HeroSection 
        companyName={companyName}
        trialDays={trialDays}
        trialText={trialText}
      />

      {/* Partners Carousel */}
      <PartnersCarousel />

      {/* Features Section */}
      <FeaturesSection />

      {/* Categories Section */}
      <CategoriesSection />

      {/* Advantages Section */}
      <AdvantagesSection />

      {/* Pricing Section */}
      <PricingSection 
        plans={plans}
        isLoading={isLoading}
        trialDays={trialDays}
        trialText={trialText}
      />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <CTASection 
        companyName={companyName}
        trialDays={trialDays}
        whatsappNumber={whatsappNumber}
      />

      {/* Footer */}
      <LandingFooter 
        logoUrl={logoUrl}
        companyName={companyName}
        whatsappNumber={whatsappNumber}
      />

      {/* Floating WhatsApp Button */}
      {whatsappNumber && (
        <WhatsAppButton 
          phoneNumber={whatsappNumber}
          companyName={companyName}
          variant="floating"
        />
      )}

      {/* AI Chat Widget */}
      <AIChatWidget companyName={companyName} />
    </div>
  );
}
