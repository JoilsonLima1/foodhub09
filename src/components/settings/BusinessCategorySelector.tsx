import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenantCategory } from '@/hooks/useBusinessCategory';
import { PasswordConfirmDialog } from '@/components/superadmin/PasswordConfirmDialog';
import { 
  UtensilsCrossed, 
  IceCream, 
  Croissant, 
  Coffee, 
  Truck,
  Store,
  Check,
  Loader2,
  AlertTriangle
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

  // State for password confirmation
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const handleCategoryClick = (categoryKey: string) => {
    // Don't prompt if selecting the same category
    if (categoryKey === tenantCategory) return;
    
    // Set pending category and show password dialog
    setPendingCategory(categoryKey);
    setShowPasswordDialog(true);
  };

  const handleConfirmChange = () => {
    if (pendingCategory) {
      updateCategory.mutate(pendingCategory);
      setPendingCategory(null);
    }
  };

  const getPendingCategoryName = () => {
    if (!pendingCategory || !categories) return '';
    const cat = categories.find(c => c.category_key === pendingCategory);
    return cat?.name || pendingCategory;
  };

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
    <>
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
          {/* Warning about category change */}
          <div className="flex items-start gap-2 p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Alterar a categoria do negócio requer confirmação de senha. 
              O tema e terminologia serão atualizados apenas para sua organização.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories?.map((category) => {
              const IconComponent = iconMap[category.icon] || Store;
              const isSelected = tenantCategory === category.category_key;
              
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.category_key)}
                  disabled={updateCategory.isPending || isSelected}
                  className={cn(
                    "relative flex flex-col items-start gap-3 p-4 rounded-lg border-2 transition-all text-left",
                    "hover:border-primary/50 hover:bg-accent/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
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

      {/* Password Confirmation Dialog */}
      <PasswordConfirmDialog
        open={showPasswordDialog}
        onOpenChange={(open) => {
          setShowPasswordDialog(open);
          if (!open) setPendingCategory(null);
        }}
        onConfirm={handleConfirmChange}
        title="Confirmar Alteração de Categoria"
        description={`Você está prestes a alterar a categoria do seu negócio para "${getPendingCategoryName()}". Isso mudará o tema e a terminologia do sistema. Digite sua senha para confirmar.`}
        confirmLabel="Alterar Categoria"
        isLoading={updateCategory.isPending}
      />
    </>
  );
}
