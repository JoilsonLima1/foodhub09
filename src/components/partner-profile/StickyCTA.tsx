import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StickyCTAProps {
  signupUrl: string;
  ctaText?: string;
}

export function StickyCTA({ signupUrl, ctaText = 'Começar Agora' }: StickyCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t py-3 px-4 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <div className="container mx-auto flex items-center justify-between gap-4 max-w-3xl">
        <p className="text-sm font-medium hidden sm:block">Pronto para transformar seu negócio?</p>
        <Button size="lg" asChild className="w-full sm:w-auto">
          <Link to={signupUrl}>
            {ctaText}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
