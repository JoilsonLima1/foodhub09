import { Gift, Zap, Sparkles, Star, Rocket, Crown, Heart, Flame, Snowflake, Sun, Moon, Cloud, Music, Camera, Diamond, Trophy, Target, Leaf, Waves, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BannerStyle = 
  | 'gradient' | 'minimal' | 'glass' | 'ribbon' | 'badge' | 'glow'
  | 'bubbles' | 'circles' | 'neon' | 'stripes' | 'confetti' | 'wave' | 'sparkle'
  | 'geometric' | 'aurora' | 'pulse' | 'retro' | 'cyber' | 'elegant'
  | 'festive' | 'sunset' | 'ocean' | 'forest' | 'fire' | 'holographic';

interface AnnouncementBannerProps {
  text: string;
  highlightText?: string;
  style: BannerStyle;
  isVisible: boolean;
  isPreview?: boolean;
}

const bannerIcons: Record<BannerStyle, React.ReactNode> = {
  gradient: <Gift className="h-5 w-5 md:h-6 md:w-6 animate-bounce" />,
  minimal: <Zap className="h-5 w-5" />,
  glass: <Sparkles className="h-5 w-5" />,
  ribbon: <Star className="h-5 w-5 fill-current" />,
  badge: <Rocket className="h-5 w-5" />,
  glow: <Crown className="h-5 w-5 fill-current" />,
  bubbles: <Cloud className="h-5 w-5 animate-pulse" />,
  circles: <Target className="h-5 w-5 animate-pulse" />,
  neon: <Zap className="h-5 w-5 animate-pulse" />,
  stripes: <Target className="h-5 w-5" />,
  confetti: <PartyPopper className="h-5 w-5 animate-bounce" />,
  wave: <Waves className="h-5 w-5" />,
  sparkle: <Sparkles className="h-5 w-5 animate-pulse" />,
  geometric: <Diamond className="h-5 w-5" />,
  aurora: <Moon className="h-5 w-5" />,
  pulse: <Heart className="h-5 w-5 animate-pulse" />,
  retro: <Camera className="h-5 w-5" />,
  cyber: <Zap className="h-5 w-5" />,
  elegant: <Crown className="h-5 w-5" />,
  festive: <PartyPopper className="h-5 w-5 animate-bounce" />,
  sunset: <Sun className="h-5 w-5" />,
  ocean: <Waves className="h-5 w-5" />,
  forest: <Leaf className="h-5 w-5" />,
  fire: <Flame className="h-5 w-5 animate-pulse" />,
  holographic: <Diamond className="h-5 w-5 animate-pulse" />,
};

export function AnnouncementBanner({ text, highlightText, style, isVisible, isPreview = false }: AnnouncementBannerProps) {
  if (!isVisible || !text) return null;

  const sectionClass = cn(isPreview ? '' : 'pt-24');
  const badgeSectionClass = cn(isPreview ? 'py-4' : 'pt-24 pb-0');

  const renderContent = () => (
    <div className="flex items-center justify-center gap-2 flex-wrap text-center">
      {bannerIcons[style]}
      <span className="font-medium">{text}</span>
      {highlightText && (
        <span className="font-bold text-lg md:text-xl underline decoration-2">{highlightText}</span>
      )}
    </div>
  );

  switch (style) {
    case 'gradient':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 py-4 px-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
            <div className="container mx-auto max-w-6xl text-primary-foreground relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'minimal':
      return (
        <section className={sectionClass}>
          <div className="bg-background border-b py-3 px-4">
            <div className="container mx-auto max-w-6xl text-foreground">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'glass':
      return (
        <section className={sectionClass}>
          <div className="bg-primary/10 backdrop-blur-md border-b border-primary/20 py-4 px-4">
            <div className="container mx-auto max-w-6xl text-foreground">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'ribbon':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-primary to-primary/80 py-3 px-4 shadow-lg">
            <div className="container mx-auto max-w-6xl text-primary-foreground">
              <div className="flex items-center justify-center gap-3">
                <div className="hidden md:block h-px flex-1 max-w-24 bg-primary-foreground/30" />
                {renderContent()}
                <div className="hidden md:block h-px flex-1 max-w-24 bg-primary-foreground/30" />
              </div>
            </div>
          </div>
        </section>
      );

    case 'badge':
      return (
        <section className={badgeSectionClass}>
          <div className="container mx-auto max-w-6xl px-4">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg">
                {bannerIcons[style]}
                <span className="font-medium">{text}</span>
                {highlightText && (
                  <span className="bg-primary-foreground text-primary px-2 py-0.5 rounded-full text-sm font-bold">
                    {highlightText}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      );

    case 'glow':
      return (
        <section className={sectionClass}>
          <div className="bg-primary py-4 px-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent animate-pulse" />
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-32 h-32 bg-primary-foreground/20 rounded-full blur-3xl" />
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-32 h-32 bg-primary-foreground/20 rounded-full blur-3xl" />
            <div className="container mx-auto max-w-6xl text-primary-foreground relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'bubbles':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-primary/90 to-primary py-4 px-4 relative overflow-hidden">
            {/* Floating bubbles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-8 h-8 bg-primary-foreground/10 rounded-full top-2 left-[10%] animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }} />
              <div className="absolute w-6 h-6 bg-primary-foreground/15 rounded-full top-4 left-[25%] animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '2.5s' }} />
              <div className="absolute w-10 h-10 bg-primary-foreground/10 rounded-full top-1 left-[40%] animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '3s' }} />
              <div className="absolute w-5 h-5 bg-primary-foreground/20 rounded-full top-3 left-[55%] animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '2.2s' }} />
              <div className="absolute w-7 h-7 bg-primary-foreground/10 rounded-full top-2 left-[70%] animate-bounce" style={{ animationDelay: '1.2s', animationDuration: '2.8s' }} />
              <div className="absolute w-9 h-9 bg-primary-foreground/15 rounded-full top-1 left-[85%] animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '2.4s' }} />
            </div>
            <div className="container mx-auto max-w-6xl text-primary-foreground relative z-10">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'circles':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-primary via-primary/95 to-primary py-4 px-4 relative overflow-hidden">
            {/* Circle highlights - static positioned circles */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Large circles at edges */}
              <div className="absolute w-20 h-20 border-4 border-primary-foreground/20 rounded-full -left-10 top-1/2 -translate-y-1/2" />
              <div className="absolute w-16 h-16 border-4 border-primary-foreground/15 rounded-full left-[15%] top-1/2 -translate-y-1/2" />
              <div className="absolute w-12 h-12 bg-primary-foreground/10 rounded-full left-[30%] top-1/2 -translate-y-1/2" />
              <div className="absolute w-8 h-8 bg-primary-foreground/15 rounded-full left-[45%] top-1/2 -translate-y-1/2" />
              <div className="absolute w-10 h-10 border-2 border-primary-foreground/20 rounded-full right-[35%] top-1/2 -translate-y-1/2" />
              <div className="absolute w-14 h-14 bg-primary-foreground/10 rounded-full right-[20%] top-1/2 -translate-y-1/2" />
              <div className="absolute w-18 h-18 border-4 border-primary-foreground/15 rounded-full -right-8 top-1/2 -translate-y-1/2" />
            </div>
            <div className="container mx-auto max-w-6xl text-primary-foreground relative z-10">
              <div className="flex items-center justify-center gap-3 flex-wrap text-center">
                {/* Left highlight circle */}
                <div className="hidden md:flex items-center justify-center w-10 h-10 bg-primary-foreground/20 rounded-full">
                  {bannerIcons[style]}
                </div>
                <span className="font-medium">{text}</span>
                {highlightText && (
                  <span className="bg-primary-foreground text-primary px-4 py-1 rounded-full font-bold text-lg">
                    {highlightText}
                  </span>
                )}
                {/* Right highlight circle */}
                <div className="hidden md:flex items-center justify-center w-10 h-10 bg-primary-foreground/20 rounded-full">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'neon':
      return (
        <section className={sectionClass}>
          <div className="bg-background py-4 px-4 relative border-y-2 border-primary">
            <div className="absolute inset-0 bg-primary/5" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(var(--primary))]" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(var(--primary))]" />
            <div className="container mx-auto max-w-6xl text-primary relative">
              <div className="flex items-center justify-center gap-2 flex-wrap text-center drop-shadow-[0_0_10px_hsl(var(--primary))]">
                {bannerIcons[style]}
                <span className="font-medium">{text}</span>
                {highlightText && (
                  <span className="font-bold text-lg md:text-xl">{highlightText}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      );

    case 'stripes':
      return (
        <section className={sectionClass}>
          <div className="bg-primary py-4 px-4 relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
              }}
            />
            <div className="container mx-auto max-w-6xl text-primary-foreground relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'confetti':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-pink-500 via-primary to-purple-500 py-4 px-4 relative overflow-hidden">
            {/* Confetti particles */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 5],
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
            <div className="container mx-auto max-w-6xl text-white relative z-10">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'wave':
      return (
        <section className={sectionClass}>
          <div className="bg-primary py-4 px-4 relative overflow-hidden">
            <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 1200 30" preserveAspectRatio="none">
              <path d="M0,15 C150,30 350,0 600,15 C850,30 1050,0 1200,15 L1200,30 L0,30 Z" fill="currentColor" className="text-primary-foreground" />
            </svg>
            <svg className="absolute top-0 left-0 w-full h-8 opacity-20 rotate-180" viewBox="0 0 1200 30" preserveAspectRatio="none">
              <path d="M0,15 C150,30 350,0 600,15 C850,30 1050,0 1200,15 L1200,30 L0,30 Z" fill="currentColor" className="text-primary-foreground" />
            </svg>
            <div className="container mx-auto max-w-6xl text-primary-foreground relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'sparkle':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-primary via-primary/80 to-primary py-4 px-4 relative overflow-hidden">
            {/* Sparkle effects */}
            <div className="absolute inset-0">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: '2s',
                  }}
                >
                  <Sparkles className="h-3 w-3 text-primary-foreground/30" />
                </div>
              ))}
            </div>
            <div className="container mx-auto max-w-6xl text-primary-foreground relative z-10">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'geometric':
      return (
        <section className={sectionClass}>
          <div className="bg-primary py-4 px-4 relative overflow-hidden">
            {/* Geometric shapes */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute w-16 h-16 border-2 border-primary-foreground rotate-45 -left-8 top-1/2 -translate-y-1/2" />
              <div className="absolute w-12 h-12 border-2 border-primary-foreground rotate-12 left-1/4 top-1/2 -translate-y-1/2" />
              <div className="absolute w-20 h-20 border-2 border-primary-foreground -rotate-12 right-1/4 top-1/2 -translate-y-1/2" />
              <div className="absolute w-14 h-14 border-2 border-primary-foreground rotate-45 -right-7 top-1/2 -translate-y-1/2" />
            </div>
            <div className="container mx-auto max-w-6xl text-primary-foreground relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'aurora':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-4 px-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 via-transparent to-blue-500/20" />
            <div className="container mx-auto max-w-6xl text-white relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'pulse':
      return (
        <section className={sectionClass}>
          <div className="bg-primary py-4 px-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary-foreground/10 animate-pulse" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
              <div className="absolute inset-0 bg-primary-foreground/5 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            <div className="container mx-auto max-w-6xl text-primary-foreground relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'retro':
      return (
        <section className={sectionClass}>
          <div className="bg-amber-500 py-4 px-4 relative overflow-hidden border-y-4 border-amber-700">
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                backgroundSize: '8px 8px'
              }}
            />
            <div className="container mx-auto max-w-6xl text-amber-950 relative font-bold">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'cyber':
      return (
        <section className={sectionClass}>
          <div className="bg-slate-900 py-4 px-4 relative overflow-hidden border-y border-cyan-500">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10" />
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0,255,255,0.1) 25%, rgba(0,255,255,0.1) 26%, transparent 27%, transparent 74%, rgba(0,255,255,0.1) 75%, rgba(0,255,255,0.1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0,255,255,0.1) 25%, rgba(0,255,255,0.1) 26%, transparent 27%, transparent 74%, rgba(0,255,255,0.1) 75%, rgba(0,255,255,0.1) 76%, transparent 77%, transparent)',
                backgroundSize: '30px 30px'
              }}
            />
            <div className="container mx-auto max-w-6xl text-cyan-400 relative">
              <div className="flex items-center justify-center gap-2 flex-wrap text-center font-mono">
                {bannerIcons[style]}
                <span className="font-medium">{text}</span>
                {highlightText && (
                  <span className="font-bold text-lg md:text-xl text-purple-400">{highlightText}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      );

    case 'elegant':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-4 px-4 relative overflow-hidden border-y border-primary/30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
            <div className="container mx-auto max-w-6xl text-primary relative">
              <div className="flex items-center justify-center gap-3">
                <div className="hidden md:block h-px flex-1 max-w-32 bg-gradient-to-r from-transparent to-primary/50" />
                <div className="flex items-center justify-center gap-2 flex-wrap text-center">
                  {bannerIcons[style]}
                  <span className="font-light tracking-wider">{text}</span>
                  {highlightText && (
                    <span className="font-semibold text-lg md:text-xl">{highlightText}</span>
                  )}
                </div>
                <div className="hidden md:block h-px flex-1 max-w-32 bg-gradient-to-l from-transparent to-primary/50" />
              </div>
            </div>
          </div>
        </section>
      );

    case 'festive':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-red-500 via-green-500 to-red-500 py-4 px-4 relative overflow-hidden">
            {/* Festive lights */}
            <div className="absolute inset-0 flex justify-around items-center">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{
                    backgroundColor: i % 2 === 0 ? '#FFD700' : '#FF0000',
                    animationDelay: `${i * 0.2}s`,
                    boxShadow: `0 0 10px ${i % 2 === 0 ? '#FFD700' : '#FF0000'}`
                  }}
                />
              ))}
            </div>
            <div className="container mx-auto max-w-6xl text-white relative z-10">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'sunset':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 py-4 px-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="container mx-auto max-w-6xl text-white relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'ocean':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 py-4 px-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute w-full h-2 bg-white/20 top-1/3 animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute w-full h-1 bg-white/15 top-2/3 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
            </div>
            <div className="container mx-auto max-w-6xl text-white relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'forest':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-green-700 via-emerald-600 to-green-700 py-4 px-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              {[...Array(8)].map((_, i) => (
                <Leaf
                  key={i}
                  className="absolute h-4 w-4 text-white animate-pulse"
                  style={{
                    left: `${i * 12 + 5}%`,
                    top: `${Math.random() * 100}%`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
            <div className="container mx-auto max-w-6xl text-white relative">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'fire':
      return (
        <section className={sectionClass}>
          <div className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 py-4 px-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-red-900/50 to-transparent" />
            <div className="absolute inset-0 opacity-30">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-bounce"
                  style={{
                    left: `${i * 16 + 5}%`,
                    bottom: '0',
                    animationDuration: `${1 + Math.random()}s`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  <Flame className="h-6 w-6 text-yellow-300" />
                </div>
              ))}
            </div>
            <div className="container mx-auto max-w-6xl text-white relative z-10">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    case 'holographic':
      return (
        <section className={sectionClass}>
          <div className="bg-slate-900 py-4 px-4 relative overflow-hidden">
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(255,0,150,0.3) 0%, rgba(0,255,255,0.3) 25%, rgba(255,255,0,0.3) 50%, rgba(0,255,150,0.3) 75%, rgba(255,0,255,0.3) 100%)',
                backgroundSize: '400% 400%',
                animation: 'gradient-shift 5s ease infinite',
              }}
            />
            <style>{`
              @keyframes gradient-shift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
            `}</style>
            <div className="container mx-auto max-w-6xl text-white relative z-10">
              {renderContent()}
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
