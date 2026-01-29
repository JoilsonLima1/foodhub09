

# Plano: Corrigir Erro de Valor Mínimo no Checkout Asaas

## Diagnóstico do Problema

O erro atual é:
```
O valor da cobrança (R$ 2,97) menos o valor do desconto (R$ 0,00) não pode ser menor que R$ 5,00.
```

### Causa Raiz
Os preços dos planos foram alterados às 15:15 UTC (12:15 BRT) para valores abaixo do mínimo permitido pelo Asaas:
- Starter: R$ 2,97 (alterado às 15:15:55)
- Professional: R$ 2,98 (alterado às 15:15:36)
- Enterprise: R$ 2,99 (alterado às 15:15:46)

O Asaas exige um valor **mínimo de R$ 5,00** para qualquer cobrança (PIX, Cartão ou Boleto).

### Por que funcionou às 9:35?
O pagamento de R$ 29,99 (Joilson Correa Lima) foi processado com sucesso porque o valor estava acima do mínimo de R$ 5,00.

---

## Solução

Há duas opções:

### Opção 1: Corrigir os preços dos planos (Recomendado)
Restaurar os preços dos planos para valores acima de R$ 5,00 diretamente no banco de dados ou pelo painel Super Admin.

**Exemplo de valores válidos:**
| Plano | Preço Mínimo Válido |
|-------|---------------------|
| Starter | R$ 9,97 ou R$ 29,97 |
| Professional | R$ 49,97 |
| Enterprise | R$ 99,97 |

### Opção 2: Adicionar validação no código
Impedir que o checkout seja iniciado se o valor estiver abaixo de R$ 5,00 quando o gateway for Asaas, mostrando mensagem clara ao usuário.

---

## Implementação (Opção 2 - Proteção no Código)

Para evitar que isso aconteça novamente, vou adicionar validações:

### 1. Validação no Frontend (`CheckoutDialog.tsx`)
Verificar se o valor é menor que R$ 5,00 quando Asaas estiver selecionado e exibir aviso:

```typescript
// Antes de chamar a API:
if (selectedGateway.provider === 'asaas' && itemPrice < 5) {
  toast({
    title: 'Valor mínimo não atingido',
    description: 'O Asaas exige um valor mínimo de R$ 5,00 para cobranças. Use o Stripe ou ajuste o valor do plano.',
    variant: 'destructive',
  });
  return;
}
```

### 2. Validação no Backend (`create-checkout/index.ts`)
Adicionar verificação antes de criar a cobrança:

```typescript
if (plan.monthly_price < 5) {
  logStep("Plan price below Asaas minimum", { price: plan.monthly_price });
  throw new Error("Valor mínimo para Asaas é R$ 5,00");
}
```

### 3. Validação no Super Admin (`subscription_plans`)
Ao salvar planos no painel, alertar se o valor for menor que R$ 5,00 quando Asaas estiver ativo.

---

## Ação Imediata Requerida

Para resolver **agora**, você precisa corrigir os preços dos planos no banco de dados.

No painel Super Admin (Planos de Assinatura), altere:
- Starter: de R$ 2,97 para **R$ 29,97** (ou outro valor >= R$ 5,00)
- Professional: de R$ 2,98 para **R$ 49,97**
- Enterprise: de R$ 2,99 para **R$ 99,97**

---

## Resumo das Alterações de Código

| Arquivo | Alteração |
|---------|-----------|
| `CheckoutDialog.tsx` | Adicionar validação de valor mínimo R$ 5,00 para Asaas |
| `create-checkout/index.ts` | Adicionar validação de valor mínimo no backend |
| `create-module-checkout/index.ts` | Mesma validação para módulos |
| Super Admin (planos) | Adicionar alerta visual se valor < R$ 5,00 |

---

## Detalhes Técnicos

### Constante para Valor Mínimo
Definir constante para facilitar manutenção:
```typescript
const ASAAS_MIN_VALUE = 5.00; // Valor mínimo do Asaas em reais
```

### Mensagem de Erro Amigável
```
"O valor mínimo para pagamentos via Asaas é R$ 5,00. 
Por favor, use outro método de pagamento ou entre em contato com o suporte."
```

