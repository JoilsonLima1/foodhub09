# 🔄 PROCEDIMENTO DE RESTAURAÇÃO
## release/production-baseline-v1

---

## ⚠️ QUANDO USAR

Use este procedimento apenas se:

1. Uma atualização causou regressão crítica
2. Dados financeiros foram corrompidos
3. Sistema está instável após deploy
4. Rollback manual é necessário

---

## 📋 PRÉ-REQUISITOS

Antes de restaurar:

- [ ] Confirmar que o problema requer rollback completo
- [ ] Notificar stakeholders sobre downtime
- [ ] Fazer backup do estado atual (mesmo que corrompido)
- [ ] Ter acesso ao Lovable Cloud View

---

## 🔧 PASSO A PASSO

### Opção 1: Rollback via Lovable History (Recomendado)

1. **Abrir History**
   - No chat do Lovable, clique em "History" no topo
   - Ou use o botão abaixo:

```xml
<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>
```

2. **Localizar o Snapshot**
   - Procure por: "SCAN FINAL COMPLETO" ou "Baseline Imutável"
   - Data: 2026-02-07
   - Clique em "Restore"

3. **Verificar Restauração**
   - Confirmar que o código foi revertido
   - Verificar migrations no banco

### Opção 2: Verificação Manual do Database

Se apenas o banco precisa ser verificado:

```sql
-- 1. Verificar migrations aplicadas
SELECT COUNT(*) as total, MAX(version) as latest
FROM supabase_migrations.schema_migrations;
-- Esperado: total=112, latest=20260207205950

-- 2. Verificar constraints críticos
SELECT conname 
FROM pg_constraint
WHERE conrelid = 'public.payment_events'::regclass
  AND contype = 'u';
-- Esperado: uq_payment_events_provider_event

-- 3. Verificar dados de seed
SELECT 
  (SELECT COUNT(*) FROM system_feature_flags) as flags,
  (SELECT COUNT(*) FROM notification_templates WHERE partner_id IS NULL) as templates,
  (SELECT COUNT(*) FROM addon_modules WHERE is_active = true) as modules,
  (SELECT COUNT(*) FROM partner_guides WHERE is_active = true) as guides;
-- Esperado: flags=6, templates>=10, modules=26, guides=5
```

---

## ✅ VALIDAÇÃO PÓS-RESTAURAÇÃO

### Checklist Obrigatório

- [ ] Verificar que `/auth` carrega
- [ ] Verificar que `/dashboard` carrega (com auth)
- [ ] Verificar que `/partner` carrega (para partners)
- [ ] Verificar que `/super-admin` carrega (para super admins)

### Smoke Tests Rápidos

1. **Auth Flow**
   - Login funciona
   - Logout funciona
   - Redirect após login correto

2. **Dashboard**
   - Cards de resumo carregam
   - Dados aparecem (se existirem)

3. **Partner Panel**
   - Onboarding page carrega
   - Tenants list carrega

### Verificação de Integridade Financeira

```sql
-- Verificar que payment_events está intacto
SELECT COUNT(*) as events, 
       COUNT(DISTINCT provider_event_id) as unique_events
FROM payment_events;
-- unique_events deve ser igual a events (sem duplicatas)

-- Verificar transaction_effects
SELECT COUNT(*) as effects,
       COUNT(DISTINCT (source_event_id, target)) as unique_effects
FROM transaction_effects;
-- unique_effects deve ser igual a effects (sem duplicatas)
```

---

## 🚨 SE A RESTAURAÇÃO FALHAR

1. **Não entre em pânico**
2. **Documente o erro** exato que ocorreu
3. **Entre em contato** com suporte Lovable
4. **Preserve logs** do console/network

### Informações a Coletar

- Screenshot do erro
- Console logs
- Network requests com falha
- Último comando/ação executado

---

## 📞 ESCALAÇÃO

Se precisar de ajuda:

1. Documentação: https://docs.lovable.dev
2. Suporte: Via chat do Lovable
3. Emergência: Abrir ticket prioritário

---

## 📝 NOTAS IMPORTANTES

### O que será restaurado:
- ✅ Código fonte (React/TypeScript)
- ✅ Configurações do projeto
- ✅ Edge Functions

### O que NÃO será restaurado automaticamente:
- ⚠️ Dados inseridos após o snapshot
- ⚠️ Migrations aplicadas após o snapshot
- ⚠️ Secrets/API keys (permanecem no vault)

### Sobre dados financeiros:
O ledger SSOT (`payment_events`) é **imutável por design**.
Dados financeiros nunca são deletados, apenas marcados ou revertidos via entradas de ajuste.

---

*Documento gerado em: 2026-02-07*
*Versão: release/production-baseline-v1*
