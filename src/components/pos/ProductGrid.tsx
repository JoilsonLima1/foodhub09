import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, ProductVariation } from '@/hooks/useProducts';

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  onSelectProduct: (product: Product, variation?: ProductVariation) => void;
  formatCurrency: (value: number) => string;
}

export function ProductGrid({ 
  products, 
  isLoading, 
  onSelectProduct,
  formatCurrency 
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>Nenhum produto encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {products.map((product) => {
        if (product.has_variations && product.variations.length > 0) {
          // Show each variation as a separate button
          return product.variations.map((variation) => {
            const finalPrice = product.base_price + variation.price_modifier;
            return (
              <button
                key={`${product.id}-${variation.id}`}
                onClick={() => onSelectProduct(product, variation)}
                className="pos-button bg-card hover:bg-accent border-border"
              >
                <span className="font-medium text-center line-clamp-2">
                  {product.name} {variation.name}
                </span>
                <span className="text-primary font-bold">
                  {formatCurrency(finalPrice)}
                </span>
              </button>
            );
          });
        }

        // Show product without variations
        return (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="pos-button bg-card hover:bg-accent border-border"
          >
            <span className="font-medium text-center line-clamp-2">
              {product.name}
            </span>
            <span className="text-primary font-bold">
              {formatCurrency(product.base_price)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
