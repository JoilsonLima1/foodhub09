import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LowStockIngredient {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}

export function useLowStockAlerts() {
  const { tenantId } = useAuth();
  const alertedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tenantId) return;

    const checkLowStock = async () => {
      const { data: ingredients, error } = await supabase
        .from('ingredients')
        .select('id, name, current_stock, min_stock, unit')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) {
        console.error('Error checking low stock:', error);
        return;
      }

      ingredients?.forEach((ingredient) => {
        const isLow = (ingredient.current_stock ?? 0) <= (ingredient.min_stock ?? 0);
        
        if (isLow && !alertedIds.current.has(ingredient.id)) {
          alertedIds.current.add(ingredient.id);
          
          toast.warning(`Estoque baixo: ${ingredient.name}`, {
            description: `Apenas ${ingredient.current_stock?.toFixed(2)} ${ingredient.unit} restantes (mínimo: ${ingredient.min_stock} ${ingredient.unit})`,
            duration: 10000,
            action: {
              label: 'Ver Estoque',
              onClick: () => window.location.href = '/stock',
            },
          });
        } else if (!isLow && alertedIds.current.has(ingredient.id)) {
          // Reset alert if stock is replenished
          alertedIds.current.delete(ingredient.id);
        }
      });
    };

    // Check immediately on mount
    checkLowStock();

    // Subscribe to realtime changes on ingredients table
    const channel = supabase
      .channel('low-stock-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ingredients',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          checkLowStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);
}
