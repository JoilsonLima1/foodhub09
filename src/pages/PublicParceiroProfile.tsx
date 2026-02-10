/**
 * PublicParceiroProfile - Public Partner Sales Page
 * 
 * Renders the partner's published marketing page with lead capture.
 * Route: /parceiros/:slug
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { usePublicTheme } from '@/hooks/usePublicTheme';
import { resetThemeToDefault } from '@/hooks/useBusinessCategory';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Helmet } from 'react-helmet-async';
import {
  Loader2, CheckCircle2, Send, Building2, MessageCircle,
  Calendar, UserPlus, Download, Star, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { PlanComparisonTable } from '@/components/partner-profile/PlanComparisonTable';
import { StickyCTA } from '@/components/partner-profile/StickyCTA';
import { InlineCTA } from '@/components/partner-profile/InlineCTA';
import fallbackLogo from '@/assets/logo.png';

interface PartnerProfile {
  found: boolean;
  partner_id?: string;
  name?: string;
  slug?: string;
  branding?: {
    logo_url?: string;
    platform_name?: string;
    primary_color?: string;
    tagline?: string;
    support_email?: string;
    support_phone?: string;
  };
  domains?: { marketing?: string; app?: string };
  has_plans?: boolean;
}

export default function PublicParceiroProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  // Check if current user is the partner owner (for preview auth)
  const { data: isOwner } = useQuery({
    queryKey: ['partner-preview-auth', slug],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { count } = await (supabase as any)
        .from('partners')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('slug', slug || '');
      return (count || 0) > 0;
    },
    enabled: isPreview,
  });

  // Only allow preview if user is the partner owner
  const canPreview = isPreview && isOwner === true;

  useEffect(() => { resetThemeToDefault(); }, []);
  usePublicTheme();

  const { branding: platformBranding } = usePublicSettings();
  const platformLogo = platformBranding.logo_url || fallbackLogo;
  const platformName = platformBranding.company_name || 'FoodHub09';

  const [formData, setFormData] = useState({ name: '', contact: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(searchParams.get('plan'));
  // Fetch partner profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-partner-profile', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug not provided');
      const { data, error } = await supabase.rpc('get_public_partner_profile', { p_slug: slug });
      if (error) throw error;
      return data as unknown as PartnerProfile;
    },
    enabled: !!slug,
  });

  // Fetch marketing page
  const { data: marketingPage } = useQuery({
    queryKey: ['public-partner-marketing', profile?.partner_id],
    queryFn: async () => {
      if (!profile?.partner_id) return null;
      const { data, error } = await supabase
        .from('partner_marketing_pages')
        .select('*')
        .eq('partner_id', profile.partner_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.partner_id,
  });

  // Fetch partner plans
  const { data: plans } = useQuery({
    queryKey: ['public-partner-plans', profile?.partner_id],
    queryFn: async () => {
      if (!profile?.partner_id) return [];
      const { data, error } = await supabase
        .from('partner_plans')
        .select('*')
        .eq('partner_id', profile.partner_id)
        .eq('is_active', true)
        .eq('approval_status', 'approved' as any)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.partner_id,
  });

  // Submit lead with UTM tags
  const submitLead = useMutation({
    mutationFn: async () => {
      if (!profile?.partner_id) throw new Error('Partner not found');
      const utmSource = searchParams.get('utm_source') || '';
      const utmCampaign = searchParams.get('utm_campaign') || '';
      const { error } = await (supabase as any).rpc('submit_partner_lead', {
        p_partner_id: profile.partner_id,
        p_name: formData.name,
        p_contact: formData.contact,
        p_message: formData.message || null,
        p_source_url: window.location.href,
        p_metadata: {
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          referrer: document.referrer || null,
          page_path: window.location.pathname,
          selected_plan_id: selectedPlanId,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => { setIsSubmitted(true); toast.success('Mensagem enviada!'); },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) { toast.error('Preencha nome e contato'); return; }
    submitLead.mutate();
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.found) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader logoUrl={platformLogo} companyName={platformName} />
        <div className="container px-4 mx-auto pt-32 pb-16 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Parceiro não encontrado</h1>
          <p className="text-muted-foreground mb-6">O parceiro que você está procurando não existe ou não está ativo.</p>
          <Button asChild><Link to="/parceiros">Ver todos os parceiros</Link></Button>
        </div>
        <LandingFooter logoUrl={platformLogo} companyName={platformName} />
      </div>
    );
  }

  // If page is not published and not preview mode, show minimal page
  if (marketingPage && !marketingPage.published && !canPreview) {
    // fall through to generic page
  }

  const page = marketingPage;
  const partnerName = profile.branding?.platform_name || profile.name || 'Parceiro';
  const partnerLogo = profile.branding?.logo_url || platformLogo;
  const benefits = (page?.benefits as any[]) || [];
  const faqItems = (page?.faq_items as any[]) || [];
  const testimonials = (page?.testimonials as any[]) || [];
  const whatsapp = (page as any)?.whatsapp_number;
  const demoUrl = (page as any)?.demo_url;
  const signupUrl = (page as any)?.signup_url || (slug ? `/parceiros/${slug}/começar` : '/auth?intent=signup');

  // Featured or first plan for default CTA
  const defaultPlan = plans?.find((p: any) => p.is_featured) || plans?.[0];
  const defaultSignupUrl = defaultPlan ? `${signupUrl}${signupUrl.includes('?') ? '&' : '?'}plan=${defaultPlan.id}` : signupUrl;

  // WhatsApp with pre-filled message
  const buildWhatsappUrl = (planName?: string) => {
    if (!whatsapp) return '';
    const msg = planName
      ? `Olá! Tenho interesse no plano *${planName}* do ${partnerName}. Vi no site: ${window.location.href}`
      : `Olá! Tenho interesse nos serviços do ${partnerName}. Vi no site: ${window.location.href}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  };
  const defaultWhatsappUrl = buildWhatsappUrl();

  const seoTitle = page?.seo_title || `${partnerName} — Sistema completo para seu negócio`;
  const seoDesc = page?.seo_description || page?.hero_subtitle || `Conheça os planos e benefícios de ${partnerName}.`;
  const isPublished = !!marketingPage?.published;

  // Canonical: use partner's marketing domain if available, otherwise platform URL
  const marketingDomain = profile.domains?.marketing;
  const canonicalUrl = marketingDomain
    ? `https://${marketingDomain}`
    : `${window.location.origin}/parceiros/${slug}`;

  // Structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: partnerName,
        url: canonicalUrl,
        ...(partnerLogo ? { logo: partnerLogo } : {}),
        ...(profile.branding?.support_email ? { email: profile.branding.support_email } : {}),
        ...(profile.branding?.support_phone ? { telephone: profile.branding.support_phone } : {}),
      },
      {
        '@type': 'SoftwareApplication',
        name: `${partnerName} — Sistema de Gestão`,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: canonicalUrl,
        description: seoDesc,
        ...(plans && plans.length > 0 ? {
          offers: plans.map((plan: any) => ({
            '@type': 'Offer',
            name: plan.name,
            price: plan.is_free ? '0' : String(plan.monthly_price || 0),
            priceCurrency: 'BRL',
            ...(plan.description ? { description: plan.description } : {}),
          })),
        } : {}),
      },
      ...(faqItems.length > 0 ? [{
        '@type': 'FAQPage',
        mainEntity: faqItems.map((faq: any) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }] : []),
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* SEO */}
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        {!isPublished && <meta name="robots" content="noindex, nofollow" />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={canonicalUrl} />
        {partnerLogo && <meta property="og:image" content={partnerLogo} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        {partnerLogo && <meta name="twitter:image" content={partnerLogo} />}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Header with Install + Login */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={partnerLogo} alt={partnerName} className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg">{partnerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <InstallAppButton
              partnerId={profile.partner_id}
              partnerName={partnerName}
              partnerSlug={profile.slug}
              appDomain={profile.domains?.app}
              variant="outline"
              size="sm"
            />
            <Button asChild variant="ghost" size="sm">
              <Link to="/partner/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to={signupUrl}>
                <UserPlus className="h-4 w-4 mr-1" />
                Criar Conta
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {canPreview && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-accent text-accent-foreground text-center text-sm py-1 font-medium">
          ⚠️ Modo Preview — esta página não está publicada
        </div>
      )}

      {/* ===== HERO ===== */}
      <section className={`pt-32 pb-20 bg-gradient-to-b from-primary/10 to-background ${canPreview ? 'pt-40' : ''}`}>
        <div className="container px-4 mx-auto text-center max-w-3xl">
          {page?.hero_badge && (
            <Badge variant="secondary" className="mb-4 text-sm px-4 py-1">
              {page.hero_badge}
            </Badge>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            {page?.hero_title || 'Transforme seu negócio'}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {page?.hero_subtitle || 'Sistema completo para gestão do seu restaurante, bar ou loja.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to={defaultSignupUrl}>
                {page?.hero_cta_text || 'Começar Agora'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            {whatsapp && (
              <Button size="lg" variant="outline" asChild>
                <a href={defaultWhatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            )}
            {demoUrl && (
              <Button size="lg" variant="outline" asChild>
                <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Demo
                </a>
              </Button>
            )}
          </div>
          {page?.social_proof_text && (
            <p className="text-sm text-muted-foreground mt-6">{page.social_proof_text}</p>
          )}
        </div>
      </section>

      {/* ===== BENEFITS ===== */}
      {benefits.length > 0 && (
        <section className="py-16">
          <div className="container px-4 mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">
              {page?.benefits_title || 'Por que escolher nossa plataforma?'}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {benefits.map((b: any, i: number) => (
                <Card key={i} className="text-center">
                  <CardHeader>
                    <div className="text-4xl mb-2">{b.icon}</div>
                    <CardTitle>{b.title}</CardTitle>
                    <CardDescription>{b.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* Inline CTA after benefits */}
      {benefits.length > 0 && <InlineCTA signupUrl={defaultSignupUrl} whatsappUrl={whatsapp ? defaultWhatsappUrl : undefined} />}

      {/* ===== PLANS ===== */}
      {page?.show_pricing_section !== false && plans && plans.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container px-4 mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">Planos</h2>
            <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              {plans.map((plan: any) => (
                <Card key={plan.id} className={`relative ${plan.is_featured ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                  {plan.is_featured && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" /> Mais Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      {plan.is_free ? (
                        <span className="text-3xl font-bold">Grátis</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">
                            R$ {Number(plan.monthly_price).toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-muted-foreground">/mês</span>
                        </>
                      )}
                    </div>
                    {plan.trial_days > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.trial_days} dias grátis para testar
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm mb-6">
                      {plan.max_users && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Até {plan.max_users} usuários</li>}
                      {plan.max_products && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Até {plan.max_products} produtos</li>}
                      {plan.max_orders_per_month && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {plan.max_orders_per_month} pedidos/mês</li>}
                      {(plan.included_modules || []).length > 0 && (
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {plan.included_modules.length} módulos inclusos</li>
                      )}
                    </ul>
                    <Button className="w-full" variant={plan.is_featured ? 'default' : 'outline'} asChild>
                      <Link to={`/parceiros/${slug}/começar?plan=${plan.id}`}>
                        Escolher Plano
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== PLAN COMPARISON TABLE ===== */}
      {page?.show_pricing_section !== false && plans && plans.length >= 2 && (
        <PlanComparisonTable plans={plans} />
      )}

      {/* Inline CTA after plans */}
      {plans && plans.length > 0 && <InlineCTA signupUrl={defaultSignupUrl} whatsappUrl={whatsapp ? defaultWhatsappUrl : undefined} />}

      {/* ===== TESTIMONIALS ===== */}
      {page?.show_testimonials_section && testimonials.length > 0 && (
        <section className="py-16">
          <div className="container px-4 mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-10">O que nossos clientes dizem</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {testimonials.map((t: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <p className="italic text-muted-foreground mb-4">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {t.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* Inline CTA after testimonials */}
      {page?.show_testimonials_section && testimonials.length > 0 && <InlineCTA signupUrl={defaultSignupUrl} whatsappUrl={whatsapp ? defaultWhatsappUrl : undefined} />}

      {page?.show_faq_section !== false && faqItems.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container px-4 mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold text-center mb-10">{page?.faq_title || 'Perguntas Frequentes'}</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((faq: any, i: number) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left font-medium">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}
      {/* Inline CTA after FAQ */}
      {page?.show_faq_section !== false && faqItems.length > 0 && <InlineCTA signupUrl={defaultSignupUrl} whatsappUrl={whatsapp ? defaultWhatsappUrl : undefined} />}

      <section className="py-16">
        <div className="container px-4 mx-auto max-w-md text-center">
          <h2 className="text-3xl font-bold mb-2">{page?.cta_title || 'Pronto para começar?'}</h2>
          <p className="text-muted-foreground mb-8">{page?.cta_subtitle || 'Cadastre-se gratuitamente e comece a usar em minutos.'}</p>

          <div className="flex flex-wrap gap-3 justify-center mb-10">
            <Button size="lg" asChild>
              <Link to={defaultSignupUrl}>
                <UserPlus className="h-4 w-4 mr-2" />
                {page?.cta_button_text || 'Criar minha conta grátis'}
              </Link>
            </Button>
            {whatsapp && (
              <Button size="lg" variant="outline" asChild>
                <a href={defaultWhatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quero saber mais</CardTitle>
              <CardDescription>Preencha e {partnerName} entrará em contato</CardDescription>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <Alert className="border-primary bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription>Mensagem enviada! Entraremos em contato em breve.</AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <Label>Seu nome *</Label>
                    <Input
                      placeholder="Nome completo"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={submitLead.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp ou Email *</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formData.contact}
                      onChange={e => setFormData({ ...formData, contact: e.target.value })}
                      required
                      disabled={submitLead.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem (opcional)</Label>
                    <Textarea
                      placeholder="Conte sobre seu negócio..."
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      rows={3}
                      disabled={submitLead.isPending}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitLead.isPending}>
                    {submitLead.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Enviar
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 pb-24">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={partnerLogo} alt={partnerName} className="h-6 w-6 object-contain" />
              <span className="text-sm text-muted-foreground">{partnerName}</span>
            </div>
            <div className="flex items-center gap-4">
              <InstallAppButton
                partnerId={profile.partner_id}
                partnerName={partnerName}
                partnerSlug={profile.slug}
                appDomain={profile.domains?.app}
                variant="ghost"
                size="sm"
              />
              <Link to="/partner/auth" className="text-sm text-muted-foreground hover:text-foreground">
                Área do parceiro
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky CTA */}
      <StickyCTA signupUrl={defaultSignupUrl} ctaText={page?.hero_cta_text || 'Começar Agora'} />
    </div>
  );
}
