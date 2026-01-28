import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  Check, 
  Clock, 
  AlertCircle,
  Plug2,
  Settings2,
  Megaphone,
  HardDrive,
  Truck,
  ShoppingCart,
  MessageSquare,
} from 'lucide-react';
import { 
  useAddonModules, 
  useMyAddonSubscriptions, 
  ADDON_CATEGORY_LABELS,
  ADDON_STATUS_LABELS,
  type AddonModule,
  type AddonModuleCategory,
} from '@/hooks/useAddonModules';
import { cn } from '@/lib/utils';

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
  };
  return icons[iconName] || Package;
};

export function ModulesSettings() {
  const { modules, isLoading: modulesLoading } = useAddonModules();
  const { subscriptions, isLoading: subsLoading, hasAddon } = useMyAddonSubscriptions();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const isLoading = modulesLoading || subsLoading;

  // Group modules by category
  const categories = ['all', ...Object.keys(ADDON_CATEGORY_LABELS)] as const;
  
  const filteredModules = modules?.filter(mod => {
    if (selectedCategory === 'all') return true;
    return mod.category === selectedCategory;
  }) || [];

  // Get subscription info for a module
  const getSubscriptionInfo = (moduleId: string) => {
    return subscriptions?.find(sub => sub.addon_module_id === moduleId);
  };

  const formatPrice = (price: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const handleRequestModule = (module: AddonModule) => {
    // Open WhatsApp or contact form to request module
    const message = encodeURIComponent(
      `Olá! Gostaria de contratar o módulo "${module.name}" para minha conta.`
    );
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-24 shrink-0" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Módulos Adicionais
          </CardTitle>
          <CardDescription>
            Expanda as funcionalidades do seu sistema com módulos extras. 
            Você pode contratar módulos individuais conforme sua necessidade.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Active Subscriptions Summary */}
      {subscriptions && subscriptions.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Módulos Ativos ({subscriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subscriptions.map(sub => (
                <Badge 
                  key={sub.id} 
                  variant={sub.status === 'active' ? 'default' : 'secondary'}
                  className="gap-1"
                >
                  {sub.addon_module?.name}
                  {sub.status === 'trial' && (
                    <Clock className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full h-auto flex flex-nowrap gap-2 overflow-x-auto justify-start md:flex-wrap md:overflow-visible bg-transparent">
          <TabsTrigger 
            value="all" 
            className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Todos
          </TabsTrigger>
          {Object.entries(ADDON_CATEGORY_LABELS).map(([key, label]) => {
            const Icon = CATEGORY_ICONS[key as AddonModuleCategory];
            return (
              <TabsTrigger 
                key={key} 
                value={key}
                className="shrink-0 flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredModules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum módulo disponível nesta categoria.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredModules.map(module => {
                const subscription = getSubscriptionInfo(module.id);
                const isSubscribed = !!subscription && ['active', 'trial'].includes(subscription.status);
                const ModuleIcon = getModuleIcon(module.icon);
                
                return (
                  <Card 
                    key={module.id}
                    className={cn(
                      "flex flex-col transition-all hover:shadow-md",
                      isSubscribed && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ModuleIcon className="h-5 w-5 text-primary" />
                        </div>
                        {isSubscribed ? (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            {ADDON_STATUS_LABELS[subscription.status]}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {ADDON_CATEGORY_LABELS[module.category]}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg mt-3">{module.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {module.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1">
                      {module.features && module.features.length > 0 && (
                        <ul className="space-y-1.5">
                          {(module.features as string[]).slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {module.requirements && (
                        <div className="mt-3 flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
                          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <span className="text-xs text-warning">{module.requirements}</span>
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="flex-col items-stretch gap-3 pt-4 border-t">
                      <div className="flex items-baseline justify-between">
                        <div>
                          {module.setup_fee > 0 && (
                            <span className="text-xs text-muted-foreground block">
                              Setup: {formatPrice(module.setup_fee)}
                            </span>
                          )}
                          <span className="text-xl font-bold">
                            {formatPrice(module.monthly_price)}
                          </span>
                          <span className="text-sm text-muted-foreground">/mês</span>
                        </div>
                      </div>
                      
                      {isSubscribed ? (
                        <Button variant="outline" disabled className="w-full">
                          <Check className="h-4 w-4 mr-2" />
                          Ativo
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleRequestModule(module)}
                          className="w-full"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Contratar Módulo
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
