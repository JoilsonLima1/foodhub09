
# Plano de Verificação e Correção: Módulos, Fluxo de Compra e Categoria do Negócio

## 📋 Resumo dos Problemas Identificados

Após análise detalhada do código e banco de dados, identifiquei os seguintes problemas:

### 1. **Categoria de Negócio Não Refletindo na Organização**
- **Problema**: Quando o usuário seleciona uma categoria diferente de "restaurant" no cadastro, o sistema está salvando a categoria corretamente no banco (tabela `tenants.business_category`), MAS:
  - O nome default do tenant usa "Novo restaurante" como fallback (linha 95 do `bootstrap-user`)
  - O label no form de cadastro ainda diz "Restaurante / Organização" 
  - O placeholder diz "Nome do seu restaurante"
  - A terminologia no dashboard não muda baseado na categoria selecionada

### 2. **Módulos Adicionais Funcionando**
- ✅ Módulos estão cadastrados e ativos (9 módulos no catálogo)
- ✅ Hook `useAddonModules` funciona corretamente
- ⚠️ Nenhuma assinatura de módulo adicional ativa ainda (`tenant_addon_subscriptions` vazia)
- ✅ Super Admin pode atribuir módulos via `TenantAddonsManager`

### 3. **Fluxo de Compra (Checkout)**
- ✅ Planos cadastrados com IDs Stripe corretos
- ✅ Edge function `create-checkout` funciona
- ✅ Trial de 14 dias configurado
- ⚠️ PIX API: Gateway Asaas está ativo, mas não está integrado no fluxo de checkout (apenas Stripe está implementado)

### 4. **API do PIX na Página de Vendas**
- ❌ O checkout atual usa apenas Stripe
- O gateway PIX/Asaas está cadastrado mas não conectado ao fluxo de compra de planos

---

## 🔧 Plano de Correção

### Fase 1: Corrigir Categoria de Negócio no Cadastro

**1.1 Atualizar label e placeholder dinâmicos no Auth.tsx**
- Mudar "Restaurante / Organização" para "Nome do seu Negócio"
- Mudar placeholder de "Nome do seu restaurante" para "Nome do estabelecimento"

**1.2 Atualizar fallback no bootstrap-user**
- Trocar "Novo restaurante" por "Novo estabelecimento" como fallback genérico
- Garantir que a categoria selecionada seja passada e salva corretamente

**1.3 Verificar uso da categoria no Dashboard**
- O `BusinessCategoryContext` já carrega a terminologia correta
- O problema é que a categoria está sendo salva como "restaurant" por padrão
- Verificar se o `signupBusinessCategory` está sendo enviado corretamente

---

### Fase 2: Garantir Template por Categoria

**2.1 Verificar exibição do nome correto da categoria**
- A tabela `business_category_configs` tem as configurações de terminologia
- Cada categoria (pizzaria, sorveteria, lanchonete, etc.) tem sua própria terminologia
- O sistema já busca e aplica via `useTenantCategory`

**2.2 Recursos do Dashboard por Categoria**
- O `hasFeature` no `BusinessCategoryContext` controla quais features aparecem
- Cada categoria tem `features` definidas (tables, kitchen_display, delivery, pos, etc.)
- O sidebar já filtra baseado em `hasFeature`

---

### Fase 3: PIX na Landing Page (Opcional)

**3.1 Situação Atual**
- O checkout só suporta Stripe (cartão de crédito)
- PIX via Asaas está cadastrado mas não implementado

**3.2 Opções**
- **Opção A**: Manter apenas Stripe (recomendado para simplicidade)
- **Opção B**: Implementar checkout alternativo com PIX/Asaas (requer nova edge function)

---

## 📝 Alterações Técnicas Necessárias

### Arquivo: `src/pages/Auth.tsx`
```tsx
// Linha 260 - Mudar label
<Label htmlFor="signup-tenant">Nome do seu Negócio</Label>

// Linha 264 - Mudar placeholder  
placeholder="Nome do estabelecimento"
```

### Arquivo: `supabase/functions/bootstrap-user/index.ts`
```typescript
// Linha 95 - Mudar fallback
const baseName = (baseNameRaw || 'Novo estabelecimento').trim().slice(0, 80)

// Linha 104 - Mudar slugify fallback
return normalized || 'estabelecimento'
```

### Verificação de Fluxo

```text
Signup Flow:
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Auth.tsx       │────►│ signUp()         │────►│ bootstrap-user  │
│  Category: X    │     │ businessCategory │     │ Cria tenant     │
│  Name: "Loja Y" │     │ = X              │     │ category = X    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ Dashboard       │
                                                 │ Carrega config  │
                                                 │ da categoria X  │
                                                 │ Terminologia OK │
                                                 └─────────────────┘
```

---

## ✅ Módulos Adicionais - Verificação Completa

| Item | Status | Observação |
|------|--------|------------|
| Catálogo de módulos | ✅ OK | 9 módulos ativos |
| Hook useAddonModules | ✅ OK | CRUD funcionando |
| Super Admin Manager | ✅ OK | TenantAddonsManager.tsx |
| Atribuição manual | ✅ OK | assignModule mutation |
| Verificação hasAddon | ✅ OK | tenant_has_addon() function |
| Compra self-service | ❌ Não implementado | Apenas atribuição manual |

---

## ✅ Fluxo de Checkout - Verificação

| Item | Status | Observação |
|------|--------|------------|
| Planos cadastrados | ✅ OK | 4 planos (Free, Starter, Pro, Enterprise) |
| Stripe IDs | ✅ OK | price_1Stz... configurados |
| create-checkout | ✅ OK | Edge function funcional |
| Trial 14 dias | ✅ OK | Configurado em system_settings |
| Webhook Stripe | ⚠️ Verificar | Precisa confirmar se está recebendo eventos |
| PIX/Asaas | ❌ Não integrado | Cadastrado mas não no checkout |

---

## 🎯 Próximos Passos (Em Ordem de Prioridade)

1. **Corrigir labels genéricos no cadastro** (Auth.tsx)
2. **Atualizar fallback no bootstrap-user** (edge function)
3. **Testar fluxo completo de cadastro** com diferentes categorias
4. **Verificar se webhook Stripe está funcionando** (para ativar planos automaticamente)
5. **(Opcional) Implementar PIX no checkout** se necessário
