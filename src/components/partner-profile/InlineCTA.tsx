import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';

interface InlineCTAProps {
  signupUrl: string;
  whatsappUrl?: string;
  ctaText?: string;
}

export function InlineCTA({ signupUrl, whatsappUrl, ctaText = 'Começar Agora' }: InlineCTAProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center py-6">
      <Button size="lg" asChild>
        <Link to={signupUrl}>
          {ctaText}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
      {whatsappUrl && (
        <Button size="lg" variant="outline" asChild>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </a>
        </Button>
      )}
    </div>
  );
}
