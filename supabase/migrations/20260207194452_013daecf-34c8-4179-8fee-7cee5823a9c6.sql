-- Add verification code columns to marketing_seo_settings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'marketing_seo_settings' 
    AND column_name = 'google_verification_code'
  ) THEN
    ALTER TABLE public.marketing_seo_settings 
    ADD COLUMN google_verification_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'marketing_seo_settings' 
    AND column_name = 'bing_verification_code'
  ) THEN
    ALTER TABLE public.marketing_seo_settings 
    ADD COLUMN bing_verification_code text;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.marketing_seo_settings.google_verification_code IS 'Google Search Console verification code for meta tag injection';
COMMENT ON COLUMN public.marketing_seo_settings.bing_verification_code IS 'Bing Webmaster Tools verification code for meta tag injection';