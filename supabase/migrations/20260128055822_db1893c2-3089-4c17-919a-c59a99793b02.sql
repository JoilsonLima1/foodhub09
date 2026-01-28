-- Create a security definer function to expose public menu data without authentication
-- This allows digital catalogs, online stores, and sales channels to access product data

CREATE OR REPLACE FUNCTION public.get_public_menu(p_tenant_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  tenant_logo_url text,
  tenant_whatsapp text,
  product_id uuid,
  product_name text,
  product_description text,
  product_base_price numeric,
  product_image_url text,
  product_category_id uuid,
  product_category_name text,
  product_has_variations boolean,
  product_display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.logo_url as tenant_logo_url,
    t.whatsapp_number as tenant_whatsapp,
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.base_price as product_base_price,
    p.image_url as product_image_url,
    p.category_id as product_category_id,
    c.name as product_category_name,
    p.has_variations as product_has_variations,
    p.display_order as product_display_order
  FROM public.tenants t
  LEFT JOIN public.products p ON p.tenant_id = t.id 
    AND p.is_active = true 
    AND p.is_available = true
  LEFT JOIN public.categories c ON c.id = p.category_id 
    AND c.is_active = true
  WHERE t.id = p_tenant_id
  ORDER BY p.display_order, p.name
$$;

-- Create function to get public product variations
CREATE OR REPLACE FUNCTION public.get_public_product_variations(p_product_ids uuid[])
RETURNS TABLE (
  product_id uuid,
  variation_id uuid,
  variation_name text,
  price_modifier numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pv.product_id,
    pv.id as variation_id,
    pv.name as variation_name,
    pv.price_modifier
  FROM public.product_variations pv
  WHERE pv.product_id = ANY(p_product_ids)
    AND pv.is_active = true
$$;

-- Create function to get public categories for a tenant
CREATE OR REPLACE FUNCTION public.get_public_categories(p_tenant_id uuid)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  category_display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id as category_id,
    c.name as category_name,
    c.display_order as category_display_order
  FROM public.categories c
  WHERE c.tenant_id = p_tenant_id
    AND c.is_active = true
  ORDER BY c.display_order, c.name
$$;

-- Grant execute permissions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_menu(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_variations(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_categories(uuid) TO anon, authenticated;