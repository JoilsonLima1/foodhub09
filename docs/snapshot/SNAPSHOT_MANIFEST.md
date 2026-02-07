# 🔒 SNAPSHOT IMUTÁVEL DE PRODUÇÃO
## release/production-baseline-v1

**Data de Criação**: 2026-02-07T21:10:00Z  
**Status**: ✅ CONGELADO  
**Integridade**: VERIFICADA  

---

## 📋 MANIFESTO DO SNAPSHOT

Este documento representa o estado congelado do sistema em produção.
**NÃO ALTERE** nenhum arquivo nesta pasta sem criar nova versão.

### Arquivos do Snapshot

| Arquivo | Conteúdo |
|---------|----------|
| `SNAPSHOT_MANIFEST.md` | Este documento |
| `migrations-applied.json` | Lista de todas as migrations |
| `feature-flags.json` | Estado das feature flags |
| `seed-data.json` | Dados de seed essenciais |
| `restore-procedure.md` | Procedimento de restauração |

---

## 🏷️ IDENTIFICAÇÃO

```
Version Tag:     release/production-baseline-v1
Snapshot Date:   2026-02-07
Total Migrations: 112
Database Schema: v112 (20260207205950)
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [x] Constraints de idempotência verificados
- [x] RLS policies em tabelas críticas
- [x] Feature flags documentados
- [x] Seed data exportado
- [x] Dunning policy configurada
- [x] Templates de notificação carregados
- [x] Guias de parceiros seeded
- [x] Módulos addon configurados
- [x] Categorias de negócio ativas
- [x] Políticas de retenção definidas

---

## 🚫 O QUE NÃO ALTERAR

Após este snapshot, as seguintes alterações são **PROIBIDAS** sem nova versão:

1. **Schema crítico** (`payment_events`, `transaction_effects`)
2. **Constraints de idempotência** (UNIQUE keys)
3. **Lógica de apply_payment_event**
4. **Cálculo de splits financeiros**
5. **Dunning policy default**
6. **RLS policies em tabelas financeiras**

---

## 🔄 COMO RESTAURAR

1. Reverter para este ponto via History do Lovable
2. Verificar migrations aplicadas vs manifest
3. Rodar smoke tests
4. Validar dados de seed

Detalhes completos em `restore-procedure.md`

---

## 📊 MÉTRICAS DO SNAPSHOT

| Métrica | Valor |
|---------|-------|
| Tabelas no schema | 130+ |
| Migrations | 112 |
| Feature Flags | 6 |
| Notification Templates | 10 (production) |
| Addon Modules | 26 |
| Business Categories | 7 |
| Partner Guides | 5 |
| Data Retention Policies | 5 |

---

## 🔐 HASH DE INTEGRIDADE

```
Schema Version: 20260207205950
Feature Flags Hash: archive_ledger+async_payout+onboarding_sync+split_enabled
Seed Data: billing_settings+dunning+templates+guides+modules
```

---

**⚠️ AVISO LEGAL**

Este snapshot representa o estado de produção validado.
Qualquer alteração deve ser feita em nova versão com:
- Novo tag de release
- Novo manifesto
- Testes de regressão

