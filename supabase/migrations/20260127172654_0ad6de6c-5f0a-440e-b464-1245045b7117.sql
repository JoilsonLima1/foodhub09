-- Add business_category to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS business_category text DEFAULT 'restaurant';

-- Create business category configurations table
CREATE TABLE public.business_category_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Store',
  description text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  terminology jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_category_configs ENABLE ROW LEVEL SECURITY;

-- Everyone can read category configs (public data)
CREATE POLICY "Anyone can view category configs"
ON public.business_category_configs
FOR SELECT
USING (true);

-- Only super admins can manage category configs
CREATE POLICY "Super admins can manage category configs"
ON public.business_category_configs
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default categories
INSERT INTO public.business_category_configs (category_key, name, icon, description, theme, terminology, features, display_order)
VALUES
  ('restaurant', 'Restaurante', 'UtensilsCrossed', 'Restaurantes, lanchonetes e similares', 
   '{"primary": "25 95% 53%", "accent": "45 93% 47%", "sidebar": "0 0% 5%"}'::jsonb,
   '{"product": "Prato", "products": "Pratos", "category": "Categoria", "order": "Pedido", "kitchen": "Cozinha", "table": "Mesa", "menu": "Cardápio"}'::jsonb,
   '{"tables": true, "kitchen_display": true, "delivery": true, "pos": true, "reservations": true}'::jsonb,
   1),
  
  ('ice_cream', 'Sorveteria/Açaiteria', 'IceCream', 'Sorveterias, açaiterias e frozen yogurt',
   '{"primary": "280 85% 65%", "accent": "320 80% 55%", "sidebar": "280 30% 10%"}'::jsonb,
   '{"product": "Sabor", "products": "Sabores", "category": "Linha", "order": "Pedido", "kitchen": "Produção", "table": "Atendimento", "menu": "Cardápio"}'::jsonb,
   '{"tables": false, "kitchen_display": true, "delivery": true, "pos": true, "reservations": false, "toppings": true}'::jsonb,
   2),
  
  ('bakery', 'Padaria/Confeitaria', 'Croissant', 'Padarias, confeitarias e docerias',
   '{"primary": "30 80% 50%", "accent": "15 85% 45%", "sidebar": "30 20% 8%"}'::jsonb,
   '{"product": "Produto", "products": "Produtos", "category": "Seção", "order": "Encomenda", "kitchen": "Produção", "table": "Balcão", "menu": "Vitrine"}'::jsonb,
   '{"tables": false, "kitchen_display": true, "delivery": true, "pos": true, "reservations": false, "pre_orders": true}'::jsonb,
   3),
  
  ('cafe', 'Cafeteria/Juice Bar', 'Coffee', 'Cafeterias, juice bars e casas de chá',
   '{"primary": "25 60% 35%", "accent": "120 50% 45%", "sidebar": "25 25% 8%"}'::jsonb,
   '{"product": "Bebida", "products": "Bebidas", "category": "Tipo", "order": "Pedido", "kitchen": "Preparo", "table": "Mesa", "menu": "Menu"}'::jsonb,
   '{"tables": true, "kitchen_display": true, "delivery": true, "pos": true, "reservations": false, "customizations": true}'::jsonb,
   4),
  
  ('food_truck', 'Food Truck/Delivery Only', 'Truck', 'Food trucks e operações apenas delivery',
   '{"primary": "200 85% 50%", "accent": "45 90% 50%", "sidebar": "200 30% 8%"}'::jsonb,
   '{"product": "Item", "products": "Itens", "category": "Categoria", "order": "Pedido", "kitchen": "Preparo", "table": "Retirada", "menu": "Cardápio"}'::jsonb,
   '{"tables": false, "kitchen_display": true, "delivery": true, "pos": true, "reservations": false, "location_tracking": true}'::jsonb,
   5);

-- Add trigger for updated_at
CREATE TRIGGER update_business_category_configs_updated_at
BEFORE UPDATE ON public.business_category_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();