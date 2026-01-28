import { Gift, Zap, Sparkles, Star, Rocket, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BannerStyle = 'gradient' | 'minimal' | 'glass' | 'ribbon' | 'badge' | 'glow';

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

    default:
      return null;
  }
}
