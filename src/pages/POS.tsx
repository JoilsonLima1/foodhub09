import { useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCategoryContext } from '@/contexts/BusinessCategoryContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Search, Scale, Scan, CreditCard, Trash2 } from 'lucide-react';
import { useProducts, useCategories, type Product, type ProductVariation } from '@/hooks/useProducts';
import { useCreateOrder } from '@/hooks/useCreateOrder';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { ProductImageGrid } from '@/components/pos/ProductImageGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { PaymentDialog } from '@/components/pos/PaymentDialog';
import { ReceiptDialog } from '@/components/pos/ReceiptDialog';
import { CustomerInfoDialog } from '@/components/pos/CustomerInfoDialog';
import { ScaleDisplay } from '@/components/pos/ScaleDisplay';
import { BarcodeScanner, QuickScanButton } from '@/components/pos/BarcodeScanner';
import { KeyboardShortcutsBar, ShortcutInfo } from '@/components/pos/KeyboardShortcutsBar';
import { POSDisplayModeToggle } from '@/components/pos/POSDisplayModeToggle';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { useBarcodeScanner, BarcodeScanResult } from '@/hooks/useBarcodeScanner';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { CartItem, PaymentMethod } from '@/types/database';
import fallbackLogo from '@/assets/logo.png';
import { toast } from '@/hooks/use-toast';

