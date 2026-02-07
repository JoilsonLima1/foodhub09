import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Gift } from 'lucide-react';
import { WhatsAppButton } from './WhatsAppButton';
import { SuggestionForm } from '@/components/suggestions/SuggestionForm';

interface CTASectionProps {
  companyName: string;
  trialDays: number;
  whatsappNumber?: string;
}

export function CTASection({ companyName, trialDays, whatsappNumber }: CTASectionProps) {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto max-w-4xl relative">
        <div className="text-center p-12 rounded-3xl bg-gradient-to-br from-card via-card to-card/50 border border-primary/20 shadow-2xl shadow-primary/10">
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            <Gift className="h-4 w-4" />
            Oferta Especial
          </span>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pronto para revolucionar seu negócio?
          </h2>
          
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Junte-se a centenas de restaurantes que já transformaram suas operações com o {companyName}.
          </p>
          
          <div className="inline-block p-4 rounded-2xl bg-primary/10 border border-primary/30 mb-8">
            <p className="text-2xl font-bold text-primary">
              🎁 {trialDays} dias grátis com acesso a TODAS as funcionalidades!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button 
              size="lg" 
              className="text-lg h-16 px-10 rounded-full shadow-lg shadow-primary/30 group"
              onClick={() => navigate('/auth?plan=free&intent=signup')}
            >
              <Gift className="mr-2 h-5 w-5" />
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {whatsappNumber && (
              <WhatsAppButton 
                phoneNumber={whatsappNumber} 
                companyName={companyName}
                variant="inline"
                className="h-16 px-10 rounded-full text-lg"
              />
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Sem cartão de crédito • Cancele quando quiser • Suporte incluído
          </p>

          {/* Suggestion Form */}
          <div className="mt-8 pt-6 border-t border-primary/20">
            <p className="text-sm text-muted-foreground mb-3">
              Tem alguma sugestão ou feedback? Adoraríamos ouvir você!
            </p>
            <SuggestionForm
              source="landing"
              triggerVariant="ghost"
              triggerClassName="text-primary hover:text-primary/80"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
