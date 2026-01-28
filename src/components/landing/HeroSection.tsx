import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Gift, Star, Play, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  companyName: string;
  trialDays: number;
  trialText: string;
  heroBadge?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  trustBadge1?: string;
  trustBadge2?: string;
  trustBadge3?: string;
  socialProofText?: string;
}

export function HeroSection({ 
  companyName, 
  trialDays, 
  trialText,
  heroBadge = 'Plataforma #1 para Gestão de Restaurantes',
  heroTitle = 'Transforme seu restaurante em uma máquina de vendas',
  heroSubtitle = 'Unifique pedidos de múltiplas origens, gerencie entregas, controle estoque e tome decisões inteligentes com relatórios em tempo real e previsões com IA.',
  trustBadge1 = 'Sem cartão de crédito',
  trustBadge2 = 'Cancele quando quiser',
  trustBadge3 = 'Suporte em português',
  socialProofText = 'Mais de 500+ restaurantes já confiam no',
}: HeroSectionProps) {
  const navigate = useNavigate();

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Trial Banner */}
      <section className="pt-24">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 py-4 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
          <div className="container mx-auto max-w-6xl text-center relative">
            <p className="text-lg md:text-xl font-bold text-primary-foreground flex items-center justify-center gap-2 flex-wrap">
              <Gift className="h-6 w-6 animate-bounce" />
              Use TODAS as funcionalidades por 
              <span className="text-2xl md:text-3xl underline decoration-4 decoration-primary-foreground/50 mx-1">{trialDays} DIAS GRÁTIS</span>
              — Teste, venda, conheça o sistema sem compromisso!
            </p>
          </div>
        </div>
      </section>

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
              {heroTitle.split(' ').map((word, index) => {
                // Highlight words like "restaurante" and "máquina de vendas"
                if (word.toLowerCase() === 'restaurante') {
                  return (
                    <span key={index} className="text-primary relative">
                      {word}
                      <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 10" fill="none">
                        <path d="M0 8 Q50 0, 100 8 T200 8" stroke="currentColor" strokeWidth="3" className="text-primary/30"/>
                      </svg>
                    </span>
                  );
                }
                return <span key={index}>{word} </span>;
              })}
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
