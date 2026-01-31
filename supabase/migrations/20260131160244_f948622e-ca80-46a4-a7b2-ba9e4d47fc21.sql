-- Função para garantir loja matriz existe e retornar seu ID
CREATE OR REPLACE FUNCTION public.ensure_headquarters_store(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_tenant_name text;
BEGIN
  -- Verificar se já existe loja matriz
  SELECT id INTO v_store_id
  FROM public.stores
  WHERE tenant_id = p_tenant_id AND is_headquarters = true
  LIMIT 1;
  
  IF v_store_id IS NOT NULL THEN
    RETURN v_store_id;
  END IF;
  
  -- Buscar nome do tenant para usar como nome da loja
  SELECT name INTO v_tenant_name
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- Criar loja matriz
  INSERT INTO public.stores (
    tenant_id,
    name,
    code,
    is_headquarters,
    is_active,
    type
  ) VALUES (
    p_tenant_id,
    COALESCE(v_tenant_name, 'Matriz'),
    'MATRIZ',
    true,
    true,
    'headquarters'
  )
  RETURNING id INTO v_store_id;
  
  RETURN v_store_id;
END;
$$;

-- Função para obter a loja ativa do usuário (com fallback para matriz)
CREATE OR REPLACE FUNCTION public.get_user_active_store(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN p.store_id IS NOT NULL THEN p.store_id
      ELSE (
        SELECT s.id 
        FROM public.stores s 
        WHERE s.tenant_id = p.tenant_id 
          AND s.is_headquarters = true 
        LIMIT 1
      )
    END
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  LIMIT 1
$$;

-- Backfill: preencher store_id para usuários existentes que não têm
DO $$
DECLARE
  v_profile RECORD;
  v_store_id uuid;
BEGIN
  FOR v_profile IN 
    SELECT p.user_id, p.tenant_id 
    FROM public.profiles p 
    WHERE p.store_id IS NULL 
      AND p.tenant_id IS NOT NULL
  LOOP
    -- Garantir que a matriz existe e obter o ID
    v_store_id := public.ensure_headquarters_store(v_profile.tenant_id);
    
    -- Atualizar o perfil com a loja matriz
    UPDATE public.profiles 
    SET store_id = v_store_id, updated_at = now()
    WHERE user_id = v_profile.user_id;
    
    RAISE NOTICE 'Vinculado user % à loja %', v_profile.user_id, v_store_id;
  END LOOP;
END;
$$;

-- Trigger para auto-vincular novos perfis à matriz
CREATE OR REPLACE FUNCTION public.auto_link_profile_to_store()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  -- Se já tem store_id, não fazer nada
  IF NEW.store_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se não tem tenant_id, não podemos vincular
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Garantir matriz e vincular
  v_store_id := public.ensure_headquarters_store(NEW.tenant_id);
  NEW.store_id := v_store_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger no insert/update de profiles
DROP TRIGGER IF EXISTS trigger_auto_link_profile_store ON public.profiles;
CREATE TRIGGER trigger_auto_link_profile_store
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_profile_to_store();