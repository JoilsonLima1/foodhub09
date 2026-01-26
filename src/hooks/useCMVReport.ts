import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface ProductCost {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CMVReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  products: ProductCost[];
}

export function useCMVReport(days: number = 7) {
  const { tenantId } = useAuth();
  const [report, setReport] = useState<CMVReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCMVReport = async () => {
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

      // Build a map of product_id -> cost per unit
      const productCosts: Record<string, number> = {};
      recipes?.forEach((recipe) => {
        let totalCost = 0;
        recipe.recipe_items?.forEach((item) => {
          const ingredientCost = Number(item.ingredient?.cost_per_unit || 0);
          const quantity = Number(item.quantity || 0);
          totalCost += ingredientCost * quantity;
        });
        if (recipe.product_id) {
          productCosts[recipe.product_id] = totalCost;
        }
      });

      // Aggregate by product
      const productTotals: Record<string, ProductCost> = {};

      orderItems?.forEach((item) => {
        const key = item.product_id || item.product_name;
        const unitCost = item.product_id ? (productCosts[item.product_id] || 0) : 0;
        const itemCost = unitCost * item.quantity;
        const itemRevenue = Number(item.total_price);
        const itemProfit = itemRevenue - itemCost;

        if (!productTotals[key]) {
          productTotals[key] = {
            productId: item.product_id || '',
            productName: item.product_name,
            quantitySold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
          };
        }

        productTotals[key].quantitySold += item.quantity;
        productTotals[key].revenue += itemRevenue;
        productTotals[key].cost += itemCost;
        productTotals[key].profit += itemProfit;
      });

      // Calculate margins
      Object.values(productTotals).forEach((product) => {
        product.margin = product.revenue > 0 
          ? (product.profit / product.revenue) * 100 
          : 0;
      });

      // Sort by revenue
      const sortedProducts = Object.values(productTotals)
        .sort((a, b) => b.revenue - a.revenue);

      // Calculate totals
      const totalRevenue = sortedProducts.reduce((sum, p) => sum + p.revenue, 0);
      const totalCost = sortedProducts.reduce((sum, p) => sum + p.cost, 0);
      const totalProfit = totalRevenue - totalCost;
      const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      setReport({
        totalRevenue,
        totalCost,
        totalProfit,
        overallMargin,
        products: sortedProducts,
      });
    } catch (error) {
      console.error('Error fetching CMV report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCMVReport();
  }, [tenantId, days]);

  return { report, isLoading, refetch: fetchCMVReport };
}
