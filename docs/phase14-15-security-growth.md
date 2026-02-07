# Phase 14-15 - Segurança, Compliance, Growth & Monetização

## Visão Geral

As Fases 14 e 15 completam o ecossistema SaaS com camadas finais de:

- **Segurança Avançada**: Auditoria de acessos e ações sensíveis
- **Compliance LGPD**: Requisições de exportação e exclusão de dados
- **Growth Automático**: Regras de upsell, soft limits, eventos de trial
- **Métricas de Negócio**: KPIs diários, MRR, ARR, churn
- **Auto-Operação**: Self-service e fluxos guiados

---

## Novas Tabelas

### Phase 14: Segurança & Compliance

| Tabela | Descrição |
|--------|-----------|
| `access_audit_log` | Log de acessos (login, logout, denied) |
| `sensitive_actions_log` | Ações de alto risco com review |
| `data_subject_requests` | Requisições LGPD (export/delete) |
| `consent_records` | Registros de consentimento |
| `data_retention_policies` | Políticas de retenção de dados |

### Phase 15: Growth & Monetização

| Tabela | Descrição |
|--------|-----------|
| `trial_events` | Eventos durante período trial |
| `trial_conversion_metrics` | Métricas de conversão trial→pago |
| `upsell_rules` | Regras de gatilho para upsell |
| `upsell_events` | Eventos de upsell (idempotente) |
| `usage_soft_limits` | Limites soft por plano/feature |
| `usage_enforcement_log` | Log de enforcement de limites |
| `business_kpis_daily` | KPIs diários do negócio |
| `conversion_funnel_metrics` | Métricas de funil |
| `self_service_actions` | Ações self-service disponíveis |
| `guided_flows` | Fluxos guiados de onboarding |

---

## Novas RPCs

### Segurança

| RPC | Descrição |
|-----|-----------|
| `validate_actor_permission` | Valida permissão com risk level |
| `assert_partner_scope` | Valida se ator pertence ao parceiro |
| `assert_tenant_scope` | Valida se ator pode acessar tenant |
| `log_sensitive_action` | Registra ação sensível |

### LGPD

| RPC | Descrição |
|-----|-----------|
| `request_data_export` | Solicita exportação de dados |
| `request_data_deletion` | Solicita exclusão de dados |
| `apply_retention_policy` | Aplica políticas de retenção |

### Growth

| RPC | Descrição |
|-----|-----------|
| `record_trial_event` | Registra evento de trial |
| `record_upsell_event` | Registra evento de upsell (idempotente) |
| `check_usage_limit` | Verifica limites de uso |
| `calculate_daily_kpis` | Calcula KPIs do dia |

---

## Novos Painéis Super Admin

### KPIs de Negócio
**Localização**: Super Admin → KPIs de Negócio

Métricas disponíveis:
- MRR / ARR
- Tenants ativos vs total
- Trials ativos e taxa de conversão
- Inadimplência (count + amount)
- ARPU médio
- Add-on attach rate
- Parceiros ativos

Gráficos:
- Evolução do MRR
- Tenants ao longo do tempo
- Trials ativos
- Inadimplência

### Segurança
**Localização**: Super Admin → Segurança

Funcionalidades:
- Logs de acesso ao sistema
- Ações sensíveis com risk level
- Requisições LGPD pendentes
- Filtros e busca

### Growth
**Localização**: Super Admin → Growth

Funcionalidades:
- Gestão de regras de upsell
- Configuração de soft limits
- Eventos de trial

---

## Configuração de Cron Jobs

### Calcular KPIs Diários

```sql
SELECT cron.schedule(
  'calculate-daily-kpis',
  '0 2 * * *', -- 2am diariamente
  $$
  SELECT public.calculate_daily_kpis(CURRENT_DATE);
  $$
);
```

### Aplicar Políticas de Retenção

```sql
SELECT cron.schedule(
  'apply-retention-policies',
  '0 3 * * 0', -- domingos às 3am
  $$
  SELECT public.apply_retention_policy();
  $$
);
```

---

## Segurança

### RLS
Todas as novas tabelas têm RLS habilitado:
- Super Admin tem acesso total
- Usuários veem apenas seus próprios `consent_records`
- `self_service_actions` e `guided_flows` são públicos para leitura (se ativos)

### Risk Levels
- `low`: Operações normais
- `medium`: Mudanças de configuração
- `high`: Alterações financeiras
- `critical`: Exclusões, payouts, config global

### Ações que Requerem Review
- Payouts acima de limite
- Exclusão de tenants
- Mudanças em configurações globais
- Alterações de plano manual

---

## LGPD Compliance

### Fluxo de Exportação
1. Tenant solicita via self-service ou RPC
2. Request criado com status `pending`
3. Deadline automático: 15 dias
4. Super Admin processa e anexa URL
5. Status atualizado para `completed`

### Fluxo de Exclusão
1. Tenant solicita via RPC
2. Request criado com status `pending`
3. Super Admin revisa dados
4. Executa exclusão ou rejeita com motivo
5. Log de ação sensível gerado

---

## Smoke Tests

Execute com:

```bash
bun test src/test/phase14-15-security-growth.test.ts
```

### Testes Implementados (12)
1. `T1` - validate_actor_permission bloqueia não autorizados
2. `T2` - assert_tenant_scope valida corretamente
3. `T3` - assert_partner_scope valida corretamente
4. `T4` - log_sensitive_action cria registro
5. `T5` - request_data_export valida tenant
6. `T6` - data_retention_policies estão seed
7. `T7` - record_trial_event registra corretamente
8. `T8` - record_upsell_event é idempotente
9. `T9` - check_usage_limit retorna estrutura correta
10. `T10` - calculate_daily_kpis funciona
11. `T11` - self_service_actions estão seed
12. `T12` - guided_flows estão seed

---

## Estado Final do Produto

Com as Fases 14 e 15 concluídas, o ecossistema SaaS está completo:

✅ **Multi-tenant com isolamento RLS**
✅ **White-label com branding por parceiro**
✅ **Billing automático com dunning**
✅ **Monetização por transação (split tripartite)**
✅ **Settlement e payout para parceiros**
✅ **Add-ons, cupons e proration**
✅ **Notificações white-label com fila/DLQ**
✅ **Segurança avançada com auditoria**
✅ **Compliance LGPD operacional**
✅ **Growth automático com upsell**
✅ **Soft limits com enforcement progressivo**
✅ **Métricas de negócio (MRR, ARR, churn)**
✅ **Self-service para reduzir suporte**
✅ **Escala com queues, archives e housekeeping**
