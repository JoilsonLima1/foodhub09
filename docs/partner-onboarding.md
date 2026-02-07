# Partner Onboarding System

Sistema de onboarding completo para parceiros white-label, garantindo que cada parceiro complete todas as configurações necessárias antes de iniciar vendas.

## Visão Geral

O onboarding guia o parceiro através de 6 etapas configuráveis:

| Etapa | Obrigatória | Descrição |
|-------|-------------|-----------|
| **Branding** | ✅ | Logo, nome comercial, cores |
| **Pagamentos** | ✅ | Conta Asaas, split, agenda de repasse |
| **Planos** | ✅ | Pelo menos 1 plano ativo |
| **Compliance** | ✅ | Dados do parceiro, LGPD |
| **Domínios** | ❌ | Domínio próprio (opcional) |
| **Notificações** | ❌ | Templates customizados (usa padrões) |

## Schema do Banco de Dados

### partner_onboarding_status

```sql
CREATE TABLE public.partner_onboarding_status (
  partner_id UUID PRIMARY KEY REFERENCES partners(id),
  step_branding_completed BOOLEAN DEFAULT FALSE,
  step_payments_completed BOOLEAN DEFAULT FALSE,
  step_notifications_completed BOOLEAN DEFAULT FALSE,
  step_plans_completed BOOLEAN DEFAULT FALSE,
  step_domains_completed BOOLEAN DEFAULT FALSE,
  step_compliance_completed BOOLEAN DEFAULT FALSE,
  step_ready_to_sell BOOLEAN GENERATED ALWAYS AS (...) STORED,
  dry_run_passed BOOLEAN DEFAULT FALSE,
  dry_run_passed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### partner_guides

Material de auto-serviço com 5 guias pré-carregados:
- Como vender o sistema
- Como cadastrar clientes
- Como funciona a cobrança
- O que fazer se o cliente não pagar
- Como receber seus repasses

## RPCs Disponíveis

### get_partner_onboarding_progress(p_partner_id)

Retorna status detalhado do onboarding com:
- Status de cada etapa
- Detalhes de configuração
- Porcentagem de conclusão
- Status de certificação

### update_partner_onboarding_step(p_partner_id, p_step, p_value)

Atualiza uma etapa específica do onboarding.

**Steps válidos:** `branding`, `payments`, `notifications`, `plans`, `domains`, `compliance`

### assert_partner_ready_for(p_partner_id, p_action)

Verifica se o parceiro pode executar uma ação específica.

**Ações suportadas:**
- `create_tenant` → Requer: payments
- `create_paid_tenant` → Requer: payments + plans
- `activate_plan` → Requer: payments
- `enable_sales` → Requer: todos obrigatórios
- `publish_site` → Requer: branding + domains

**Retorno:**
```json
{
  "allowed": true/false,
  "reason": "Mensagem explicativa",
  "missing_steps": ["payments", "plans"]
}
```

### run_partner_onboarding_dry_run(p_partner_id)

Executa teste de prontidão operacional (sem cobranças reais).

**Testes executados:**
1. Configuração de marca
2. Configuração de pagamentos
3. Planos disponíveis
4. Templates de notificação
5. Simulação de fatura
6. Cálculo de comissões

**Retorno:**
```json
{
  "success": true,
  "all_passed": true,
  "tests": [...],
  "summary": { "total_tests": 6, "passed": 6, "failed": 0 },
  "certified": true
}
```

### get_partner_guides(p_category)

Retorna guias de auto-serviço (opcional: filtrar por categoria).

## Regras de Bloqueio

O sistema impede ações críticas até que pré-requisitos sejam cumpridos:

```typescript
// Hook para validação antes de ações
const { guardCreatePaidTenant, isChecking } = useOnboardingGuard();

const handleCreateTenant = async () => {
  await guardCreatePaidTenant(async () => {
    // Código executado apenas se permitido
    await createTenant(data);
  });
};
```

## Hooks React

### usePartnerOnboarding

```typescript
const { 
  progress,           // OnboardingProgress
  isLoading,
  updateStep,         // (step, value) => void
  checkReadiness,     // (action) => Promise<ReadinessResult>
  runDryRun,          // () => void
  dryRunResult,       // DryRunResult
} = usePartnerOnboarding();
```

### useOnboardingGuard

```typescript
const { 
  guardCreateTenant,
  guardCreatePaidTenant,
  guardActivatePlan,
  guardEnableSales,
  guardPublishSite,
  isChecking,
} = useOnboardingGuard();
```

### usePartnerGuides

```typescript
const { data: guides } = usePartnerGuides('sales'); // Filtro opcional
```

## Componentes UI

### PartnerOnboardingPage

Página wizard completa em `/partner/onboarding` com:
- Progresso visual por etapa
- Detalhes de cada configuração
- Botão para teste de prontidão
- Resultado do dry-run
- Material de apoio (guides)

### PartnerCertificationBadge

Badge de certificação para uso no dashboard/sidebar:

```tsx
<PartnerCertificationBadge variant="compact" showProgress />
```

## Fluxo de Certificação

```
1. Parceiro acessa /partner/onboarding
2. Completa etapas obrigatórias
3. step_ready_to_sell = TRUE (computed)
4. Executa "Teste de Prontidão"
5. Se todos testes passam:
   - dry_run_passed = TRUE
   - Badge "Parceiro Certificado" exibido
   - Vendas, split e payouts habilitados
```

## Integração com Fluxos Existentes

O sistema é **100% ADITIVO** - não modifica tabelas, RPCs ou hooks existentes.

### CreatePartnerTenant

Integrar validação antes de criar tenants:

```typescript
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';

const { guardCreatePaidTenant } = useOnboardingGuard();

const handleSubmit = async (data) => {
  await guardCreatePaidTenant(async () => {
    await createTenant(data);
  });
};
```

### PartnerPublicationPage

Integrar validação antes de publicar:

```typescript
const { guardPublishSite } = useOnboardingGuard();

const handlePublish = async () => {
  await guardPublishSite(async () => {
    await publishPartnerSite();
  });
};
```

## Testes

```bash
npm run test src/test/partner-onboarding.test.ts
```

Cobertura:
- Schema validation
- RPC function structure
- Blocking rules logic
- Dry-run test cases
- UI component exports
- Route registration
