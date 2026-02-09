/**
 * PartnerLanding - White-label landing page for partner domains
 * 
 * This page renders a fully branded landing experience using
 * the partner's branding, marketing content, and plans.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublicPartner } from '@/contexts/PublicPartnerContext';
import { usePublicPartnerPlans } from '@/hooks/usePartnerResolution';
import { usePublicAddonModules } from '@/hooks/usePublicAddonModules';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowRight, Check, Gift, Star, Zap, Shield, Clock, Users, Eye } from 'lucide-react';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PartnerLanding() {
  const navigate = useNavigate();
  const { partner, isLoading: partnerLoading, isPublished } = usePublicPartner();
  const { data: plans = [], isLoading: plansLoading } = usePublicPartnerPlans(partner?.partnerId || null);
  const { modules: addonModules } = usePublicAddonModules();

  const branding = partner?.branding;
  const marketing = partner?.marketingPage;
  
  // Determine if this is preview mode (not published)
  const isPreviewMode = !isPublished;

  // Redirect to main landing if not a partner domain
  useEffect(() => {
    if (!partnerLoading && !partner) {
      navigate('/', { replace: true });
    }
  }, [partnerLoading, partner, navigate]);

  if (partnerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  const platformName = branding?.platform_name || partner.partnerName;
  const logoUrl = branding?.logo_url;
  const heroTitle = marketing?.hero_title || branding?.hero_title || 'Transforme seu negócio';
  const heroSubtitle = marketing?.hero_subtitle || branding?.hero_subtitle || 'A plataforma completa para gestão do seu estabelecimento.';
  const heroBadge = marketing?.hero_badge;
  const ctaText = marketing?.hero_cta_text || 'Começar Agora';
  const faqItems = marketing?.faq_items || [];
  const showPricing = marketing?.show_pricing_section !== false;
  const showFaq = marketing?.show_faq_section !== false && faqItems.length > 0;
  const showModules = marketing?.show_modules_section !== false;
  const poweredByEnabled = branding?.powered_by_enabled !== false;
  const poweredByText = branding?.powered_by_text || 'Powered by FoodHub09';

  // SEO data
  const seoTitle = marketing?.seo_title || branding?.meta_title || `${platformName} - Sistema de Gestão`;
  const seoDescription = marketing?.seo_description || branding?.meta_description || heroSubtitle;
  const ogImage = branding?.og_image_url;

  // Find free plan for highlight
  const freePlan = plans.find(p => p.is_free);
  const paidPlans = plans.filter(p => !p.is_free);

  const handleSignup = (planSlug?: string) => {
    const params = new URLSearchParams();
    params.set('partner', partner.partnerSlug);
    if (planSlug) params.set('plan', planSlug);
    params.set('intent', 'signup');
    navigate(`/signup?${params.toString()}`);
  };

  // Build canonical URL from partner domain (marketing domain)
  const canonicalDomain = partner?.branding?.platform_name 
    ? `https://${window.location.hostname}` 
    : window.location.origin;

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        
        {/* Canonical & Robots - only indexable if published */}
        <link rel="canonical" href={canonicalDomain} />
        <meta name="robots" content={isPreviewMode ? "noindex, nofollow" : "index, follow"} />
        
        {/* Keywords */}
        {marketing?.seo_keywords && marketing.seo_keywords.length > 0 && (
          <meta name="keywords" content={marketing.seo_keywords.join(', ')} />
        )}
        
        {/* Open Graph */}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalDomain} />
        <meta property="og:site_name" content={platformName} />
        <meta property="og:locale" content="pt_BR" />
        {ogImage && <meta property="og:image" content={ogImage} />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        
        {/* Schema.org - Organization */}
        {marketing?.schema_org && (
          <script type="application/ld+json">
            {JSON.stringify(marketing.schema_org)}
          </script>
        )}
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className="bg-warning/10 border-b border-warning/30 py-2 px-4">
            <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-warning" />
              <span className="font-medium text-warning">Modo Preview</span>
              <span className="text-muted-foreground">
                — Esta página não está publicada e não será indexada pelos motores de busca.
              </span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={platformName} className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-2xl font-bold text-primary">{platformName}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Entrar
              </Button>
              <Button onClick={() => handleSignup()}>
                {ctaText}
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
          <div className="container mx-auto max-w-5xl relative text-center">
            {heroBadge && (
              <Badge variant="outline" className="mb-6 text-sm px-4 py-1">
                {heroBadge}
              </Badge>
            )}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {heroTitle}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              {heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg h-14 px-8 rounded-full shadow-lg"
                onClick={() => handleSignup(freePlan?.slug)}
              >
                <Gift className="mr-2 h-5 w-5" />
                {freePlan ? `Começar Grátis - ${freePlan.trial_days} dias` : ctaText}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <InstallAppButton
                partnerId={partner.partnerId}
                partnerName={platformName}
                partnerSlug={partner.partnerSlug}
                appDomain={null}
                variant="outline"
                size="lg"
                className="text-lg h-14 px-8 rounded-full"
              />
            </div>
            
            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-success" />
                <span>Cancele quando quiser</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-success" />
                <span>Suporte dedicado</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        {showPricing && (
          <section id="pricing" className="py-20 px-4 bg-muted/30">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4">Planos</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Escolha o plano ideal para seu negócio
                </h2>
              </div>

              {plansLoading ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-96" />
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.map((plan, index) => {
                    const isPopular = index === 1 || plan.name.toLowerCase().includes('profissional');
                    return (
                      <Card 
                        key={plan.id} 
                        className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''}`}
                      >
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary">
                              <Star className="h-3 w-3 mr-1" />
                              Mais Popular
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="text-center pb-4">
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                          <div className="pt-4">
                            <span className="text-4xl font-bold">
                              {plan.is_free ? 'Grátis' : `R$ ${plan.monthly_price}`}
                            </span>
                            {!plan.is_free && <span className="text-muted-foreground">/mês</span>}
                          </div>
                          {plan.trial_days > 0 && (
                            <Badge variant="secondary" className="mt-2">
                              {plan.trial_days} dias grátis
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <ul className="space-y-3">
                            {plan.max_users && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-success shrink-0" />
                                <span>Até {plan.max_users} usuários</span>
                              </li>
                            )}
                            {plan.max_products && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-success shrink-0" />
                                <span>Até {plan.max_products} produtos</span>
                              </li>
                            )}
                            {plan.max_orders_per_month && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-success shrink-0" />
                                <span>Até {plan.max_orders_per_month} pedidos/mês</span>
                              </li>
                            )}
                            {plan.included_features?.slice(0, 5).map((feature: string, i: number) => (
                              <li key={i} className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-success shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <Button 
                            className="w-full mt-4" 
                            variant={isPopular ? 'default' : 'outline'}
                            onClick={() => handleSignup(plan.slug)}
                          >
                            {plan.is_free ? 'Começar Grátis' : 'Escolher Plano'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Modules Section */}
        {showModules && addonModules.length > 0 && (
          <section className="py-20 px-4">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4">Módulos</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Expanda com módulos adicionais
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Adicione funcionalidades específicas conforme sua necessidade
                </p>
              </div>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {addonModules.slice(0, 8).map(module => (
                  <Card key={module.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{module.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {module.description}
                      </p>
                      <p className="text-sm font-semibold mt-2 text-primary">
                        +R$ {module.monthly_price}/mês
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {showFaq && (
          <section className="py-20 px-4 bg-muted/30">
            <div className="container mx-auto max-w-3xl">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4">FAQ</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {marketing?.faq_title || 'Perguntas Frequentes'}
                </h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item: any, index: number) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
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
        )}

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {marketing?.cta_title || 'Pronto para começar?'}
              </h2>
              {marketing?.cta_subtitle && (
                <p className="text-xl text-muted-foreground mb-8">
                  {marketing.cta_subtitle}
                </p>
              )}
              <Button 
                size="lg" 
                className="text-lg h-14 px-10 rounded-full"
                onClick={() => handleSignup(freePlan?.slug)}
              >
                {marketing?.cta_button_text || 'Criar minha conta grátis'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t bg-muted/20">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt={platformName} className="h-8 w-auto object-contain" />
                ) : (
                  <span className="text-lg font-bold">{platformName}</span>
                )}
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {branding?.terms_url && (
                  <a href={branding.terms_url} className="hover:text-foreground">
                    Termos de Uso
                  </a>
                )}
                {branding?.privacy_url && (
                  <a href={branding.privacy_url} className="hover:text-foreground">
                    Privacidade
                  </a>
                )}
                {branding?.support_email && (
                  <a href={`mailto:${branding.support_email}`} className="hover:text-foreground">
                    Suporte
                  </a>
                )}
              </div>
            </div>
            {poweredByEnabled && (
              <div className="text-center mt-8 text-sm text-muted-foreground">
                {poweredByText}
              </div>
            )}
            {branding?.footer_text && (
              <div className="text-center mt-4 text-xs text-muted-foreground">
                {branding.footer_text}
              </div>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
