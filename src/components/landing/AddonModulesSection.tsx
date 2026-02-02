import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Check, 
  Plug2,
  Settings2,
  Megaphone,
  HardDrive,
  Truck,
  ShoppingCart,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Store,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  Gift,
  Zap,
  CreditCard,
  Users,
  Smartphone,
  QrCode,
  Shield,
  DoorOpen,
  Ticket,
} from 'lucide-react';
import { 
  usePublicAddonModules, 
  type AddonModuleCategory,
  ADDON_CATEGORY_LABELS,
  ADDON_CATEGORY_DESCRIPTIONS,
} from '@/hooks/usePublicAddonModules';
import { Skeleton } from '@/components/ui/skeleton';

// Icon mapping for module categories
const CATEGORY_ICONS: Record<AddonModuleCategory, React.ComponentType<{ className?: string }>> = {
  integrations: Plug2,
  operations: Settings2,
  marketing: Megaphone,
  hardware: HardDrive,
  logistics: Truck,
  digital_service: Smartphone,
  payment: CreditCard,
  access_control: Shield,
};

// Dynamic icon component based on string name
const getModuleIcon = (iconName: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Package,
    Plug2,
    Settings2,
    Megaphone,
    HardDrive,
    Truck,
    ShoppingCart,
    MessageSquare,
    Store,
    Smartphone,
    QrCode,
    CreditCard,
    Shield,
    DoorOpen,
    Ticket,
    Users,
    Phone,
    Gift,
    Zap,
  };
  return icons[iconName] || Package;
};

// Category gradient colors
const CATEGORY_GRADIENTS: Record<AddonModuleCategory, string> = {
  integrations: 'from-blue-500/20 to-cyan-500/5',
  operations: 'from-amber-500/20 to-yellow-500/5',
  marketing: 'from-pink-500/20 to-rose-500/5',
  hardware: 'from-slate-500/20 to-zinc-500/5',
  logistics: 'from-green-500/20 to-emerald-500/5',
  digital_service: 'from-violet-500/20 to-purple-500/5',
  payment: 'from-emerald-500/20 to-teal-500/5',
  access_control: 'from-red-500/20 to-orange-500/5',
};

export function AddonModulesSection() {
  const { modules, modulesByCategory, activeCategories, isLoading } = usePublicAddonModules();
  const [expandedCategory, setExpandedCategory] = useState<AddonModuleCategory | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const formatPrice = (price: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const handleContactForModule = (moduleName: string) => {
    const message = encodeURIComponent(
      `Olá! Gostaria de saber mais sobre o módulo "${moduleName}".`
    );
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
  };

  const activeModules = modules || [];

  if (isLoading) {
    return (
      <section className="py-20 px-4 bg-gradient-to-b from-background to-card/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Skeleton className="h-6 w-32 mx-auto mb-4" />
            <Skeleton className="h-12 w-96 mx-auto mb-6" />
            <Skeleton className="h-6 w-80 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (activeModules.length === 0) {
    return null;
  }

  // Show first 3 categories initially, rest on expand
  const visibleCategories = showAllCategories 
    ? activeCategories 
    : activeCategories.slice(0, 3);
  const hiddenCategoriesCount = activeCategories.length - 3;

  return (
    <section id="modules" className="py-20 px-4 bg-gradient-to-b from-background to-card/30">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            Loja de Módulos
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Expanda seu sistema <span className="text-primary">quando precisar</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Comece com o essencial e adicione funcionalidades extras conforme seu negócio cresce. 
            Todos os módulos podem ser ativados ou desativados a qualquer momento.
          </p>
        </div>

        {/* Categories with Modules */}
        <div className="space-y-12">
          {visibleCategories.map(category => {
            const CategoryIcon = CATEGORY_ICONS[category];
            const categoryModules = modulesByCategory[category] || [];
            const isExpanded = expandedCategory === category;
            const displayModules = isExpanded ? categoryModules : categoryModules.slice(0, 3);
            const hasMore = categoryModules.length > 3;

            return (
              <div key={category} className="space-y-6">
                {/* Category Header */}
                <div className="flex items-center gap-4 border-b border-border pb-4">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${CATEGORY_GRADIENTS[category]} flex items-center justify-center`}>
                    <CategoryIcon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{ADDON_CATEGORY_LABELS[category]}</h3>
                    <p className="text-muted-foreground text-sm">{ADDON_CATEGORY_DESCRIPTIONS[category]}</p>
                  </div>
                  <Badge variant="secondary" className="hidden sm:flex">
                    {categoryModules.length} {categoryModules.length === 1 ? 'módulo' : 'módulos'}
                  </Badge>
                </div>

                {/* Modules Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayModules.map(module => {
                    const ModuleIcon = getModuleIcon(module.icon);
                    const gradient = CATEGORY_GRADIENTS[module.category];
                    
                    return (
                      <Card 
                        key={module.id}
                        className={`relative flex flex-col bg-gradient-to-b ${gradient} border-border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <ModuleIcon className="h-6 w-6 text-primary" />
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {module.monthly_price === 0 ? 'Grátis' : 'Adicional'}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl mt-4">{module.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {module.description}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="flex-1">
                          {module.features && module.features.length > 0 && (
                            <ul className="space-y-2">
                              {module.features.slice(0, 3).map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {/* Special note for Multi Lojas module */}
                          {module.slug === 'multi_store' && (
                            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                              <p className="text-xs text-primary font-medium flex items-start gap-2">
                                <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
                                Cada módulo adiciona 1 loja extra. Compre quantas precisar!
                              </p>
                            </div>
                          )}
                        </CardContent>
                        
                        <CardFooter className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div>
                            <span className="text-2xl font-bold">
                              {module.monthly_price === 0 ? 'Grátis' : formatPrice(module.monthly_price)}
                            </span>
                            {module.monthly_price > 0 && (
                              <span className="text-sm text-muted-foreground">/mês</span>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleContactForModule(module.name)}
                            className="gap-1"
                          >
                            Saiba mais
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>

                {/* Show more button for category */}
                {hasMore && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      className="gap-2"
                    >
                      {isExpanded ? (
                        <>
                          Ver menos
                          <ChevronUp className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Ver mais {categoryModules.length - 3} módulos
                          <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show more categories button */}
        {hiddenCategoriesCount > 0 && !showAllCategories && (
          <div className="text-center mt-12">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAllCategories(true)}
              className="rounded-full gap-2"
            >
              Ver mais {hiddenCategoriesCount} categorias
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="text-4xl font-bold text-primary mb-2">{activeModules.length}+</div>
            <div className="text-sm text-muted-foreground">Módulos Disponíveis</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="text-4xl font-bold text-primary mb-2">{activeCategories.length}</div>
            <div className="text-sm text-muted-foreground">Categorias</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="text-4xl font-bold text-emerald-500 mb-2">0%</div>
            <div className="text-sm text-muted-foreground">Fidelidade Mínima</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="text-4xl font-bold text-blue-500 mb-2">24h</div>
            <div className="text-sm text-muted-foreground">Ativação Imediata</div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center p-8 rounded-2xl bg-primary/5 border border-primary/20">
          <h3 className="text-2xl font-bold mb-3">
            Precisa de algo personalizado?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Temos uma equipe pronta para desenvolver funcionalidades 
            exclusivas para o seu negócio. Entre em contato!
          </p>
          <Button size="lg" className="rounded-full">
            <MessageSquare className="h-4 w-4 mr-2" />
            Falar com especialista
          </Button>
        </div>
      </div>
    </section>
  );
}
