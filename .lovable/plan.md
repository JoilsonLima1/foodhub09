
# Plano: Sincronização Automática do Status de Pagamento

## Diagnóstico Confirmado

O banco de dados está **100% correto**:
- Tenant `96aa1efa-6afb-46c9-912f-9e7321408931` (jcorrealima@hotmail.com)
- `subscription_plan_id`: Starter (1817f32b...)
- `subscription_status`: active
- `last_payment_at`: 29/01/2026 12:29
- `last_payment_method`: pix
- `last_payment_provider`: asaas
- `last_payment_status`: confirmed

**O problema é que a UI não recarrega os dados após o pagamento.**

---

## Causa Raiz

1. **Cache de 5 minutos** no React Query (`staleTime: 5 min`)
2. **Usuário paga no Asaas** em nova aba
3. **Volta ao app** mas dados estão em cache antigo
4. **Webhook configurado** mas precisa de tempo para processar
5. **UI mostra dados desatualizados**

---

## Solução em 4 Partes

### Parte 1: Marcar Checkout Pendente (CheckoutDialog)

Antes de abrir a URL do Asaas, salvar no localStorage para detectar retorno:

```typescript
// src/components/checkout/CheckoutDialog.tsx
// Antes de window.open(data.url)
localStorage.setItem('checkout_pending', JSON.stringify({
  planId: itemId,
  planName: itemName,
  gateway: selectedGateway.provider,
  timestamp: Date.now()
}));
```

---

### Parte 2: Detectar Retorno e Forçar Refresh (SubscriptionSettings)

Ao carregar a página, verificar se há checkout pendente e mostrar feedback:

```typescript
// src/components/settings/SubscriptionSettings.tsx
const [checkoutPending, setCheckoutPending] = useState<any>(null);
const [isPolling, setIsPolling] = useState(false);

useEffect(() => {
  const pending = localStorage.getItem('checkout_pending');
  if (pending) {
    const data = JSON.parse(pending);
    // Só considera se foi nos últimos 10 minutos
    if (Date.now() - data.timestamp < 10 * 60 * 1000) {
      setCheckoutPending(data);
      setIsPolling(true);
      // Forçar refetch imediato
      refetchSubscription();
    } else {
      localStorage.removeItem('checkout_pending');
    }
  }
}, []);

// Polling enquanto aguarda confirmação
useEffect(() => {
  if (!isPolling) return;
  
  const interval = setInterval(() => {
    refetchSubscription();
    // Se já tem plano ativo, parar polling
    if (subscriptionStatus?.hasContractedPlan) {
      setIsPolling(false);
      localStorage.removeItem('checkout_pending');
      toast({ title: 'Pagamento confirmado!', description: 'Seu plano foi ativado.' });
    }
  }, 5000); // A cada 5 segundos
  
  // Timeout após 3 minutos
  const timeout = setTimeout(() => setIsPolling(false), 180000);
  
  return () => { clearInterval(interval); clearTimeout(timeout); };
}, [isPolling, subscriptionStatus]);
```

---

### Parte 3: Reduzir Cache e Expor forceRefresh (useTrialStatus)

```typescript
// src/hooks/useTrialStatus.ts

// Reduzir staleTime de 5 minutos para 30 segundos
staleTime: 1000 * 30,

// Adicionar função para forçar refresh
const forceRefresh = useCallback(async () => {
  queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
  await refetchSubscription();
}, [queryClient, refetchSubscription]);

return {
  ...existing,
  forceRefresh,
};
```

---

### Parte 4: UI de Feedback Durante Processamento

Adicionar card de "Aguardando Confirmação" visível enquanto polling:

```tsx
{/* Checkout Pending Banner */}
{checkoutPending && isPolling && (
  <Card className="border-yellow-500/30 bg-yellow-500/5">
    <CardContent className="flex items-center gap-4 py-4">
      <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
      <div className="flex-1">
        <p className="font-medium text-yellow-700">
          Aguardando confirmação do pagamento
        </p>
        <p className="text-sm text-muted-foreground">
          Você contratou o plano {checkoutPending.planName}. 
          A ativação será automática assim que o pagamento for processado.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => refetchSubscription()}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Verificar
      </Button>
    </CardContent>
  </Card>
)}
```

---

### Parte 5: Botão "Atualizar Status" Manual

Adicionar botão visível para o usuário forçar atualização:

```tsx
{/* Refresh Button - Always visible */}
<div className="flex justify-end">
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={() => {
      refetchSubscription();
      toast({ title: 'Atualizando...', description: 'Verificando status da assinatura.' });
    }}
    disabled={isLoading}
  >
    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
    Atualizar Status
  </Button>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useTrialStatus.ts` | Reduzir staleTime para 30s, expor forceRefresh |
| `src/components/settings/SubscriptionSettings.tsx` | Detectar checkout pendente, polling, UI feedback, botão refresh |
| `src/components/checkout/CheckoutDialog.tsx` | Salvar checkout_pending no localStorage |

---

## Fluxo Após Implementação

```text
1. Usuário clica "Contratar Plano"
2. CheckoutDialog abre → Usuário confirma
3. localStorage.setItem('checkout_pending', {...})
4. window.open(asaas_url) → Usuário paga
5. Usuário volta ao /settings
6. useEffect detecta checkout_pending
7. Mostra banner "Aguardando confirmação"
8. Inicia polling a cada 5s
9. Webhook processa → Tenant atualizado
10. Próximo polling detecta plano ativo
11. Mostra toast "Pagamento confirmado!"
12. UI atualiza com plano contratado em destaque verde
```

---

## Resultado Esperado

Após implementação:

- Plano contratado: **Starter** (destaque verde)
- Botão do Starter: **✓ Plano Atual** (desabilitado)
- Informações de Pagamento:
  - Data/hora: 29/01/2026 às 12:29
  - Forma: PIX
  - Gateway: Asaas
  - Status: Confirmado
- Atualização automática após pagamento
- Botão "Atualizar Status" sempre visível
