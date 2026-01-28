import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon } from 'lucide-react';
import type { Product, ProductVariation } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface ProductImageGridProps {
  products: Product[];
  isLoading: boolean;
  onSelectProduct: (product: Product, variation?: ProductVariation) => void;
  formatCurrency: (value: number) => string;
}

export function ProductImageGrid({ 
  products, 
  isLoading, 
  onSelectProduct,
  formatCurrency 
}: ProductImageGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
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

  // Flatten products with variations
  const displayItems: Array<{
    id: string;
    product: Product;
    variation?: ProductVariation;
    name: string;
    price: number;
    imageUrl: string | null;
  }> = [];

  products.forEach((product) => {
    if (product.has_variations && product.variations.length > 0) {
      product.variations.forEach((variation) => {
        displayItems.push({
          id: `${product.id}-${variation.id}`,
          product,
          variation,
          name: `${product.name} ${variation.name}`,
          price: product.base_price + variation.price_modifier,
          imageUrl: product.image_url,
        });
      });
    } else {
      displayItems.push({
        id: product.id,
        product,
        name: product.name,
        price: product.base_price,
        imageUrl: product.image_url,
      });
    }
  });

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {displayItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectProduct(item.product, item.variation)}
          className={cn(
            'group relative flex flex-col rounded-xl overflow-hidden',
            'bg-card border border-border',
            'transition-all duration-200',
            'hover:scale-105 hover:shadow-lg hover:border-primary/50',
            'active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
          )}
        >
          {/* Image Container */}
          <div className="aspect-square bg-muted/30 relative overflow-hidden">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
            
            {/* Price badge overlay */}
            <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full shadow">
              {formatCurrency(item.price)}
            </div>
          </div>
          
          {/* Product Name */}
          <div className="p-2 bg-card">
            <span className="text-xs font-medium text-center line-clamp-2 block">
              {item.name}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
