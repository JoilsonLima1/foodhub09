import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Receipt, 
  Clock, 
  Trash2,
  Check,
  ChefHat,
  Utensils,
  Search,
  X,
} from 'lucide-react';
import { 
  useTables,
  useTableSession, 
  useTableSessionMutations,
  type Table, 
  type TableSessionItem 
} from '@/hooks/useTables';
import { useProducts, type Product, type ProductVariation } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TableSessionPanelProps {
  table: Table;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TableSessionPanel({ table, open, onOpenChange }: TableSessionPanelProps) {
  const { refetch: refetchTables } = useTables();
  const { session, isLoading, refetch } = useTableSession(table.activeSession?.id || null);
  const { addItem, updateItemStatus, removeItem, closeSession } = useTableSessionMutations();
  const { data: products = [] } = useProducts();
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClosingSession, setIsClosingSession] = useState(false);

  // Refetch when session changes
  useEffect(() => {
    if (table.activeSession?.id) {
      refetch();
    }
  }, [table.activeSession?.id, refetch]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = async (product: Product, variation?: ProductVariation) => {
    if (!session) return;

    const unitPrice = variation
      ? product.base_price + variation.price_modifier
      : product.base_price;

    await addItem.mutateAsync({
      sessionId: session.id,
      productId: product.id,
      productName: product.name,
      variationId: variation?.id,
      variationName: variation?.name,
      quantity: 1,
      unitPrice,
    });

    refetch();
    refetchTables();
  };

  const handleUpdateStatus = async (item: TableSessionItem, newStatus: string) => {
    if (!session) return;
    await updateItemStatus.mutateAsync({
      itemId: item.id,
      sessionId: session.id,
      status: newStatus,
    });
    refetch();
  };

  const handleRemoveItem = async (item: TableSessionItem) => {
    if (!session) return;
    await removeItem.mutateAsync({
      itemId: item.id,
      sessionId: session.id,
    });
    refetch();
    refetchTables();
  };

  const handleCloseSession = async () => {
    if (!session) return;
    await closeSession.mutateAsync({ sessionId: session.id });
    refetchTables();
    onOpenChange(false);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      preparing: { label: 'Preparando', variant: 'secondary' },
      ready: { label: 'Pronto', variant: 'default' },
      delivered: { label: 'Entregue', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };
    const config = configs[status] || configs.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getNextStatus = (current: string) => {
    const flow: Record<string, string> = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
    };
    return flow[current];
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="h-4 w-4" />,
      preparing: <ChefHat className="h-4 w-4" />,
      ready: <Utensils className="h-4 w-4" />,
      delivered: <Check className="h-4 w-4" />,
    };
    return icons[status] || icons.pending;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="flex items-center gap-3">
              <span className="text-2xl font-bold">Mesa {table.number}</span>
              {table.name && (
                <span className="text-muted-foreground font-normal">
                  ({table.name})
                </span>
              )}
              <Badge variant="default" className="bg-green-600 ml-auto">
                Aberta
              </Badge>
            </SheetTitle>
            {session && (
              <p className="text-sm text-muted-foreground">
                Aberta em {format(new Date(session.opened_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : isAddingItem ? (
            // Add Product Mode
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsAddingItem(false);
                      setSearchTerm('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              
              <ScrollArea className="flex-1 px-6">
                <div className="space-y-2 pb-6">
                  {filteredProducts.map((product) => {
                    if (product.has_variations && product.variations.length > 0) {
                      return product.variations.map((variation) => (
                        <Button
                          key={`${product.id}-${variation.id}`}
                          variant="outline"
                          className="w-full justify-between h-auto py-3"
                          onClick={() => handleAddProduct(product, variation)}
                          disabled={addItem.isPending}
                        >
                          <span className="text-left">
                            {product.name} - {variation.name}
                          </span>
                          <span className="font-bold">
                            {formatCurrency(product.base_price + variation.price_modifier)}
                          </span>
                        </Button>
                      ));
                    }
                    return (
                      <Button
                        key={product.id}
                        variant="outline"
                        className="w-full justify-between h-auto py-3"
                        onClick={() => handleAddProduct(product)}
                        disabled={addItem.isPending}
                      >
                        <span className="text-left">{product.name}</span>
                        <span className="font-bold">
                          {formatCurrency(product.base_price)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : (
            // Session View
            <div className="flex-1 flex flex-col min-h-0">
              {/* Add Item Button */}
              <div className="px-6 pb-4">
                <Button 
                  className="w-full" 
                  onClick={() => setIsAddingItem(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>

              <Separator />

              {/* Items List */}
              <ScrollArea className="flex-1 px-6">
                <div className="py-4 space-y-3">
                  {!session?.items || session.items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum item na comanda</p>
                      <p className="text-sm">Adicione produtos para começar</p>
                    </div>
                  ) : (
                    session.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">
                                {item.product_name}
                                {item.variation_name && (
                                  <span className="text-muted-foreground">
                                    {' '}({item.variation_name})
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity}x {formatCurrency(item.unit_price)}
                              </p>
                            </div>
                            <span className="font-bold whitespace-nowrap">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(item.status)}
                            
                            {item.status !== 'delivered' && item.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                  const next = getNextStatus(item.status);
                                  if (next) handleUpdateStatus(item, next);
                                }}
                              >
                                {getStatusIcon(getNextStatus(item.status) || '')}
                                <span className="ml-1 text-xs">Avançar</span>
                              </Button>
                            )}
                            
                            {item.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveItem(item)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <Separator />

              {/* Footer with Total */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(session?.subtotal || 0)}</span>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsClosingSession(true)}
                  disabled={!session?.items || session.items.length === 0}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Fechar Comanda
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Close Session Confirmation */}
      <AlertDialog open={isClosingSession} onOpenChange={setIsClosingSession}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Comanda da Mesa {table.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Total a pagar: <strong>{formatCurrency(session?.subtotal || 0)}</strong>
              <br />
              Esta ação finalizará a comanda. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseSession}>
              Fechar Comanda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
