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
      const tenantId = tenantSlug;

      // Use security definer functions for public access (no auth required)
      const { data: menuData, error: menuError } = await supabase
        .rpc('get_public_menu', { p_tenant_id: tenantId });

      if (menuError) throw menuError;

      // Get categories using public function
      const { data: categoriesData, error: categoriesError } = await supabase
        .rpc('get_public_categories', { p_tenant_id: tenantId });

      if (categoriesError) throw categoriesError;

      // Extract tenant info from first row
      const firstRow = menuData?.[0];
      const tenant: TenantInfo = {
        id: tenantId,
        name: firstRow?.tenant_name || '',
        whatsapp_number: firstRow?.tenant_whatsapp || null,
        logo_url: firstRow?.tenant_logo_url || null,
      };

      // Map categories
      const categories: PublicCategory[] = (categoriesData || []).map((c: any) => ({
        id: c.category_id,
        name: c.category_name,
        display_order: c.category_display_order,
      }));

      // Extract unique products
      const productsMap = new Map<string, PublicProduct>();
      const productIdsWithVariations: string[] = [];

      (menuData || []).forEach((row: any) => {
        if (row.product_id && !productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            base_price: row.product_base_price,
            image_url: row.product_image_url,
            category_id: row.product_category_id,
            category_name: row.product_category_name,
            has_variations: row.product_has_variations || false,
            variations: [],
          });
          
          if (row.product_has_variations) {
            productIdsWithVariations.push(row.product_id);
          }
        }
      });

      // Fetch variations if any products have them
      if (productIdsWithVariations.length > 0) {
        const { data: variationsData, error: variationsError } = await supabase
          .rpc('get_public_product_variations', { p_product_ids: productIdsWithVariations });

        if (!variationsError && variationsData) {
          variationsData.forEach((v: any) => {
            const product = productsMap.get(v.product_id);
            if (product) {
              product.variations.push({
                id: v.variation_id,
                name: v.variation_name,
                price_modifier: v.price_modifier || 0,
              });
            }
          });
        }
      }

      return {
        tenant,
        categories,
        products: Array.from(productsMap.values()),
      };
    },
    enabled: !!tenantSlug,
  });
}
