import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Star, Play, CheckCircle2 } from 'lucide-react';
import { AnnouncementBanner, type BannerStyle } from './AnnouncementBanner';

interface AnnouncementBannerConfig {
  is_visible: boolean;
  text: string;
  highlight_text: string;
  style: BannerStyle;
}

interface HeroSectionProps {
  companyName: string;
  trialDays: number;
  trialText: string;
  heroBadge?: string;
  heroTitlePart1?: string;
  heroTitlePart2?: string;
  heroTitlePart3?: string;
  heroTitlePart4?: string;
  heroSubtitle?: string;
  trustBadge1?: string;
  trustBadge2?: string;
  trustBadge3?: string;
  socialProofText?: string;
  announcementBanner?: AnnouncementBannerConfig;
}

export function HeroSection({ 
  companyName, 
  trialDays, 
  trialText,
  heroBadge = 'Plataforma #1 para Gestão de Restaurantes',
  heroTitlePart1 = 'Transforme seu',
  heroTitlePart2 = 'restaurante',
  heroTitlePart3 = 'em uma',
  heroTitlePart4 = 'máquina de vendas',
  heroSubtitle = 'Unifique pedidos de múltiplas origens, gerencie entregas, controle estoque e tome decisões inteligentes com relatórios em tempo real e previsões com IA.',
  trustBadge1 = 'Sem cartão de crédito',
  trustBadge2 = 'Cancele quando quiser',
  trustBadge3 = 'Suporte em português',
  socialProofText = 'Mais de 500+ restaurantes já confiam no',
  announcementBanner,
}: HeroSectionProps) {
  const navigate = useNavigate();

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Default banner config if not provided
  const bannerConfig: AnnouncementBannerConfig = announcementBanner || {
    is_visible: true,
    text: `Use TODAS as funcionalidades por ${trialDays} DIAS GRÁTIS — Teste, venda, conheça o sistema sem compromisso!`,
    highlight_text: '',
    style: 'gradient',
  };

  return (
    <>
      {/* Announcement Banner */}
      <AnnouncementBanner
        text={bannerConfig.text}
        highlightText={bannerConfig.highlight_text}
        style={bannerConfig.style}
        isVisible={bannerConfig.is_visible}
      />

      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center">
            <Badge variant="outline" className="mb-8 border-primary/50 text-primary px-6 py-2 text-sm">
              <Star className="h-4 w-4 mr-2 fill-primary" />
              {heroBadge}
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight tracking-tight">
              {heroTitlePart1 && <span className="text-foreground">{heroTitlePart1} </span>}
              {heroTitlePart2 && <span className="text-primary">{heroTitlePart2} </span>}
              {heroTitlePart3 && <span className="text-foreground">{heroTitlePart3} </span>}
              {heroTitlePart4 && (
                <span className="text-primary relative">
                  {heroTitlePart4}
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 10" fill="none">
                    <path d="M0 8 Q50 0, 100 8 T200 8" stroke="currentColor" strokeWidth="3" className="text-primary/30"/>
                  </svg>
                </span>
              )}
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-10 leading-relaxed">
              {heroSubtitle}
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>{trustBadge1}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>{trustBadge2}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>{trustBadge3}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg h-16 px-10 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all group"
                onClick={scrollToPricing}
              >
                Começar Agora - {trialText}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg h-16 px-10 rounded-full group"
                onClick={() => navigate('/auth?intent=signup')}
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Ver Demonstração
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-6">
              {socialProofText} <span className="text-primary font-semibold">{companyName}</span>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
