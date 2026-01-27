import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Plus, Minus, Trash2, MessageCircle, Send } from 'lucide-react';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface PublicMenuCartProps {
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  formatCurrency: (value: number) => string;
  whatsappNumber?: string;
  tableNumber?: number;
  tenantName?: string;
}

export function PublicMenuCart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  formatCurrency,
  whatsappNumber,
  tableNumber,
  tenantName = 'Restaurante',
}: PublicMenuCartProps) {
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const generateWhatsAppMessage = () => {
    let message = `🍽️ *Novo Pedido - ${tenantName}*\n\n`;
    
    if (tableNumber) {
      message += `📍 *Mesa:* ${tableNumber}\n`;
    }
    
    if (customerName.trim()) {
      message += `👤 *Cliente:* ${customerName}\n`;
    }
    
    message += `\n*Itens do Pedido:*\n`;
    message += `─────────────────\n`;
    
    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.productName}`;
      if (item.variationName) {
        message += ` (${item.variationName})`;
      }
      message += `\n   Qtd: ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.totalPrice)}\n`;
      if (item.notes) {
        message += `   📝 ${item.notes}\n`;
      }
    });
    
    message += `─────────────────\n`;
    message += `💰 *Total: ${formatCurrency(subtotal)}*\n`;
    
    if (orderNotes.trim()) {
      message += `\n📋 *Observações:* ${orderNotes}\n`;
    }
    
    message += `\n_Pedido enviado pelo cardápio digital_`;
    
    return encodeURIComponent(message);
  };

  const handleSendWhatsApp = () => {
    if (!whatsappNumber || cart.length === 0) return;
    
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Clear cart after sending
    onClearCart();
    setCustomerName('');
    setOrderNotes('');
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
              variant="destructive"
            >
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Seu Pedido
            {tableNumber && (
              <Badge variant="outline" className="ml-auto">
                Mesa {tableNumber}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Seu carrinho está vazio</p>
              <p className="text-sm">Adicione produtos do cardápio</p>
            </div>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {item.productName}
                      {item.variationName && (
                        <span className="text-muted-foreground text-sm"> ({item.variationName})</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.unitPrice)} cada
                    </p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {item.notes}
                      </p>
                    )}
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
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold">
                      {formatCurrency(item.totalPrice)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Customer Info */}
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label htmlFor="customerName">Seu nome (opcional)</Label>
                <Input
                  id="customerName"
                  placeholder="Como devemos chamar você?"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="orderNotes">Observações (opcional)</Label>
                <Textarea
                  id="orderNotes"
                  placeholder="Alguma observação para o pedido?"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Totals and Actions */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClearCart}
                >
                  Limpar
                </Button>
                
                {whatsappNumber ? (
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleSendWhatsApp}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Pedido
                  </Button>
                ) : (
                  <Button className="flex-1" disabled>
                    <Send className="h-4 w-4 mr-2" />
                    WhatsApp não configurado
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
