# Phase 13 - Sistema de Notificações White-label

## Visão Geral

O sistema de notificações Phase 13 implementa uma infraestrutura robusta para envio de mensagens multi-canal (email, WhatsApp, SMS, in-app) com suporte a:

- **Templates personalizáveis** por parceiro com fallback para defaults da plataforma
- **Fila de processamento** idempotente com deduplicação
- **Retry exponencial** com Dead Letter Queue (DLQ)
- **Emissão automática** de notificações de billing

---

## Rotas

### Painel do Parceiro
| Rota | Descrição |
|------|-----------|
| `/partner/notifications` | Gestão de templates de notificação do parceiro |

### Backoffice Super Admin
| Aba | Localização |
|-----|-------------|
| Fila de Notificações | Super Admin → Backoffice Ops → Fila de Notificações |

---

## Como o Parceiro Edita Templates

1. Acesse **Painel do Parceiro → Notificações**
2. Visualize os templates disponíveis (platform defaults + overrides do parceiro)
3. Clique em um template para editar
4. Modifique o **assunto** e **corpo** usando variáveis suportadas
5. Use o botão **Preview** para visualizar a renderização
6. Salve as alterações

### Variáveis Suportadas
- `{{tenant_name}}` - Nome da organização
- `{{invoice_number}}` - Número da fatura
- `{{due_date}}` - Data de vencimento
- `{{amount}}` - Valor
- `{{plan_name}}` - Nome do plano

---

## Como o Admin Monitora a Fila

1. Acesse **Super Admin → Backoffice Ops → Fila de Notificações**
2. Visualize estatísticas: queued, sending, sent, failed, dead
3. Filtre por status para análise
4. Reprocesse notificações "dead" se necessário
5. Clique em **Processar Fila** para trigger manual do processamento

---

## Processamento Automático (Cron Jobs)

### process_notification_outbox
Processa a fila de notificações pendentes.

```sql
-- Executar a cada 5 minutos
SELECT cron.schedule(
  'process-notification-outbox',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://baxitzkbbqqbbbtojswm.supabase.co/functions/v1/cron-process-notifications',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### emit_billing_notifications
Emite notificações automáticas baseadas em eventos de billing.

```sql
-- Executar diariamente às 8h
SELECT cron.schedule(
  'emit-billing-notifications',
  '0 8 * * *',
  $$
  SELECT public.emit_billing_notifications(
    p_date_from := (CURRENT_DATE - INTERVAL '1 day')::date,
    p_date_to := CURRENT_DATE
  );
  $$
);
```

---

## RPCs Disponíveis

| RPC | Descrição |
|-----|-----------|
| `upsert_notification_template` | Cria/atualiza template (idempotente) |
| `resolve_notification_template` | Resolve template com fallback |
| `enqueue_notification` | Adiciona à fila (dedupe por key) |
| `process_notification_outbox` | Processa batch da fila |
| `mark_notification_delivery` | Atualiza status de entrega |
| `preview_notification` | Renderiza preview sem enviar |
| `emit_billing_notifications` | Emite notificações de billing |
| `requeue_dead_notification` | Recoloca dead na fila |

---

## Estrutura do Banco

### notification_templates
Templates de notificação por canal e parceiro.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| partner_id | uuid | NULL = default da plataforma |
| channel | enum | email, whatsapp, inapp, sms |
| template_key | text | Identificador único |
| subject | text | Assunto (email) |
| body | text | Corpo com variáveis |
| variables | text[] | Lista de variáveis suportadas |

### notification_outbox
Fila de notificações com retry e DLQ.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| dedupe_key | text | Chave de deduplicação |
| status | enum | queued, sending, sent, failed, dead |
| attempts | int | Tentativas realizadas |
| max_attempts | int | Máximo de tentativas |
| next_attempt_at | timestamptz | Próxima tentativa (backoff) |
| correlation_id | uuid | ID para rastreamento |

### notification_delivery
Logs de entrega por provider.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| outbox_id | uuid | Referência ao outbox |
| provider | text | Nome do provider |
| status | enum | accepted, delivered, bounced, failed |
| raw | jsonb | Response do provider |

---

## Smoke Tests

Execute os testes com:

```bash
bun test src/test/phase13-notifications.test.ts
```

### Testes Implementados (12)
1. `T1` - Fallback de template para default da plataforma
2. `T2` - Idempotência do upsert de templates
3. `T3` - Dedupe com mesmo dedupe_key
4. `T4` - Múltiplas entradas com dedupe_keys diferentes
5. `T5` - Preview renderiza sem criar outbox
6. `T6` - Processamento marca como sent
7. `T7` - Retry com backoff exponencial
8. `T8` - Status dead após max_attempts
9. `T9` - Requeue de dead notifications
10. `T10` - mark_notification_delivery atualiza status
11. `T11` - Idempotência do emit_billing_notifications
12. `T12` - Correlation_id em todas as entradas

---

## Segurança

- **RLS habilitado** em todas as tabelas
- Parceiros só acessam templates próprios via `partner_users`
- Super Admin tem acesso global via role check
- Operações de processamento são service-level (sem RLS bypass)
