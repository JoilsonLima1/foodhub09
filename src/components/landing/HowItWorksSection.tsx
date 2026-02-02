import { Building2, Puzzle, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const steps = [
  {
    number: '01',
    icon: Building2,
    title: 'Crie sua Organização',
    description: 'Cadastre-se gratuitamente em minutos. Configure seu estabelecimento, cardápio e equipe.',
    color: 'from-emerald-500 to-green-500',
  },
  {
    number: '02',
    icon: Puzzle,
    title: 'Ative os Módulos do seu Plano',
    description: 'Cada plano já vem com funcionalidades essenciais inclusas. Comece a usar imediatamente.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    number: '03',
    icon: ShoppingBag,
    title: 'Adicione Módulos Extras',
    description: 'Precisa de mais recursos? Compre módulos avulsos na Loja quando seu negócio crescer.',
    color: 'from-primary to-yellow-500',
  },
];

export function HowItWorksSection() {
  const navigate = useNavigate();

  const scrollToModules = () => {
    document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="how-it-works" className="py-20 px-4 bg-gradient-to-b from-card/30 to-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Simples e Flexível
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Como <span className="text-primary">Funciona</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comece simples e evolua no seu ritmo. Sem contratos longos, sem surpresas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <div 
              key={step.number}
              className="relative group"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-muted-foreground/30 to-transparent" />
              )}
              
              <div className="bg-card border border-border rounded-2xl p-8 h-full transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30">
                {/* Number badge */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${step.color} text-white font-bold text-lg mb-6`}>
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="rounded-full"
              onClick={() => navigate('/auth?intent=signup')}
            >
              Criar Conta Grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="rounded-full"
              onClick={scrollToModules}
            >
              Ver Módulos e Preços
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
