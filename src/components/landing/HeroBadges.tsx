import { Star } from 'lucide-react';

interface HeroBadgesProps {
  heroBadge?: string;
}

export function HeroBadges({ heroBadge = 'Sistema Grátis para Restaurante — Comece Hoje' }: HeroBadgesProps) {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      {/* Badge - Gold/Primary Capsule */}
      <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 shadow-md">
        <Star className="h-4 w-4 fill-primary text-primary" />
        <span className="text-sm md:text-base font-medium text-primary">
          {heroBadge}
        </span>
      </div>
    </div>
  );
}
