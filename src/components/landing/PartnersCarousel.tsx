import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

// Imaginary partner brands
const partners = [
  { name: 'Pizzaria Bella Napoli', initials: 'BN', color: 'bg-red-500' },
  { name: 'Burger Kingdom', initials: 'BK', color: 'bg-amber-600' },
  { name: 'Sushi Master', initials: 'SM', color: 'bg-pink-500' },
  { name: 'Cantina da Nonna', initials: 'CN', color: 'bg-green-600' },
  { name: 'Taco Fiesta', initials: 'TF', color: 'bg-orange-500' },
  { name: 'Açaí do Ponto', initials: 'AP', color: 'bg-purple-600' },
  { name: 'Frango & Cia', initials: 'FC', color: 'bg-yellow-600' },
  { name: 'Doceria Encanto', initials: 'DE', color: 'bg-rose-400' },
  { name: 'Churrasco Prime', initials: 'CP', color: 'bg-red-700' },
  { name: 'Massa Fresca', initials: 'MF', color: 'bg-emerald-500' },
  { name: 'Espetinho Show', initials: 'ES', color: 'bg-orange-600' },
  { name: 'Lanches Express', initials: 'LE', color: 'bg-blue-500' },
];

export default function PartnersCarousel() {
  const [count, setCount] = useState(0);
  const targetCount = 1247;

  // Animated counter effect
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = targetCount / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCount) {
        setCount(targetCount);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 px-4 bg-card/30 border-y border-border overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        {/* Stats Badge */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-full px-6 py-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary">
                +{count.toLocaleString('pt-BR')}
              </p>
              <p className="text-sm text-muted-foreground">
                estabelecimentos já confiam em nós
              </p>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm uppercase tracking-widest mb-2">
            Parceiros de Sucesso
          </p>
          <h3 className="text-xl md:text-2xl font-semibold">
            Empresas que crescem com a gente
          </h3>
        </div>

        {/* Infinite Carousel */}
        <div className="relative">
          {/* Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
          
          {/* Scrolling Container */}
          <div className="flex animate-scroll">
            {/* First set of logos */}
            {[...partners, ...partners].map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="flex-shrink-0 mx-4 group"
              >
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300 hover:scale-105 w-32">
                  <div 
                    className={`w-14 h-14 rounded-xl ${partner.color} flex items-center justify-center shadow-lg`}
                  >
                    <span className="text-xl font-bold text-white">
                      {partner.initials}
                    </span>
                  </div>
                  <p className="text-xs text-center text-muted-foreground font-medium line-clamp-2">
                    {partner.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
