-- Corrigir políticas públicas muito permissivas
-- Manter SELECT público mas restringir outras operações

-- Remover políticas muito permissivas existentes
DROP POLICY IF EXISTS "Public can read partner branding by domain" ON public.partner_branding;
DROP POLICY IF EXISTS "Public can read partner domains" ON public.partner_domains;

-- Recriar com restrição apenas para SELECT (leitura)
CREATE POLICY "Public read partner branding"
  ON public.partner_branding FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read verified partner domains"
  ON public.partner_domains FOR SELECT
  TO anon, authenticated
  USING (is_verified = true);