import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, MessageCircle } from 'lucide-react';

interface LandingHeaderProps {
  logoUrl: string;
  companyName: string;
  whatsappNumber?: string;
}

export function LandingHeader({ logoUrl, companyName, whatsappNumber }: LandingHeaderProps) {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const handleWhatsApp = () => {
    if (whatsappNumber) {
      window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=Olá! Gostaria de saber mais sobre o ${companyName}`, '_blank');
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt={companyName} className="h-16 w-auto" />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent hidden sm:block">
            {companyName}
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          <button onClick={() => scrollTo('features')} className="text-foreground/80 hover:text-primary transition-colors font-medium">
            Recursos
          </button>
          <button onClick={() => scrollTo('categories')} className="text-foreground/80 hover:text-primary transition-colors font-medium">
            Categorias
          </button>
          <button onClick={() => scrollTo('advantages')} className="text-foreground/80 hover:text-primary transition-colors font-medium">
            Vantagens
          </button>
          <button onClick={() => scrollTo('pricing')} className="text-foreground/80 hover:text-primary transition-colors font-medium">
            Planos
          </button>
          <button onClick={() => scrollTo('faq')} className="text-foreground/80 hover:text-primary transition-colors font-medium">
            FAQ
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {whatsappNumber && (
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden md:flex border-success text-success hover:bg-success hover:text-success-foreground"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/auth?intent=login')} className="hidden sm:flex">
            Entrar
          </Button>
          <Button onClick={() => scrollTo('pricing')} className="hidden sm:flex">
            Ver Planos
          </Button>
          
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-background/98 backdrop-blur-md border-t border-border animate-fade-in">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
            <button onClick={() => scrollTo('features')} className="text-left py-2 text-foreground/80 hover:text-primary transition-colors font-medium">
              Recursos
            </button>
            <button onClick={() => scrollTo('categories')} className="text-left py-2 text-foreground/80 hover:text-primary transition-colors font-medium">
              Categorias
            </button>
            <button onClick={() => scrollTo('advantages')} className="text-left py-2 text-foreground/80 hover:text-primary transition-colors font-medium">
              Vantagens
            </button>
            <button onClick={() => scrollTo('pricing')} className="text-left py-2 text-foreground/80 hover:text-primary transition-colors font-medium">
              Planos
            </button>
            <button onClick={() => scrollTo('faq')} className="text-left py-2 text-foreground/80 hover:text-primary transition-colors font-medium">
              FAQ
            </button>
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              {whatsappNumber && (
                <Button variant="outline" className="w-full border-success text-success" onClick={handleWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Falar no WhatsApp
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => navigate('/auth?intent=login')}>
                Entrar
              </Button>
              <Button className="w-full" onClick={() => scrollTo('pricing')}>
                Ver Planos
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
