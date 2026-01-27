import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}

export function LowStockAlertCard() {
  const { tenantId } = useAuth();
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLowStock = async () => {
      if (!tenantId) return;

      try {
        const { data } = await supabase
          .from('ingredients')
          .select('id, name, current_stock, min_stock, unit')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('current_stock', { ascending: true })
          .limit(5);

        // Filter items where current_stock <= min_stock
        const lowStock = data?.filter(item => 
          Number(item.current_stock) <= Number(item.min_stock)
        ) || [];

        setItems(lowStock);
      } catch (error) {
        console.error('Error fetching low stock:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLowStock();
  }, [tenantId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={items.length > 0 ? 'border-warning/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {items.length > 0 ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          Alertas de Estoque
        </CardTitle>
        {items.length > 0 && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            {items.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success opacity-70" />
            <p className="text-sm">Estoque em dia!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/10"
              >
                <span className="text-sm font-medium truncate max-w-[140px]">
                  {item.name}
                </span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-warning">
                    {Number(item.current_stock).toFixed(1)} {item.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mín: {Number(item.min_stock).toFixed(1)}
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
