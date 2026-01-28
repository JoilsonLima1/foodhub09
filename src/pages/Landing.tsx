import { useState, useEffect } from 'react';
import { usePublicSubscriptionPlans } from '@/hooks/usePublicSubscriptionPlans';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import fallbackLogo from '@/assets/logo.png';
import PartnersCarousel from '@/components/landing/PartnersCarousel';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { CategoriesSection } from '@/components/landing/CategoriesSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { AdvantagesSection } from '@/components/landing/AdvantagesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { AddonModulesSection } from '@/components/landing/AddonModulesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { AIChatWidget } from '@/components/landing/AIChatWidget';
import { WhatsAppButton } from '@/components/landing/WhatsAppButton';

export default function Landing() {
  // IMPORTANT: Reset theme to default on landing page mount
  // Landing page colors must be controlled ONLY by super admin settings, not by any tenant theme
  useEffect(() => {
    resetThemeToDefault();
  }, []);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { plans, isLoading } = usePublicSubscriptionPlans();
  const { branding, trialPeriod, landingLayout } = usePublicSettings();
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
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* Hero Section */}
      <HeroSection 
        companyName={companyName}
        trialDays={trialDays}
        trialText={trialText}
        heroBadge={landingLayout.hero_badge}
        heroTitle={landingLayout.hero_title}
        heroTitleHighlight={landingLayout.hero_title_highlight}
        heroSubtitle={landingLayout.hero_subtitle}
        trustBadge1={landingLayout.trust_badge_1}
        trustBadge2={landingLayout.trust_badge_2}
        trustBadge3={landingLayout.trust_badge_3}
        socialProofText={landingLayout.social_proof_text}
        announcementBanner={landingLayout.announcement_banner}
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

      {/* Addon Modules Section */}
      <AddonModulesSection />

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

      {/* AI Chat Widget - floating button on right */}
      <AIChatWidget 
        companyName={companyName} 
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />
    </div>
  );
}
