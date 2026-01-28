import type { ReactNode } from 'react';
import {
  Camera,
  Cloud,
  Crown,
  Diamond,
  Flame,
  Gift,
  Heart,
  Leaf,
  Moon,
  PartyPopper,
  Rocket,
  Sparkles,
  Star,
  Sun,
  Target,
  Waves,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type BannerStyle =
  | 'gradient'
  | 'minimal'
  | 'glass'
  | 'ribbon'
  | 'badge'
  | 'glow'
  | 'bubbles'
  | 'circles'
  | 'neon'
  | 'stripes'
  | 'confetti'
  | 'wave'
  | 'sparkle'
  | 'geometric'
  | 'aurora'
  | 'pulse'
  | 'retro'
  | 'cyber'
  | 'elegant'
  | 'festive'
  | 'sunset'
  | 'ocean'
  | 'forest'
  | 'fire'
  | 'holographic';

interface AnnouncementBannerProps {
  text: string;
  highlightText?: string;
  style: BannerStyle;
  isVisible: boolean;
  isPreview?: boolean;
}

const bannerIcons: Record<BannerStyle, ReactNode> = {
  gradient: <Gift className="h-5 w-5 md:h-6 md:w-6" />,
  minimal: <Zap className="h-5 w-5" />,
  glass: <Sparkles className="h-5 w-5" />,
  ribbon: <Star className="h-5 w-5" />,
  badge: <Rocket className="h-5 w-5" />,
  glow: <Crown className="h-5 w-5" />,
  bubbles: <Cloud className="h-5 w-5" />,
  circles: <Target className="h-5 w-5" />,
  neon: <Zap className="h-5 w-5" />,
  stripes: <Target className="h-5 w-5" />,
  confetti: <PartyPopper className="h-5 w-5" />,
  wave: <Waves className="h-5 w-5" />,
  sparkle: <Sparkles className="h-5 w-5" />,
  geometric: <Diamond className="h-5 w-5" />,
  aurora: <Moon className="h-5 w-5" />,
  pulse: <Heart className="h-5 w-5" />,
  retro: <Camera className="h-5 w-5" />,
  cyber: <Zap className="h-5 w-5" />,
  elegant: <Crown className="h-5 w-5" />,
  festive: <PartyPopper className="h-5 w-5" />,
  sunset: <Sun className="h-5 w-5" />,
  ocean: <Waves className="h-5 w-5" />,
  forest: <Leaf className="h-5 w-5" />,
  fire: <Flame className="h-5 w-5" />,
  holographic: <Diamond className="h-5 w-5" />,
};

function isBubbly(style: BannerStyle) {
  return style === 'bubbles' || style === 'circles' || style === 'ocean' || style === 'wave';
}

function isStripes(style: BannerStyle) {
  return style === 'stripes' || style === 'retro' || style === 'cyber';
}

function isGlow(style: BannerStyle) {
  return style === 'neon' || style === 'glow' || style === 'holographic';
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
            {isStripes(style) ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-25"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--primary) / 0.10) 10px, hsl(var(--primary) / 0.10) 20px)',
                }}
              />
            ) : null}

            {isBubbly(style) ? (
              <>
                <div aria-hidden className="pointer-events-none absolute -left-6 -top-5 h-16 w-16 rounded-full bg-primary/10 blur-xl" />
                <div aria-hidden className="pointer-events-none absolute -right-8 -bottom-6 h-20 w-20 rounded-full bg-primary/10 blur-xl" />
                <div aria-hidden className="pointer-events-none absolute right-6 -top-6 h-10 w-10 rounded-full bg-primary/10 blur-lg" />
              </>
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
