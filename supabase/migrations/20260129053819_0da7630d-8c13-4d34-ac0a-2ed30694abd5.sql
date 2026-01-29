-- Add CPF/CNPJ column to profiles table for Asaas payment integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_cpf_cnpj ON public.profiles(cpf_cnpj);

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.cpf_cnpj IS 'CPF or CNPJ for payment gateway integration (Asaas requires this for production payments)';