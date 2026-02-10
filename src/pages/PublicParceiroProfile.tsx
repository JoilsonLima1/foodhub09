/**
 * PublicParceiroProfile - Public Partner Profile Page
 * 
 * Shows partner info and lead capture form for potential clients.
 * Route: /parceiros/:slug
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import {
  Loader2,
  Globe,
  ExternalLink,
  CheckCircle2,
  Send,
  Building2,
  Sparkles,
  Package,
  HeadphonesIcon,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
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
  };
  domains?: {
    marketing?: string;
    app?: string;
  };
  has_plans?: boolean;
}

const PARTNER_OFFERS = [
  {
    icon: Package,
    title: 'Sistema Completo',
    description: 'PDV, gestão de pedidos, estoque e muito mais.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Suporte Dedicado',
    description: 'Atendimento personalizado e acompanhamento.',
  },
  {
    icon: Shield,
    title: 'Segurança',
    description: 'Seus dados protegidos e backups automáticos.',
  },
];

export default function PublicParceiroProfile() {
  const { slug } = useParams<{ slug: string }>();
  
  useEffect(() => {
    resetThemeToDefault();
  }, []);
  
  usePublicTheme();
  
  const { branding: platformBranding } = usePublicSettings();
  const platformLogo = platformBranding.logo_url || fallbackLogo;
  const platformName = platformBranding.company_name || 'FoodHub09';

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch partner profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-partner-profile', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug not provided');
      
      const { data, error } = await supabase
        .rpc('get_public_partner_profile', { p_slug: slug });
      
      if (error) throw error;
      return data as unknown as PartnerProfile;
    },
    enabled: !!slug,
  });

  // Submit lead mutation
  const submitLead = useMutation({
    mutationFn: async () => {
      if (!profile?.partner_id) throw new Error('Partner not found');
      
      const { data, error } = await supabase
        .rpc('submit_partner_lead', {
          p_partner_id: profile.partner_id,
          p_name: formData.name,
          p_contact: formData.contact,
          p_message: formData.message || null,
          p_source_url: window.location.href,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success('Mensagem enviada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) {
      toast.error('Preencha nome e contato');
      return;
    }
    submitLead.mutate();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found
  if (!profile?.found) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader logoUrl={platformLogo} companyName={platformName} />
        <div className="container px-4 mx-auto pt-32 pb-16 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Parceiro não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            O parceiro que você está procurando não existe ou não está ativo.
          </p>
          <Button asChild>
            <Link to="/parceiros">Ver todos os parceiros</Link>
          </Button>
        </div>
        <LandingFooter logoUrl={platformLogo} companyName={platformName} />
      </div>
    );
  }

  const partnerName = profile.branding?.platform_name || profile.name || 'Parceiro';
  const partnerLogo = profile.branding?.logo_url || platformLogo;

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader logoUrl={platformLogo} companyName={platformName} />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary/10 to-background">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="shrink-0">
              <img 
                src={partnerLogo} 
                alt={partnerName}
                className="h-24 w-24 md:h-32 md:w-32 object-contain rounded-xl border bg-background p-2"
              />
            </div>
            <div className="text-center md:text-left flex-1">
              <Badge variant="secondary" className="mb-3">
                Parceiro Certificado
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{partnerName}</h1>
              {profile.branding?.tagline && (
                <p className="text-lg text-muted-foreground mb-3">{profile.branding.tagline}</p>
              )}
              
              {/* Domain links */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                {profile.domains?.marketing && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`https://${profile.domains.marketing}`} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Site
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
                {profile.domains?.app ? (
                  <InstallAppButton
                    partnerId={profile.partner_id}
                    partnerName={partnerName}
                    partnerSlug={profile.slug}
                    appDomain={profile.domains.app}
                    variant="outline"
                    size="sm"
                  />
                ) : (
                  <InstallAppButton
                    partnerId={profile.partner_id}
                    partnerName={partnerName}
                    partnerSlug={profile.slug}
                    variant="outline"
                    size="sm"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What partner offers */}
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            O que {partnerName} oferece
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {PARTNER_OFFERS.map((offer) => (
              <Card key={offer.title}>
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <offer.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{offer.title}</CardTitle>
                  <CardDescription>{offer.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form */}
      <section className="py-12 bg-muted/30">
        <div className="container px-4 mx-auto max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Quero ser cliente</CardTitle>
              <CardDescription>
                Preencha o formulário e {partnerName} entrará em contato
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <Alert className="border-primary bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    Mensagem enviada! {partnerName} entrará em contato em breve.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lead-name">Seu nome *</Label>
                    <Input
                      id="lead-name"
                      placeholder="Nome completo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={submitLead.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lead-contact">WhatsApp ou Email *</Label>
                    <Input
                      id="lead-contact"
                      placeholder="(11) 99999-9999 ou email@exemplo.com"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      required
                      disabled={submitLead.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lead-message">Mensagem (opcional)</Label>
                    <Textarea
                      id="lead-message"
                      placeholder="Conte um pouco sobre seu negócio..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={3}
                      disabled={submitLead.isPending}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitLead.isPending}>
                    {submitLead.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar mensagem
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Partner login footer */}
      <section className="py-8 border-t">
        <div className="container px-4 mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            É parceiro?{' '}
            <Link to="/partner/auth" className="text-primary hover:underline font-medium">
              Entrar no painel
            </Link>
          </p>
        </div>
      </section>

      <LandingFooter 
        logoUrl={platformLogo} 
        companyName={platformName}
        installApp={{
          partnerId: profile.partner_id,
          partnerName: partnerName,
          partnerSlug: profile.slug,
          appDomain: profile.domains?.app,
        }}
      />
    </div>
  );
}
