
-- Add missing fields to partner_marketing_pages for WhatsApp/demo/CTA
ALTER TABLE public.partner_marketing_pages
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS demo_url text,
  ADD COLUMN IF NOT EXISTS signup_url text,
  ADD COLUMN IF NOT EXISTS hero_video_url text;

-- Add is_featured and is_default to partner_plans
ALTER TABLE public.partner_plans
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Ensure only 1 default plan per partner
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_plans_one_default 
  ON public.partner_plans (partner_id) 
  WHERE is_default = true;
