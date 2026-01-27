-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('branding', 'branding', true, 10485760) -- 10MB limit
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to branding bucket
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding');

-- Allow authenticated users to upload branding assets
CREATE POLICY "Authenticated users can upload branding assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

-- Allow authenticated users to update branding assets
CREATE POLICY "Authenticated users can update branding assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

-- Allow authenticated users to delete branding assets
CREATE POLICY "Authenticated users can delete branding assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding');