import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  has_variations: boolean;
  variations: PublicProductVariation[];
}

export interface PublicProductVariation {
  id: string;
  name: string;
  price_modifier: number;
}

export interface PublicCategory {
  id: string;
  name: string;
  display_order: number;
}

export interface TenantInfo {
  id: string;
  name: string;
  whatsapp_number: string | null;
  logo_url: string | null;
}

export function usePublicMenu(tenantSlug: string) {
  return useQuery({
    queryKey: ['public-menu', tenantSlug],
    queryFn: async () => {
      // For now, we'll use the tenant ID directly
      // In production, you'd resolve the slug to tenant ID
      const tenantId = tenantSlug;

      // Fetch tenant info (name, whatsapp, logo)
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, whatsapp_number, logo_url')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, display_order')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) throw categoriesError;

      // Fetch products
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
          categories (name)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('is_available', true)
        .order('display_order');

      if (productsError) throw productsError;

      // Fetch variations for products that have them
      const productIds = products?.filter(p => p.has_variations).map(p => p.id) || [];
      let variationsMap: Record<string, PublicProductVariation[]> = {};

      if (productIds.length > 0) {
        const { data: variations, error: variationsError } = await supabase
          .from('product_variations')
          .select('id, name, price_modifier, product_id')
          .in('product_id', productIds)
          .eq('is_active', true);

        if (variationsError) throw variationsError;

        variationsMap = (variations || []).reduce((acc, v) => {
          const productId = (v as any).product_id;
          if (!acc[productId]) acc[productId] = [];
          acc[productId].push({
            id: v.id,
            name: v.name,
            price_modifier: v.price_modifier || 0,
          });
          return acc;
        }, {} as Record<string, PublicProductVariation[]>);
      }

      return {
        tenant: tenant as TenantInfo,
        categories: categories as PublicCategory[],
        products: (products || []).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          base_price: p.base_price,
          image_url: p.image_url,
          category_id: p.category_id,
          category_name: (p.categories as { name: string } | null)?.name || null,
          has_variations: p.has_variations || false,
          variations: variationsMap[p.id] || [],
        })) as PublicProduct[],
      };
    },
    enabled: !!tenantSlug,
  });
}
