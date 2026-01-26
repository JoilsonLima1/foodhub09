import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Plus,
  Minus,
  Trash2,
  Search,
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CartItem, PaymentMethod } from '@/types/database';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';

interface POSProduct {
  id: string;
  name: string;
  price: number;
  category: string;
}

// Demo products for now
const DEMO_PRODUCTS: POSProduct[] = [
  { id: '1', name: 'Pizza Margherita P', price: 35.90, category: 'Pizzas' },
  { id: '2', name: 'Pizza Margherita M', price: 45.90, category: 'Pizzas' },
  { id: '3', name: 'Pizza Margherita G', price: 55.90, category: 'Pizzas' },
  { id: '4', name: 'Pizza Calabresa P', price: 38.90, category: 'Pizzas' },
  { id: '5', name: 'Pizza Calabresa M', price: 48.90, category: 'Pizzas' },
  { id: '6', name: 'Pizza Calabresa G', price: 58.90, category: 'Pizzas' },
  { id: '7', name: 'Refrigerante Lata', price: 6.00, category: 'Bebidas' },
  { id: '8', name: 'Refrigerante 2L', price: 12.00, category: 'Bebidas' },
  { id: '9', name: 'Água Mineral', price: 4.00, category: 'Bebidas' },
  { id: '10', name: 'Suco Natural', price: 8.00, category: 'Bebidas' },
];

const CATEGORIES = ['Todos', 'Pizzas', 'Bebidas'];

export default function POS() {
  const { tenantId, profile } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  const addToCart = (product: POSProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      }
      return [...prev, {
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        addons: [],
      }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
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
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredProducts = DEMO_PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePayment = async () => {
    // TODO: Implement payment processing with Stone integration
    console.log('Processing payment:', { cart, total, method: selectedPaymentMethod });
    setIsPaymentOpen(false);
    clearCart();
    setSelectedPaymentMethod(null);
  };

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhum restaurante configurado</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            <h1 className="text-2xl font-bold">PDV</h1>
          </div>
          <Badge variant="outline" className="ml-auto">
            Caixa: {profile?.full_name}
          </Badge>
        </div>

        {/* Search and Categories */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="pos-button bg-card hover:bg-accent border-border"
              >
                <span className="font-medium text-center line-clamp-2">{product.name}</span>
                <span className="text-primary font-bold">{formatCurrency(product.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <Card className="w-full lg:w-96 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho
            {cart.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} itens
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
                      <p className="font-medium truncate">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.unitPrice)} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, 1)}
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
                      onClick={() => removeFromCart(item.id)}
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
                    onClick={clearCart}
                  >
                    Limpar
                  </Button>
                  <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1">
                        <Receipt className="h-4 w-4 mr-2" />
                        Pagar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Forma de Pagamento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="text-center py-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Total a Pagar</p>
                          <p className="text-3xl font-bold">{formatCurrency(total)}</p>
                        </div>

                        <Tabs defaultValue="common" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="common">Comum</TabsTrigger>
                            <TabsTrigger value="card">Cartão</TabsTrigger>
                          </TabsList>
                          <TabsContent value="common" className="space-y-2">
                            <Button
                              variant={selectedPaymentMethod === 'cash' ? 'default' : 'outline'}
                              className="w-full justify-start h-14"
                              onClick={() => setSelectedPaymentMethod('cash')}
                            >
                              <Banknote className="h-5 w-5 mr-3" />
                              Dinheiro
                            </Button>
                            <Button
                              variant={selectedPaymentMethod === 'pix' ? 'default' : 'outline'}
                              className="w-full justify-start h-14"
                              onClick={() => setSelectedPaymentMethod('pix')}
                            >
                              <QrCode className="h-5 w-5 mr-3" />
                              Pix
                            </Button>
                          </TabsContent>
                          <TabsContent value="card" className="space-y-2">
                            <Button
                              variant={selectedPaymentMethod === 'credit_card' ? 'default' : 'outline'}
                              className="w-full justify-start h-14"
                              onClick={() => setSelectedPaymentMethod('credit_card')}
                            >
                              <CreditCard className="h-5 w-5 mr-3" />
                              Crédito
                            </Button>
                            <Button
                              variant={selectedPaymentMethod === 'debit_card' ? 'default' : 'outline'}
                              className="w-full justify-start h-14"
                              onClick={() => setSelectedPaymentMethod('debit_card')}
                            >
                              <CreditCard className="h-5 w-5 mr-3" />
                              Débito
                            </Button>
                          </TabsContent>
                        </Tabs>

                        <Button
                          className="w-full h-12"
                          disabled={!selectedPaymentMethod}
                          onClick={handlePayment}
                        >
                          Confirmar Pagamento
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
