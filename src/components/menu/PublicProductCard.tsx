import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Minus, MessageCircle } from 'lucide-react';
import type { PublicProduct, PublicProductVariation } from '@/hooks/usePublicMenu';

interface PublicProductCardProps {
  product: PublicProduct;
  onAddToCart: (product: PublicProduct, variation?: PublicProductVariation, quantity?: number, notes?: string) => void;
  formatCurrency: (value: number) => string;
}

export function PublicProductCard({ product, onAddToCart, formatCurrency }: PublicProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<PublicProductVariation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const handleOpenDialog = () => {
    setIsOpen(true);
    setQuantity(1);
    setNotes('');
    if (product.has_variations && product.variations.length > 0) {
      setSelectedVariation(product.variations[0]);
    } else {
      setSelectedVariation(null);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, selectedVariation || undefined, quantity, notes.trim() || undefined);
    setIsOpen(false);
  };

  const getPrice = () => {
    if (selectedVariation) {
      return product.base_price + selectedVariation.price_modifier;
    }
    return product.base_price;
  };

  const getDisplayPrice = () => {
    if (product.has_variations && product.variations.length > 0) {
      const minPrice = Math.min(...product.variations.map(v => product.base_price + v.price_modifier));
      return `A partir de ${formatCurrency(minPrice)}`;
    }
    return formatCurrency(product.base_price);
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
        onClick={handleOpenDialog}
      >
        {product.image_url && (
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-3">
          <h3 className="font-medium line-clamp-2 mb-1">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-primary font-bold">
              {getDisplayPrice()}
            </span>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {product.image_url && (
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {product.description && (
              <p className="text-muted-foreground">{product.description}</p>
            )}

            {/* Variations */}
            {product.has_variations && product.variations.length > 0 && (
              <div className="space-y-2">
                <Label>Escolha uma opção</Label>
                <RadioGroup
                  value={selectedVariation?.id || ''}
                  onValueChange={(value) => {
                    const variation = product.variations.find(v => v.id === value);
                    setSelectedVariation(variation || null);
                  }}
                >
                  {product.variations.map((variation) => (
                    <div
                      key={variation.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedVariation(variation)}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={variation.id} id={variation.id} />
                        <Label htmlFor={variation.id} className="cursor-pointer">
                          {variation.name}
                        </Label>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(product.base_price + variation.price_modifier)}
                      </span>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Observações (opcional)
              </Label>
              <Textarea
                placeholder="Ex: sem cebola, bem passado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="text-lg font-bold">
              Total: {formatCurrency(getPrice() * quantity)}
            </div>
            <Button onClick={handleAddToCart} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
