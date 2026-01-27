import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantCategory } from '@/hooks/useBusinessCategory';
import { 
  UtensilsCrossed, 
  IceCream, 
  Croissant, 
  Coffee, 
  Truck,
  Store,
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed,
  IceCream,
  Croissant,
  Coffee,
  Truck,
  Store,
};

export function BusinessCategorySelector() {
  const { 
    tenantCategory, 
    categories, 
    isLoading, 
    updateCategory,
    currentConfig 
  } = useTenantCategory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categoria do Negócio</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Categoria do Negócio
          {currentConfig && (
            <Badge variant="secondary" className="ml-2">
              {currentConfig.name}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Escolha o tipo do seu negócio para personalizar o sistema com temas, 
          terminologia e funcionalidades específicas do seu segmento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map((category) => {
            const IconComponent = iconMap[category.icon] || Store;
            const isSelected = tenantCategory === category.category_key;
            
            return (
              <button
                key={category.id}
                onClick={() => updateCategory.mutate(category.category_key)}
                disabled={updateCategory.isPending}
                className={cn(
                  "relative flex flex-col items-start gap-3 p-4 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary/50 hover:bg-accent/50",
                  isSelected 
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                    : "border-muted bg-card"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                )}
                
                <div 
                  className={cn(
                    "p-3 rounded-lg",
                    isSelected ? "bg-primary/10" : "bg-muted"
                  )}
                  style={isSelected && category.theme?.primary ? {
                    backgroundColor: `hsl(${category.theme.primary} / 0.15)`
                  } : undefined}
                >
                  <IconComponent 
                    className={cn(
                      "h-6 w-6",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-semibold">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-1 mt-auto">
                  {category.features.tables && (
                    <Badge variant="outline" className="text-xs">Mesas</Badge>
                  )}
                  {category.features.delivery && (
                    <Badge variant="outline" className="text-xs">Delivery</Badge>
                  )}
                  {category.features.reservations && (
                    <Badge variant="outline" className="text-xs">Reservas</Badge>
                  )}
                  {category.features.toppings && (
                    <Badge variant="outline" className="text-xs">Toppings</Badge>
                  )}
                  {category.features.pre_orders && (
                    <Badge variant="outline" className="text-xs">Encomendas</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current terminology preview */}
        {currentConfig && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Terminologia do seu segmento:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Produto:</span>{' '}
                <span className="font-medium">{currentConfig.terminology.product}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Categoria:</span>{' '}
                <span className="font-medium">{currentConfig.terminology.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pedido:</span>{' '}
                <span className="font-medium">{currentConfig.terminology.order}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cozinha:</span>{' '}
                <span className="font-medium">{currentConfig.terminology.kitchen}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
