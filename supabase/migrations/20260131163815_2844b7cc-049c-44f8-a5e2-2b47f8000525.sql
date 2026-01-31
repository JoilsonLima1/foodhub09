-- Normalização de Lojas: Garantir apenas 1 matriz por tenant
-- Lojas mais antigas (primeira created_at) mantêm is_headquarters=true
-- Todas as demais são convertidas para filiais (is_headquarters=false)

-- 1. Primeiro, identificamos a loja mais antiga de cada tenant (será a matriz)
-- 2. Todas as outras lojas do mesmo tenant que também estão como is_headquarters=true
--    serão atualizadas para is_headquarters=false

WITH headquarters_per_tenant AS (
  SELECT DISTINCT ON (tenant_id) 
    id as headquarters_id,
    tenant_id
  FROM stores
  ORDER BY tenant_id, created_at ASC
)
UPDATE stores s
SET 
  is_headquarters = false,
  type = 'branch',
  updated_at = now()
WHERE s.is_headquarters = true
  AND s.id NOT IN (SELECT headquarters_id FROM headquarters_per_tenant);

-- Garantir valores default corretos
UPDATE stores
SET 
  is_active = COALESCE(is_active, true),
  type = COALESCE(type, CASE WHEN is_headquarters THEN 'headquarters' ELSE 'branch' END),
  updated_at = now()
WHERE is_active IS NULL OR type IS NULL;

-- Adicionar constraint para prevenir múltiplas matrizes por tenant no futuro
-- (índice parcial único)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_headquarters_per_tenant 
ON stores (tenant_id) 
WHERE is_headquarters = true;