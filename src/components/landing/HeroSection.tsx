import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import { HeroBadges } from './HeroBadges';
import { PublicHeroTitlePart, PublicHeroTitleHighlightStyle } from '@/hooks/usePublicSettings';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';

interface HeroTitleParts {
  top: PublicHeroTitlePart;
  middle: PublicHeroTitlePart;
  bottom: PublicHeroTitlePart;
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
  heroTitleParts?: HeroTitleParts;
}

const defaultTitleParts: HeroTitleParts = {
  top: { text: 'Transforme seu', color: 'inherit', highlight_style: 'none' },
  middle: { text: 'restaurante', color: '47 97% 60%', highlight_style: 'rounded' },
  bottom: { text: 'em uma máquina de vendas', color: '47 97% 60%', highlight_style: 'underline' },
};

function getHighlightClasses(style: PublicHeroTitleHighlightStyle): string {
  switch (style) {
    case 'underline':
      return 'border-b-4 border-current pb-1';
    case 'rounded':
      return 'bg-current/15 px-5 py-2 rounded-2xl';
    case 'pill':
      return 'bg-current/15 px-7 py-2 rounded-full';
    case 'thought':
      return 'relative bg-current/10 px-5 py-3 rounded-[2rem] before:content-[""] before:absolute before:-bottom-2 before:left-6 before:w-5 before:h-5 before:bg-current/10 before:rounded-full after:content-[""] after:absolute after:-bottom-5 after:left-3 after:w-3 after:h-3 after:bg-current/10 after:rounded-full';
    case 'bubble':
      return 'relative bg-current/15 px-5 py-3 rounded-[1.5rem] before:content-[""] before:absolute before:-bottom-3 before:left-8 before:border-[12px] before:border-transparent before:border-t-current/15';
    case 'marker':
      return 'bg-gradient-to-r from-yellow-400/40 to-yellow-200/20 px-3 py-1 -skew-x-2 rounded-lg';
    case 'glow':
      return 'drop-shadow-[0_0_25px_currentColor] drop-shadow-[0_0_50px_currentColor]';
    case 'gradient':
      return 'bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent';
    case 'box':
      return 'border-3 border-current px-5 py-2 rounded-xl';
    case 'circle':
      return 'bg-current/15 px-8 py-3 rounded-full inline-flex items-center justify-center';
    case 'scratch':
      return 'relative before:content-[""] before:absolute before:inset-0 before:bg-current/10 before:-skew-y-2 before:rounded-xl before:-z-10';
    default:
      return '';
  }
}

function HeroTitlePartRender({ 
  part, 
  size 
}: { 
  part: PublicHeroTitlePart; 
  size: 'sm' | 'md' | 'lg';
}) {
  const textColor = part.color === 'inherit' ? 'inherit' : `hsl(${part.color})`;
  
  const sizeClasses = {
    sm: 'text-2xl md:text-3xl lg:text-4xl',
    md: 'text-3xl md:text-4xl lg:text-5xl',
    lg: 'text-4xl md:text-5xl lg:text-6xl',
  };

  const highlightClasses = getHighlightClasses(part.highlight_style);

  return (
    <span 
      className={`${sizeClasses[size]} font-bold ${highlightClasses} inline-block leading-tight`}
      style={{ color: textColor }}
    >
      {part.text}
    </span>
  );
}

export function HeroSection({ 
  companyName, 
  trialDays, 
  trialText,
  heroBadge = 'Sistema Grátis para Restaurante — Comece Hoje',
  heroTitlePart1 = 'Transforme seu',
  heroTitlePart2 = 'restaurante',
  heroTitlePart3 = 'em uma',
  heroTitlePart4 = 'máquina de vendas',
  heroSubtitle = 'Sistema grátis completo para restaurantes. Gerencie pedidos, entregas, estoque e tome decisões inteligentes com relatórios em tempo real.',
  trustBadge1 = 'Comece 100% grátis',
  trustBadge2 = 'Cancele quando quiser',
  trustBadge3 = 'Suporte em português',
  socialProofText = 'Desenvolvido para restaurantes que querem crescer com o',
  heroTitleParts,
}: HeroSectionProps) {
  const navigate = useNavigate();

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Use new 3-part system if available, otherwise fallback to legacy 4-part
  const useLegacyTitle = !heroTitleParts;
  const titleParts = heroTitleParts || defaultTitleParts;

  return (
    <section className="pt-24 pb-16 md:pb-24 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center">
          {/* New Hero Badges Component */}
          <HeroBadges heroBadge={heroBadge} />
          
          {useLegacyTitle ? (
            /* Legacy 4-Part Title */
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
          ) : (
            /* New 3-Part Title with Styles */
            <h1 className="mb-8 leading-tight tracking-tight space-y-2">
              <div className="block">
                <HeroTitlePartRender part={titleParts.top} size="md" />
              </div>
              <div className="block">
                <HeroTitlePartRender part={titleParts.middle} size="lg" />
              </div>
              <div className="block">
                <HeroTitlePartRender part={titleParts.bottom} size="md" />
              </div>
            </h1>
          )}
          
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
              onClick={() => navigate('/auth?plan=free&intent=signup')}
            >
              Começar Grátis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg h-16 px-10 rounded-full group"
              onClick={() => navigate('/planos')}
            >
              <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Ver Planos
            </Button>
            <InstallAppButton
              variant="outline"
              size="lg"
              className="text-lg h-16 px-10 rounded-full"
            />
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Plano grátis disponível • Teste todos os recursos por 30 dias • Continue grátis após o período
          </p>
          
          <p className="text-sm text-muted-foreground mt-6">
            {socialProofText} <span className="text-primary font-semibold">{companyName}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
