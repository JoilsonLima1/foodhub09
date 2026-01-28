-- Add feature for public menu (Cardápio na Internet)
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS feature_public_menu boolean DEFAULT false;