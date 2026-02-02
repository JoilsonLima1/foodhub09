-- =====================================================
-- MODULARIZAÇÃO PARTE 1: Adicionar novas categorias de enum
-- =====================================================
ALTER TYPE addon_module_category ADD VALUE IF NOT EXISTS 'digital_service';
ALTER TYPE addon_module_category ADD VALUE IF NOT EXISTS 'payment';
ALTER TYPE addon_module_category ADD VALUE IF NOT EXISTS 'access_control';