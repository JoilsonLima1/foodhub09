import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProductVariation {
  id: string;
  name: string;
  price_modifier: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  has_variations: boolean;
  is_available: boolean;
  variations: ProductVariation[];
}

export interface Category {
  id: string;
  name: string;
  display_order: number;
}

export function useProducts() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['products', tenantId],
    queryFn: async (): Promise<Product[]> => {
      if (!tenantId) return [];

      // Fetch products with category
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          base_price,
          image_url,
          category_id,
          has_variations,
          is_available,
          categories (
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('is_available', true)
        .order('display_order');

      if (productsError) throw productsError;

      // Fetch variations for products that have them
      const productIds = products?.filter(p => p.has_variations).map(p => p.id) || [];
      
      let variationsMap: Record<string, ProductVariation[]> = {};
      
      if (productIds.length > 0) {
        const { data: variations, error: variationsError } = await supabase
          .from('product_variations')
          .select('id, name, price_modifier, is_active, product_id')
          .in('product_id', productIds)
          .eq('is_active', true);

        if (variationsError) throw variationsError;

        variationsMap = (variations || []).reduce((acc, v) => {
          if (!acc[v.product_id]) acc[v.product_id] = [];
          acc[v.product_id].push({
            id: v.id,
            name: v.name,
            price_modifier: v.price_modifier || 0,
            is_active: v.is_active || true,
          });
          return acc;
        }, {} as Record<string, ProductVariation[]>);
      }

      return (products || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        base_price: p.base_price,
        image_url: p.image_url,
        category_id: p.category_id,
        category_name: (p.categories as { name: string } | null)?.name || null,
        has_variations: p.has_variations || false,
        is_available: p.is_available || true,
        variations: variationsMap[p.id] || [],
      }));
    },
    enabled: !!tenantId,
  });
}

export function useCategories() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['categories', tenantId],
    queryFn: async (): Promise<Category[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, display_order')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}
