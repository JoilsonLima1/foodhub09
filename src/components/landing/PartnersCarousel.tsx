// Illustrative partner examples - NOT real clients
// These represent types of businesses that can use the platform
export const partnerExamples = [
  { name: 'Pizzaria Bella Napoli', initials: 'BN', color: 'bg-red-500', category: 'Pizzaria' },
  { name: 'Burger Kingdom', initials: 'BK', color: 'bg-amber-600', category: 'Hamburgueria' },
  { name: 'Sushi Master', initials: 'SM', color: 'bg-pink-500', category: 'Japonês' },
  { name: 'Cantina da Nonna', initials: 'CN', color: 'bg-green-600', category: 'Italiano' },
  { name: 'Taco Fiesta', initials: 'TF', color: 'bg-orange-500', category: 'Mexicano' },
  { name: 'Açaí do Ponto', initials: 'AP', color: 'bg-purple-600', category: 'Açaí' },
  { name: 'Frango & Cia', initials: 'FC', color: 'bg-yellow-600', category: 'Frangos' },
  { name: 'Doceria Encanto', initials: 'DE', color: 'bg-rose-400', category: 'Doceria' },
  { name: 'Churrasco Prime', initials: 'CP', color: 'bg-red-700', category: 'Churrascaria' },
  { name: 'Massa Fresca', initials: 'MF', color: 'bg-emerald-500', category: 'Massas' },
  { name: 'Espetinho Show', initials: 'ES', color: 'bg-orange-600', category: 'Espetinhos' },
  { name: 'Lanches Express', initials: 'LE', color: 'bg-blue-500', category: 'Lanchonete' },
];

export default function PartnersCarousel() {
  return (
    <section className="py-16 px-4 bg-card/30 border-y border-border overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        {/* Section Title - No fake counters */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm uppercase tracking-widest mb-2">
            Tipos de Negócios
          </p>
          <h3 className="text-xl md:text-2xl font-semibold">
            Modelos de negócios que operam com nossa plataforma
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Exemplos ilustrativos de segmentos atendidos pelo sistema
          </p>
        </div>

        {/* Infinite Carousel */}
        <div className="relative">
          {/* Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
          
          {/* Scrolling Container */}
          <div className="flex animate-scroll">
            {/* First set of logos */}
            {[...partnerExamples, ...partnerExamples].map((partner, index) => (
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
                  <span className="text-[10px] text-muted-foreground/60">
                    {partner.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