interface CompletedOrder {
  orderNumber: number;
  items: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export default function POS() {
  const { tenantId, profile } = useAuth();
  const { t } = useBusinessCategoryContext();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const createOrder = useCreateOrder();
  const { settings } = useSystemSettings();
  const { 
    displayMode, 
    allowCashierModeChange, 
    updateDisplayMode,
    isLoading: isLoadingPOSSettings,
  } = usePOSSettings();
  
  // Get branding from system settings
  const branding = settings?.branding as { logo_url?: string; company_name?: string } | undefined;
  const tenantLogoUrl = branding?.logo_url || fallbackLogo;
  const tenantCompanyName = branding?.company_name || 'FoodHub09';

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  
  // Customer info state
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // State for hardware integrations
  const [showScalePanel, setShowScalePanel] = useState(false);
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const scannerButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard shortcuts for POS operations
  const shortcutDefinitions = useMemo(() => [
    {
      key: 'F2',
      label: 'Leitor',
      description: 'Abre o leitor de código de barras',
      action: () => setShowScannerDialog(true),
    },
    {
      key: 'F3',
      label: 'Balança',
      description: 'Mostra/oculta painel da balança',
      action: () => setShowScalePanel(prev => !prev),
    },
    {
      key: 'F4',
      label: 'Pagamento',
      description: 'Abre tela de pagamento',
      action: () => {
        if (cart.length > 0) setIsCustomerInfoOpen(true);
      },
      enabled: cart.length > 0,
    },
    {
      key: 'F8',
      label: 'Limpar',
      description: 'Limpa o carrinho',
      action: () => {
        if (cart.length > 0) {
          clearCart();
          toast({ title: 'Carrinho limpo', description: 'Todos os itens foram removidos.' });
        }
      },
      enabled: cart.length > 0,
    },
  ], [cart.length]);

  useKeyboardShortcuts({
    shortcuts: shortcutDefinitions,
    enabled: !isPaymentOpen && !isCustomerInfoOpen && !isReceiptOpen,
  });

  // Shortcut info for display bar
  const shortcutsDisplay: ShortcutInfo[] = useMemo(() => [
    { key: 'F2', label: 'Leitor', description: 'Abre o leitor de código de barras', icon: <Scan className="h-3 w-3" /> },
    { key: 'F3', label: 'Balança', description: 'Mostra/oculta painel da balança', icon: <Scale className="h-3 w-3" />, isActive: showScalePanel },
    { key: 'F4', label: 'Pagar', description: 'Abre tela de pagamento', icon: <CreditCard className="h-3 w-3" /> },
    { key: 'F8', label: 'Limpar', description: 'Limpa o carrinho', icon: <Trash2 className="h-3 w-3" /> },
  ], [showScalePanel]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Handle barcode scan - find product by SKU, ID or name containing the code
  const handleBarcodeScan = useCallback((result: BarcodeScanResult) => {
    const code = result.code;
    
    // Find product by SKU, ID, or name containing the code
    const product = products.find(p => 
      p.sku === code || 
      p.id === code || 
      p.name.toLowerCase().includes(code.toLowerCase())
    );
    
    if (product) {
      addToCart(product);
      toast({
        title: 'Produto adicionado',
        description: `${product.name} foi adicionado ao carrinho.`,
      });
    } else {
      toast({
        title: 'Produto não encontrado',
        description: `Nenhum produto encontrado com código: ${code}`,
        variant: 'destructive',
      });
    }
  }, [products]);

  // Initialize barcode scanner in keyboard mode (for USB scanners)
  useBarcodeScanner({
    mode: 'keyboard',
    onScan: handleBarcodeScan,
    enabled: true,
  });

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: Product, variation?: ProductVariation) => {
    const unitPrice = variation 
      ? product.base_price + variation.price_modifier 
      : product.base_price;
    
    const cartItemId = variation ? `${product.id}-${variation.id}` : product.id;

    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        return prev.map(item =>
          item.id === cartItemId
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      }
      return [...prev, {
        id: cartItemId,
        productId: product.id,
        productName: product.name,
        variationId: variation?.id,
        variationName: variation?.name,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
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

  const handleCheckout = () => {
    if (cart.length > 0) {
      setIsCustomerInfoOpen(true);
    }
  };

  const handleContinueToPayment = () => {
    setIsCustomerInfoOpen(false);
    setIsPaymentOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod || cart.length === 0) return;

    const result = await createOrder.mutateAsync({
      items: cart,
      paymentMethod: selectedPaymentMethod,
      customerName: customerName.trim() || undefined,
      notes: orderNotes.trim() || undefined,
    });

    // Store completed order for receipt
    setCompletedOrder({
      orderNumber: result.orderNumber,
      items: result.items,
      subtotal: result.subtotal,
      total: result.total,
      paymentMethod: result.paymentMethod,
    });

    setIsPaymentOpen(false);
    clearCart();
    setSelectedPaymentMethod(null);
    setCustomerName('');
    setOrderNotes('');
    
    // Show receipt dialog
    setIsReceiptOpen(true);
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
          
          {/* Display Mode Toggle */}
          <POSDisplayModeToggle
            mode={displayMode}
            onChange={updateDisplayMode}
            allowChange={allowCashierModeChange}
            compact
          />
          
          <Badge variant="outline" className="ml-auto">
            Caixa: {profile?.full_name}
          </Badge>
        </div>

        {/* Keyboard Shortcuts Bar */}
        <KeyboardShortcutsBar shortcuts={shortcutsDisplay} className="mb-3" />

        {/* Search and Hardware Controls */}
        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${t('product').toLowerCase()} ou usar leitor de código...`}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <QuickScanButton 
              onScan={handleBarcodeScan} 
              isOpen={showScannerDialog}
              onOpenChange={setShowScannerDialog}
            />
            <Button
              variant={showScalePanel ? 'default' : 'outline'}
              size="icon"
              onClick={() => setShowScalePanel(!showScalePanel)}
              title="Balança (F3)"
            >
              <Scale className="h-4 w-4" />
            </Button>
          </div>

          {/* Scale Panel */}
          {showScalePanel && (
            <div className="p-3 border rounded-lg bg-muted/50">
              <ScaleDisplay compact />
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid/List */}
        <div className="flex-1 overflow-y-auto">
          {displayMode === 'grid_images' ? (
            <ProductImageGrid
              products={filteredProducts}
              isLoading={isLoadingProducts}
              onSelectProduct={addToCart}
              formatCurrency={formatCurrency}
            />
          ) : (
            <ProductGrid
              products={filteredProducts}
              isLoading={isLoadingProducts}
              onSelectProduct={addToCart}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </div>

      {/* Cart Section */}
      <CartPanel
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckout={handleCheckout}
        formatCurrency={formatCurrency}
        isProcessing={createOrder.isPending}
      />

      {/* Customer Info Dialog */}
      <CustomerInfoDialog
        open={isCustomerInfoOpen}
        onOpenChange={setIsCustomerInfoOpen}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        notes={orderNotes}
        onNotesChange={setOrderNotes}
        onContinue={handleContinueToPayment}
        formatCurrency={formatCurrency}
        total={total}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        total={total}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={setSelectedPaymentMethod}
        onConfirm={handlePayment}
        formatCurrency={formatCurrency}
        isProcessing={createOrder.isPending}
      />

      {/* Receipt Dialog */}
      {completedOrder && (
        <ReceiptDialog
          open={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          orderNumber={completedOrder.orderNumber}
          items={completedOrder.items}
          subtotal={completedOrder.subtotal}
          total={completedOrder.total}
          paymentMethod={completedOrder.paymentMethod}
          cashierName={profile?.full_name || 'Operador'}
          tenantName={tenantCompanyName}
          tenantLogo={tenantLogoUrl}
        />
      )}
    </div>
  );
}
