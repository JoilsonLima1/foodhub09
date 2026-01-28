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
} from 'lucide-react';
import { useAddonModules, ADDON_CATEGORY_LABELS, type AddonModuleCategory } from '@/hooks/useAddonModules';
import { Skeleton } from '@/components/ui/skeleton';

// Icon mapping for module categories
const CATEGORY_ICONS: Record<AddonModuleCategory, React.ComponentType<{ className?: string }>> = {
  integrations: Plug2,
  operations: Settings2,
  marketing: Megaphone,
  hardware: HardDrive,
  logistics: Truck,
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
};

export function AddonModulesSection() {
  const { modules, isLoading } = useAddonModules();

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

  // Only show active modules
  const activeModules = modules?.filter(m => m.is_active) || [];

  // Group modules by category for display
  const modulesByCategory = activeModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<AddonModuleCategory, typeof activeModules>);

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

  return (
    <section id="modules" className="py-20 px-4 bg-gradient-to-b from-background to-card/30">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            Módulos Extras
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Personalize seu <span className="text-primary">sistema</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Além do plano base, você pode adicionar módulos extras para expandir 
            as funcionalidades conforme as necessidades do seu negócio.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeModules.slice(0, 6).map(module => {
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
                    <Badge variant="secondary" className="text-xs">
                      {ADDON_CATEGORY_LABELS[module.category]}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">{module.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  {module.features && (module.features as string[]).length > 0 && (
                    <ul className="space-y-2">
                      {(module.features as string[]).slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                
                <CardFooter className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <span className="text-2xl font-bold">
                      {formatPrice(module.monthly_price)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
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

        {/* More modules info */}
        {activeModules.length > 6 && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              E mais {activeModules.length - 6} módulos disponíveis!
            </p>
            <Button variant="outline" size="lg" className="rounded-full">
              Ver todos os módulos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

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
