-- Add key_hash_version to tenant_devices for legacy migration
ALTER TABLE public.tenant_devices 
ADD COLUMN IF NOT EXISTS key_hash_version integer NOT NULL DEFAULT 2;

-- Update existing devices to version 1 (legacy sha256) since they were created before HMAC
UPDATE public.tenant_devices SET key_hash_version = 1 WHERE key_hash_version = 2;

-- Set default back to 2 for new devices going forward
ALTER TABLE public.tenant_devices ALTER COLUMN key_hash_version SET DEFAULT 2;

COMMENT ON COLUMN public.tenant_devices.key_hash_version IS '1=SHA-256 legacy, 2=HMAC-SHA256';