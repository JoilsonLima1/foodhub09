import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export function TopProductsTodayCard() {
  const { tenantId } = useAuth();
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      if (!tenantId) return;

      try {
        const today = new Date();

        // Get today's order IDs
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('tenant_id', tenantId)
          .neq('status', 'cancelled')
          .gte('created_at', startOfDay(today).toISOString())
          .lte('created_at', endOfDay(today).toISOString());

        if (!todayOrders || todayOrders.length === 0) {
          setProducts([]);
          setIsLoading(false);
          return;
        }

        const orderIds = todayOrders.map(o => o.id);

        // Get order items for today's orders
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_name, quantity, total_price')
          .in('order_id', orderIds);

        if (!orderItems) {
          setProducts([]);
          setIsLoading(false);
          return;
        }

        // Aggregate by product
        const productMap = new Map<string, { quantity: number; revenue: number }>();
        
        orderItems.forEach(item => {
          const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
          productMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + Number(item.total_price),
          });
        });

        // Sort by quantity and get top 5
        const topProducts = Array.from(productMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        setProducts(topProducts);
      } catch (error) {
        console.error('Error fetching top products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopProducts();
  }, [tenantId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Top Produtos Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma venda hoje ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={index === 0 ? 'bg-primary/10 text-primary border-primary/20' : ''}
                  >
                    #{index + 1}
                  </Badge>
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {product.name}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{product.quantity}x</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
