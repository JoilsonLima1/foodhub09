import { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UtensilsCrossed } from 'lucide-react';
import { usePublicMenu, type PublicProduct, type PublicProductVariation } from '@/hooks/usePublicMenu';
import { PublicProductCard } from '@/components/menu/PublicProductCard';
import { PublicMenuCart, type CartItem } from '@/components/menu/PublicMenuCart';

export default function PublicMenu() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('mesa') ? parseInt(searchParams.get('mesa')!) : undefined;
  
  const { data, isLoading, error } = usePublicMenu(tenantId || '');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // TODO: Get from tenant settings
  const whatsappNumber = '5511999999999';
  const tenantName = 'Restaurante Demo';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    
    return data.products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [data?.products, searchTerm, selectedCategory]);

  const productsByCategory = useMemo(() => {
    if (!data?.categories || !filteredProducts.length) return [];
    
    return data.categories
      .map(category => ({
        category,
        products: filteredProducts.filter(p => p.category_id === category.id),
      }))
      .filter(group => group.products.length > 0);
  }, [data?.categories, filteredProducts]);

  const uncategorizedProducts = useMemo(() => {
    return filteredProducts.filter(p => !p.category_id);
  }, [filteredProducts]);

  const addToCart = (
    product: PublicProduct,
    variation?: PublicProductVariation,
    quantity: number = 1,
    notes?: string
  ) => {
    const unitPrice = variation
      ? product.base_price + variation.price_modifier
      : product.base_price;

    const cartItemId = variation ? `${product.id}-${variation.id}` : product.id;

    setCart(prev => {
      // If item with same product+variation+notes exists, update quantity
      const existingIndex = prev.findIndex(
        item => item.id === cartItemId && item.notes === notes
      );

      if (existingIndex >= 0 && !notes) {
        return prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: item.quantity + quantity,
                totalPrice: (item.quantity + quantity) * item.unitPrice,
              }
            : item
        );
      }

      // Add new item
      return [
        ...prev,
        {
          id: notes ? `${cartItemId}-${Date.now()}` : cartItemId,
          productId: product.id,
          productName: product.name,
          variationId: variation?.id,
          variationName: variation?.name,
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
          notes,
        },
      ];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === itemId) {
            const newQuantity = Math.max(0, item.quantity + delta);
            if (newQuantity === 0) return item;
            return {
              ...item,
              quantity: newQuantity,
              totalPrice: newQuantity * item.unitPrice,
            };
          }
          return item;
        })
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold mb-2">Cardápio não encontrado</h1>
          <p className="text-muted-foreground">
            Verifique o link e tente novamente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-40">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">{tenantName}</h1>
            {tableNumber && (
              <Badge variant="outline" className="ml-auto">
                Mesa {tableNumber}
              </Badge>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no cardápio..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Categories */}
        {!isLoading && data?.categories && data.categories.length > 0 && (
          <div className="container max-w-3xl mx-auto px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="whitespace-nowrap"
              >
                Todos
              </Button>
              {data.categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="container max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-48 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : selectedCategory ? (
          // Show only selected category
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <PublicProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        ) : (
          // Show all categories
          <div className="space-y-8">
            {productsByCategory.map(({ category, products }) => (
              <section key={category.id}>
                <h2 className="text-lg font-bold mb-4 sticky top-[140px] bg-background py-2">
                  {category.name}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {products.map((product) => (
                    <PublicProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </section>
            ))}
            
            {uncategorizedProducts.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4 sticky top-[140px] bg-background py-2">
                  Outros
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {uncategorizedProducts.map((product) => (
                    <PublicProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto encontrado</p>
          </div>
        )}
      </main>

      {/* Cart FAB */}
      <PublicMenuCart
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        formatCurrency={formatCurrency}
        whatsappNumber={whatsappNumber}
        tableNumber={tableNumber}
        tenantName={tenantName}
      />
    </div>
  );
}
