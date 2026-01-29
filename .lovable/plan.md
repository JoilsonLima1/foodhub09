

# Plano de Correção: Tela Preta no Dashboard (Site Publicado - Edge Browser)

## Problema Identificado

A tela preta após cadastro no site publicado ocorre devido a uma **falha de timing na verificação de sessão**:

1. O usuário completa o cadastro e é redirecionado ao `/dashboard`
2. O `AuthContext` ainda está estabelecendo a sessão via `onAuthStateChange`
3. Simultaneamente, o `AppLayout` é renderizado e chama `useFeatureAccess` → `useTrialStatus`
4. O `useTrialStatus` tenta chamar a Edge Function `check-subscription`
5. Se a sessão não estiver totalmente pronta, a função retorna erro 500: `"Auth session missing!"`
6. Isso causa um estado inconsistente onde:
   - O `user` existe no `AuthContext` (autenticado)
   - Mas o `subscriptionStatus` falha ao carregar
   - O layout pode ficar em um estado de loading infinito ou vazio

Os logs confirmam este padrão:
```text
04:12:12Z INFO [CHECK-SUBSCRIPTION] ERROR - {"message":"Authentication error: Auth session missing!"}
```

## Causa Raiz Técnica

### Problema 1: Race Condition Sessão vs. Verificação de Assinatura
O `useTrialStatus` é habilitado quando `!!user && !!session` (linha 68 de `useTrialStatus.ts`), mas o token de acesso pode não estar totalmente válido no servidor Supabase imediatamente após o signup.

### Problema 2: Tratamento de Erro Insuficiente
Quando `check-subscription` retorna erro 500, o `subscriptionStatus` fica como `undefined`. O `useFeatureAccess` trata `null` retornando `hasAccess: true`, mas o `isLoading` pode permanecer `true` em certas condições de edge case.

### Problema 3: AppLayout Bloqueia Renderização
O `AppLayout` mostra um loader enquanto `isLoading` é `true`, mas se o estado ficar preso, a tela fica vazia.

---

## Solução Proposta

### Fase 1: Adicionar Retry com Delay na Verificação de Assinatura

Modificar o `useTrialStatus.ts` para:
1. Adicionar lógica de retry quando a sessão está instável
2. Implementar delay inicial após login/signup
3. Garantir que falhas não deixem o estado em loading infinito

```typescript
// Adicionar ao useTrialStatus.ts
const { data: subscriptionStatus, isLoading, error } = useQuery({
  queryKey: ['subscription-status', user?.id],
  queryFn: async (): Promise<SubscriptionStatus> => {
    // ... código existente ...
  },
  enabled: !!user && !!session,
  retry: 2, // Retry 2 vezes em caso de falha
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: true,
});
```

### Fase 2: Melhorar Tratamento de Erro no useFeatureAccess

Modificar o `useFeatureAccess.ts` para:
1. Tratar explicitamente estados de erro
2. Garantir que erros de rede não bloqueiem o usuário
3. Fornecer acesso padrão (trial) quando há falha temporária

```typescript
// Em useFeatureAccess.ts - adicionar tratamento de erro
const { subscriptionStatus, getDaysRemaining, isLoading, error } = useTrialStatus();

// Se houve erro na verificação, conceder acesso temporário (trial)
if (error && !isLoading) {
  console.warn('[useFeatureAccess] Error checking subscription, granting temporary access');
  return {
    hasAccess: true,
    isTrialActive: true,
    isTrialExpired: false,
    daysRemaining: trialDays,
    trialDays,
    reason: 'trial_active',
    isLoading: false,
  };
}
```

### Fase 3: Adicionar Timeout no AppLayout

Modificar o `AppLayout.tsx` para:
1. Adicionar timeout máximo de loading (5 segundos)
2. Se exceder, renderizar o conteúdo mesmo assim
3. Evitar tela preta permanente

```typescript
// Em AppLayout.tsx
const [loadingTimeout, setLoadingTimeout] = useState(false);

useEffect(() => {
  if (isLoading) {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000); // 5 segundos máximo
    return () => clearTimeout(timer);
  }
}, [isLoading]);

// Renderizar conteúdo se timeout expirou
if (isLoading && !loadingTimeout) {
  // ... mostrar loader ...
}
// Se timeout expirou, continuar renderizando normalmente
```

### Fase 4: Melhorar Resiliência da Edge Function check-subscription

Modificar a Edge Function para:
1. Retornar status de trial ativo como fallback quando há erro de autenticação temporário
2. Adicionar log mais detalhado para debugging
3. Não retornar 500 para erros de sessão (retornar trial como padrão)

```typescript
// Em check-subscription/index.ts
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logStep("ERROR in check-subscription", { message: errorMessage });
  
  // Para erros de autenticação temporários, retornar trial ativo
  // Isso evita bloquear o usuário por problemas de timing
  if (errorMessage.includes('session') || errorMessage.includes('auth')) {
    return new Response(JSON.stringify({
      subscribed: true,
      is_trialing: true,
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_end: null,
      product_id: null,
      status: 'trialing'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Retornar 200 com trial padrão, não 500
    });
  }
  
  return new Response(JSON.stringify({ error: "..." }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 500,
  });
}
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/useTrialStatus.ts` | Adicionar retry + retryDelay, expor `error` |
| `src/hooks/useFeatureAccess.ts` | Tratar `error` retornando acesso temporário |
| `src/components/layout/AppLayout.tsx` | Adicionar timeout de loading (5s) |
| `supabase/functions/check-subscription/index.ts` | Retornar trial padrão em erros de auth |

---

## Fluxo Corrigido

```text
Cadastro → Dashboard (CORRIGIDO)

┌─────────────────┐     ┌──────────────────┐
│  Auth.tsx       │────►│ signUp()         │
│  Cadastrar      │     │ Criar usuário    │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Redireciona para │
                        │ /dashboard       │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ AppLayout        │
                        │ isLoading = true │
                        │ Mostra loader    │
                        └────────┬─────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
    ┌────────────┐      ┌────────────────┐     ┌────────────────┐
    │ Sessão OK  │      │ Sessão ainda   │     │ Timeout 5s     │
    │ check-sub  │      │ não pronta     │     │ expirou        │
    │ = 200      │      │ check-sub=500  │     │                │
    └─────┬──────┘      └───────┬────────┘     └───────┬────────┘
          │                     │                      │
          ▼                     ▼                      ▼
    ┌────────────┐      ┌────────────────┐     ┌────────────────┐
    │ Dashboard  │      │ Retry após 1s  │     │ Renderiza com  │
    │ renderiza  │      │ Retry após 2s  │     │ trial padrão   │
    │ OK         │      │ ou fallback    │     │                │
    └────────────┘      └────────────────┘     └────────────────┘
```

---

## Resumo das Mudanças

1. **Retry automático**: 2 tentativas com delay exponencial
2. **Tratamento de erro**: Erros de auth retornam trial ativo
3. **Timeout de loading**: Máximo 5 segundos de espera
4. **Edge function resiliente**: Não retorna 500 para erros de sessão

Essas mudanças garantem que o usuário nunca fique preso em uma tela preta, mesmo quando há instabilidades de timing na sessão de autenticação.

