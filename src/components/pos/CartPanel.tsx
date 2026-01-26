import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2, ShoppingCart, Receipt } from 'lucide-react';
import type { CartItem } from '@/types/database';

interface CartPanelProps {
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  formatCurrency: (value: number) => string;
  isProcessing?: boolean;
}

export function CartPanel({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  formatCurrency,
  isProcessing = false,
}: CartPanelProps) {
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="w-full lg:w-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Carrinho
          {cart.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Carrinho vazio</p>
            </div>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {item.productName}
                      {item.variationName && (
                        <span className="text-muted-foreground"> ({item.variationName})</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.unitPrice)} cada
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-semibold w-20 text-right">
                    {formatCurrency(item.totalPrice)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClearCart}
                  disabled={isProcessing}
                >
                  Limpar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={onCheckout}
                  disabled={isProcessing}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processando...' : 'Pagar'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
