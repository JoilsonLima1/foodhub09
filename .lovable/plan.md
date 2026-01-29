
# Plano de Correção: Tela Preta Após Cadastro no Edge

## Problema Identificado

A tela preta após o cadastro é causada por uma **race condition** (condição de corrida) no processo de bootstrap do usuário, que resulta em:

1. **Bootstrap chamado duas vezes simultaneamente** - criando 2 tenants para o mesmo usuário
2. **Erro de constraint de chave única** - tentativa de inserir perfil duplicado
3. **Estado inconsistente** - o AuthContext fica em loop tentando carregar dados corrompidos

Os logs confirmam:
```text
Created tenant: 07a1bc0a-dff3-4baf-8db7-ff21ab1eefe3
Created tenant: c8e09c45-a063-4d6d-8c3b-aab5003a7532  (DUPLICADO!)
Error: duplicate key value violates unique constraint "profiles_user_id_key"
```

## Causa Raiz

O `AuthContext.tsx` tem uma lógica onde:
1. O `signUp()` chama `bootstrap-user` diretamente
2. O `onAuthStateChange` também dispara `fetchUserData()` 
3. `fetchUserData()` chama `bootstrapUserIfNeeded()`
4. Ambos executam simultaneamente criando duplicatas

## Solução Proposta

### Fase 1: Corrigir Race Condition no AuthContext

Modificar o `AuthContext.tsx` para usar um **flag de mutex** que previne múltiplas chamadas simultâneas ao bootstrap:

```typescript
// Adicionar ref para tracking de bootstrap em andamento
const bootstrapInProgressRef = useRef<Set<string>>(new Set());

const bootstrapUserIfNeeded = async (userId: string, sessionToken: string, userMetadata?: any): Promise<boolean> => {
  // Prevenir chamadas duplicadas
  if (bootstrapInProgressRef.current.has(userId)) {
    console.log('[AuthContext] Bootstrap já em andamento para:', userId);
    return false;
  }
  
  bootstrapInProgressRef.current.add(userId);
  
  try {
    // ... código existente do bootstrap ...
    return true;
  } finally {
    bootstrapInProgressRef.current.delete(userId);
  }
};
```

### Fase 2: Adicionar Verificação de Lock no Edge Function

Modificar `bootstrap-user/index.ts` para usar uma verificação atômica:

```typescript
// Verificar SE JÁ EXISTE tenant ANTES de criar
const { data: existingProfile } = await supabaseAdmin
  .from('profiles')
  .select('id, tenant_id')
  .eq('user_id', userId)
  .maybeSingle()

// Se já tem tenant, retornar imediatamente
if (existingProfile?.tenant_id) {
  return new Response(JSON.stringify({ 
    success: true, 
    message: 'User already bootstrapped',
    tenant_id: existingProfile.tenant_id
  }), ...)
}

// Usar SELECT FOR UPDATE para lock row-level (se disponível)
// Ou usar advisory lock do PostgreSQL
```

### Fase 3: Remover Bootstrap Duplicado do SignUp

No `signUp()`, após criar o usuário, NÃO chamar bootstrap diretamente. Deixar apenas o `onAuthStateChange` fazer isso:

**Antes:**
```typescript
const signUp = async (...) => {
  const { data, error } = await supabase.auth.signUp({...});
  if (!error && data.user) {
    // PROBLEMA: Bootstrap chamado aqui
    await supabase.functions.invoke('bootstrap-user', {...});
  }
}
```

**Depois:**
```typescript
const signUp = async (...) => {
  const { data, error } = await supabase.auth.signUp({...});
  // REMOVIDO: Não chamar bootstrap aqui
  // O onAuthStateChange vai tratar isso automaticamente
  return { error };
}
```

### Fase 4: Limpar Dados Duplicados do Usuário Afetado

Executar SQL para remover o tenant órfão:

```sql
-- Remover tenant duplicado que não está vinculado ao perfil
DELETE FROM tenants 
WHERE id = 'c8e09c45-a063-4d6d-8c3b-aab5003a7532'
AND id NOT IN (SELECT tenant_id FROM profiles WHERE tenant_id IS NOT NULL);
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/contexts/AuthContext.tsx` | Adicionar mutex para prevenir chamadas duplicadas ao bootstrap |
| `supabase/functions/bootstrap-user/index.ts` | Adicionar verificação atômica no início |

## Detalhes Técnicos

### Fluxo Corrigido

```text
SignUp Flow (CORRIGIDO):
┌─────────────────┐     ┌──────────────────┐
│  Auth.tsx       │────►│ signUp()         │
│  Click Cadastrar│     │ Criar usuário    │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ onAuthStateChange│
                        │ SIGNED_IN event  │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ fetchUserData()  │
                        │ COM MUTEX LOCK   │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ bootstrapUser()  │
                        │ (1x apenas)      │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Dashboard OK     │
                        └──────────────────┘
```

### Compatibilidade com Edge Browser

O problema **NÃO é específico do Edge**. Aconteceria em qualquer navegador. O Edge pode simplesmente ter timing diferente que evidenciou a race condition.

## Impacto

- **Novos cadastros**: Funcionarão corretamente sem duplicação
- **Usuário afetado**: Precisa de limpeza manual dos dados duplicados
- **Usuários existentes**: Nenhum impacto

## Prioridade: ALTA

Esta correção é crítica para o funcionamento do fluxo de cadastro.
