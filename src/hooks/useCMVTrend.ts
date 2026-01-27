import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrendDataPoint {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CategoryData {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  productCount: number;
}

interface CMVTrendData {
  dailyTrend: TrendDataPoint[];
  weeklyTrend: TrendDataPoint[];
  byCategory: CategoryData[];
}

export function useCMVTrend(days: number = 30) {
  const { tenantId } = useAuth();
  const [data, setData] = useState<CMVTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrendData = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), days - 1));

      // Fetch order items with orders
      const { data: orderItems, error: itemsError } = await supabase
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

      if (itemsError) throw itemsError;

      // Fetch products with categories
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category:categories(id, name)')
        .eq('tenant_id', tenantId);

      if (productsError) throw productsError;

      // Create product -> category map
      const productCategoryMap: Record<string, string> = {};
      products?.forEach(p => {
        productCategoryMap[p.id] = (p.category as { name: string } | null)?.name || 'Sem categoria';
      });

      // Fetch recipes with ingredients
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select(`
          id,
          product_id,
          recipe_items (
            id,
            quantity,
            ingredient:ingredients (
              id,
              name,
              cost_per_unit
            )
          )
        `);

      if (recipesError) throw recipesError;

      // Build product -> cost map
      const productCosts: Record<string, number> = {};
      recipes?.forEach((recipe) => {
        let totalCost = 0;
        recipe.recipe_items?.forEach((item) => {
          const ingredientCost = Number((item.ingredient as { cost_per_unit: number } | null)?.cost_per_unit || 0);
          const quantity = Number(item.quantity || 0);
          totalCost += ingredientCost * quantity;
        });
        if (recipe.product_id) {
          productCosts[recipe.product_id] = totalCost;
        }
      });

      // Process daily data
      const dailyData: Record<string, { revenue: number; cost: number }> = {};
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      dateRange.forEach(date => {
        dailyData[format(date, 'yyyy-MM-dd')] = { revenue: 0, cost: 0 };
      });

      // Category aggregation
      const categoryData: Record<string, { revenue: number; cost: number; productIds: Set<string> }> = {};

      orderItems?.forEach((item) => {
        const order = item.order as { created_at: string } | null;
        if (!order?.created_at) return;

        const dateKey = format(new Date(order.created_at), 'yyyy-MM-dd');
        const unitCost = item.product_id ? (productCosts[item.product_id] || 0) : 0;
        const itemCost = unitCost * item.quantity;
        const itemRevenue = Number(item.total_price);

        // Daily aggregation
        if (dailyData[dateKey]) {
          dailyData[dateKey].revenue += itemRevenue;
          dailyData[dateKey].cost += itemCost;
        }

        // Category aggregation
        const categoryName = item.product_id ? productCategoryMap[item.product_id] || 'Sem categoria' : 'Sem categoria';
        if (!categoryData[categoryName]) {
          categoryData[categoryName] = { revenue: 0, cost: 0, productIds: new Set() };
        }
        categoryData[categoryName].revenue += itemRevenue;
        categoryData[categoryName].cost += itemCost;
        if (item.product_id) {
          categoryData[categoryName].productIds.add(item.product_id);
        }
      });

      // Format daily trend
      const dailyTrend: TrendDataPoint[] = Object.entries(dailyData).map(([date, data]) => ({
        period: format(new Date(date), 'dd/MM', { locale: ptBR }),
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
      }));

      // Calculate weekly trend
      const weeklyData: Record<string, { revenue: number; cost: number }> = {};
      
      Object.entries(dailyData).forEach(([date, data]) => {
        const weekStart = startOfWeek(new Date(date), { locale: ptBR });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { revenue: 0, cost: 0 };
        }
        weeklyData[weekKey].revenue += data.revenue;
        weeklyData[weekKey].cost += data.cost;
      });

      const weeklyTrend: TrendDataPoint[] = Object.entries(weeklyData)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([date, data]) => ({
          period: `Sem ${format(new Date(date), 'dd/MM', { locale: ptBR })}`,
          revenue: data.revenue,
          cost: data.cost,
          profit: data.revenue - data.cost,
          margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
        }));

      // Format category data
      const byCategory: CategoryData[] = Object.entries(categoryData)
        .map(([category, data]) => ({
          category,
          revenue: data.revenue,
          cost: data.cost,
          profit: data.revenue - data.cost,
          margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
          productCount: data.productIds.size,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setData({ dailyTrend, weeklyTrend, byCategory });
    } catch (error) {
      console.error('Error fetching CMV trend data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
  }, [tenantId, days]);

  return { data, isLoading, refetch: fetchTrendData };
}
