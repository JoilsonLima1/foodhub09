import { Star } from 'lucide-react';

interface HeroBadgesProps {
  heroBadge?: string;
}

export function HeroBadges({ heroBadge = 'Plataforma #1 para Gestão de Negócios Grátis' }: HeroBadgesProps) {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      {/* Primary Badge - Dark Green Capsule */}
      <div className="inline-flex flex-col items-center justify-center px-8 py-4 rounded-full bg-[hsl(142_45%_18%)] border border-[hsl(142_40%_25%)] shadow-lg shadow-[hsl(142_40%_15%/0.3)]">
        <span className="text-sm md:text-base text-[hsl(142_50%_70%)] font-medium tracking-wide">
          Gerencie seu Negócio
        </span>
        <span className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(142_60%_55%)] my-1 tracking-tight">
          Grátis
        </span>
        <span className="text-sm md:text-base text-[hsl(142_50%_70%)] font-medium tracking-wide">
          para sempre
        </span>
      </div>

      {/* Secondary Badge - Gold/Primary Capsule (smaller) */}
      <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 shadow-md">
        <Star className="h-4 w-4 fill-primary text-primary" />
        <span className="text-sm md:text-base font-medium text-primary">
          {heroBadge}
        </span>
      </div>
    </div>
  );
}
