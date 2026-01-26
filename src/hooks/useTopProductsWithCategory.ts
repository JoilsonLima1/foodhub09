import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  categoryId: string | null;
  categoryName: string | null;
}

interface Category {
  id: string;
  name: string;
}

export function useTopProductsWithCategory(days: number = 7, limit: number = 10, categoryId?: string) {
  const { tenantId } = useAuth();
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = async () => {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchTopProducts = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), days - 1));

      // Fetch order items with orders to filter by date
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          product_name,
          quantity,
          total_price,
          order:orders!inner (
            id,
            status,
            created_at,
            tenant_id
          )
        `)
        .eq('order.tenant_id', tenantId)
        .gte('order.created_at', startDate.toISOString())
        .lte('order.created_at', endDate.toISOString())
        .in('order.status', ['paid', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']);

      if (error) throw error;

      // Fetch products with categories
      const { data: productsData } = await supabase
        .from('products')
        .select('id, category_id, category:categories(id, name)')
        .eq('tenant_id', tenantId);

      const productCategoryMap = new Map<string, { categoryId: string | null; categoryName: string | null }>();
      productsData?.forEach((p: any) => {
        productCategoryMap.set(p.id, {
          categoryId: p.category_id,
          categoryName: p.category?.name || null,
        });
      });

      // Aggregate by product
      const productTotals: Record<string, TopProduct> = {};

      orderItems?.forEach((item) => {
        const key = item.product_id || item.product_name;
        const categoryInfo = item.product_id ? productCategoryMap.get(item.product_id) : null;
        
        if (!productTotals[key]) {
          productTotals[key] = {
            productId: item.product_id || '',
            productName: item.product_name,
            quantity: 0,
            revenue: 0,
            categoryId: categoryInfo?.categoryId || null,
            categoryName: categoryInfo?.categoryName || null,
          };
        }
        productTotals[key].quantity += item.quantity;
        productTotals[key].revenue += Number(item.total_price);
      });

      // Filter by category if specified
      let filtered = Object.values(productTotals);
      if (categoryId) {
        filtered = filtered.filter(p => p.categoryId === categoryId);
      }

      // Sort by quantity and take top N
      const sorted = filtered
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);

      setProducts(sorted);
    } catch (error) {
      console.error('Error fetching top products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [tenantId]);

  useEffect(() => {
    fetchTopProducts();
  }, [tenantId, days, limit, categoryId]);

  return { products, categories, isLoading, refetch: fetchTopProducts };
}
