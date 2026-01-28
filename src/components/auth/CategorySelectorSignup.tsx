import { usePublicBusinessCategories, PublicBusinessCategory } from '@/hooks/usePublicBusinessCategories';
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

interface CategorySelectorSignupProps {
  selectedCategory: string;
  onCategoryChange: (categoryKey: string) => void;
  disabled?: boolean;
}

export function CategorySelectorSignup({
  selectedCategory,
  onCategoryChange,
  disabled = false,
}: CategorySelectorSignupProps) {
  const { data: categories, isLoading } = usePublicBusinessCategories();

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {categories?.map((category) => {
          const IconComponent = iconMap[category.icon] || Store;
          const isSelected = selectedCategory === category.category_key;
          
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.category_key)}
              disabled={disabled}
              className={cn(
                "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-center",
                "hover:border-primary/50 hover:bg-accent/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected 
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30" 
                  : "border-muted bg-card"
              )}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5">
                  <div className="bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                </div>
              )}
              
              <div 
                className={cn(
                  "p-2 rounded-md",
                  isSelected ? "bg-primary/15" : "bg-muted/50"
                )}
              >
                <IconComponent 
                  className={cn(
                    "h-5 w-5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              
              <span className={cn(
                "text-xs font-medium",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
