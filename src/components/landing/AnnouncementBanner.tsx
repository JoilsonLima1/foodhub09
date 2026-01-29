import type { ReactNode } from 'react';
import {
  Crown,
  Gift,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type BannerStyle = 'gradient' | 'elegant' | 'minimal';

interface AnnouncementBannerProps {
  text: string;
  highlightText?: string;
  style: BannerStyle;
  isVisible: boolean;
  isPreview?: boolean;
}

const bannerIcons: Record<BannerStyle, ReactNode> = {
  gradient: <Gift className="h-5 w-5 md:h-6 md:w-6" />,
  elegant: <Crown className="h-5 w-5" />,
  minimal: <Zap className="h-5 w-5" />,
};

function isElegant(style: BannerStyle) {
  return style === 'elegant';
}

function isGlow(style: BannerStyle) {
  return style === 'gradient';
}

/**
 * Banner em formato de “chips/bolhas”, sem faixa (barra) full-width.
 * Mantém o seletor de estilos, aplicando variações sutis nas bolhas.
 */
export function AnnouncementBanner({
  text,
  highlightText,
  style,
  isVisible,
  isPreview = false,
}: AnnouncementBannerProps) {
  if (!isVisible || !text?.trim()) return null;

  const sectionClass = cn(isPreview ? 'py-4' : 'pt-24');

  const chipsBase =
    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium leading-none';

  const wrapperClass = cn(
    'relative inline-flex flex-wrap items-center justify-center gap-2 text-center',
    'rounded-2xl border bg-card/40 px-3 py-2',
    'backdrop-blur supports-[backdrop-filter]:bg-card/30',
    isGlow(style) && 'shadow-[0_0_32px_hsl(var(--primary)/0.22)]'
  );

  // Chips sem “amarelo chapado”
  const iconChipClass = cn(chipsBase, 'bg-primary/10 border-primary/30 text-primary');
  const textChipClass = cn(chipsBase, 'bg-background/40 border-border/60 text-foreground');
  const highlightChipClass = cn(chipsBase, 'bg-accent border-primary/25 text-primary');

  return (
    <section className={sectionClass}>
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex justify-center">
          <div className={wrapperClass}>
            {/* Decorações locais (sem faixa/strip) */}
            {isElegant(style) ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, transparent 50%, hsl(var(--primary) / 0.15) 100%)',
                }}
              />
            ) : null}

            <span className={iconChipClass} aria-hidden>
              {bannerIcons[style]}
            </span>
            <span className={textChipClass}>{text}</span>
            {highlightText?.trim() ? (
              <span className={highlightChipClass}>{highlightText}</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
