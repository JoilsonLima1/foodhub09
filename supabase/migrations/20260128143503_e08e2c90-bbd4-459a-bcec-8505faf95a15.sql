-- Create enum for suggestion status
CREATE TYPE public.suggestion_status AS ENUM ('pending', 'read', 'responded', 'archived');

-- Create suggestions table
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID,
  
  -- Contact info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  organization_name TEXT,
  
  -- Suggestion content
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  suggestion_type TEXT NOT NULL DEFAULT 'improvement', -- 'improvement', 'bug', 'feature', 'other'
  
  -- Status and response
  status suggestion_status NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID,
  
  -- Metadata
  source TEXT NOT NULL DEFAULT 'landing', -- 'landing' or 'organization'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert suggestions (public form)
CREATE POLICY "Anyone can submit suggestions"
ON public.suggestions
FOR INSERT
WITH CHECK (true);

-- Policy: Super admins can view all suggestions
CREATE POLICY "Super admins can view all suggestions"
ON public.suggestions
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Policy: Super admins can update suggestions (respond)
CREATE POLICY "Super admins can update suggestions"
ON public.suggestions
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Policy: Super admins can delete suggestions
CREATE POLICY "Super admins can delete suggestions"
ON public.suggestions
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();