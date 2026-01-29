
# Plano Completo: Multi-Gateway + Checkout de Módulos + Correção de Categorias

## Visão Geral

Este plano implementa um sistema unificado de checkout multi-gateway em **4 locais** do sistema:
1. Landing Page (PricingSection) - assinatura de planos
2. Dashboard Settings (SubscriptionSettings) - upgrade de planos
3. Dashboard Settings (ModulesSettings) - compra de módulos adicionais
4. Correção do carregamento de categorias de negócio

---

## Problema 1: Checkout Hardcoded para Stripe

### Situação Atual
- 3 gateways configurados e ativos no Super Admin:
  - **Stripe Principal** (stripe, padrão)
  - **PIX Manual** (pix)
  - **foodhub09** (asaas)
- A edge function `create-checkout` usa **apenas Stripe**
- Não existe seleção de forma de pagamento na UI

### Correção
Implementar sistema multi-gateway em todas as páginas de checkout.

---

## Problema 2: Módulos sem Checkout Self-Service

### Situação Atual (ModulesSettings.tsx, linha 83-89)
```typescript
const handleRequestModule = (module: AddonModule) => {
  // Open WhatsApp or contact form to request module
  const message = encodeURIComponent(...);
  window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
};
```

O botão "Contratar Módulo" abre WhatsApp em vez de processar pagamento.

### Correção
Substituir por checkout self-service com seleção de gateway.

---

## Problema 3: Categorias Não Carregam

### Situação
O hook `useBusinessCategories` falha silenciosamente, causando:
- Dashboard com terminologia de "Restaurante" mesmo escolhendo "Sorveteria"
- Seletor de categorias vazio nas configurações

### Correção
Adicionar fallback para RPC function `get_public_business_categories()`.

---

## Arquitetura da Solução

```text
                    ┌─────────────────────────────────────────────┐
                    │              CHECKOUT UNIFICADO             │
                    └─────────────────────────────────────────────┘
                                         │
    ┌────────────────────────────────────┼────────────────────────────────────┐
    │                                    │                                    │
    ▼                                    ▼                                    ▼
┌──────────────┐               ┌──────────────────┐               ┌──────────────────┐
│  Landing     │               │  Subscription    │               │   Modules        │
│  Page        │               │  Settings        │               │   Settings       │
│  (Planos)    │               │  (Upgrade)       │               │   (Addons)       │
└──────────────┘               └──────────────────┘               └──────────────────┘
        │                               │                                   │
        └───────────────────────────────┴───────────────────────────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────┐
                         │  PaymentMethodSelector   │
                         │  (Componente Reutilizável)│
                         └──────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
              ┌───────────┐      ┌───────────┐       ┌───────────┐
              │  Stripe   │      │    PIX    │       │   Asaas   │
              │ Checkout  │      │  QR Code  │       │ Checkout  │
              └───────────┘      └───────────┘       └───────────┘
```

---

## Implementação Detalhada

### Fase 1: Criar RPC para Gateways Públicos

**Migração SQL:**
```sql
CREATE OR REPLACE FUNCTION public.get_active_payment_gateways()
RETURNS TABLE (
  id uuid,
  name text,
  provider text,
  is_default boolean,
  config jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pg.id,
    pg.name,
    pg.provider,
    pg.is_default,
    pg.config
  FROM public.payment_gateways pg
  WHERE pg.is_active = true
  ORDER BY pg.is_default DESC, pg.created_at ASC
$$;
```

### Fase 2: Criar Hook de Gateways

**Novo arquivo:** `src/hooks/useActivePaymentGateways.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicPaymentGateway {
  id: string;
  name: string;
  provider: 'stripe' | 'pix' | 'asaas';
  is_default: boolean;
  config: {
    pix_key?: string;
    qr_code_url?: string;
  };
}

export function useActivePaymentGateways() {
  return useQuery({
    queryKey: ['active-payment-gateways'],
    queryFn: async (): Promise<PublicPaymentGateway[]> => {
      const { data, error } = await supabase.rpc('get_active_payment_gateways');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
```

### Fase 3: Criar Componente de Seleção de Pagamento

**Novo arquivo:** `src/components/checkout/PaymentMethodSelector.tsx`

```typescript
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, QrCode, Wallet } from 'lucide-react';
import type { PublicPaymentGateway } from '@/hooks/useActivePaymentGateways';

interface PaymentMethodSelectorProps {
  gateways: PublicPaymentGateway[];
  selectedGateway: string | null;
  onSelect: (gatewayId: string) => void;
  isLoading?: boolean;
}

const GATEWAY_ICONS = {
  stripe: CreditCard,
  pix: QrCode,
  asaas: Wallet,
};

const GATEWAY_DESCRIPTIONS = {
  stripe: 'Cartão de crédito ou débito',
  pix: 'Pagamento instantâneo via PIX',
  asaas: 'Boleto, cartão ou PIX',
};

export function PaymentMethodSelector({ 
  gateways, 
  selectedGateway, 
  onSelect, 
  isLoading 
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Forma de Pagamento</Label>
      <RadioGroup 
        value={selectedGateway || ''} 
        onValueChange={onSelect}
        disabled={isLoading}
      >
        {gateways.map((gateway) => {
          const Icon = GATEWAY_ICONS[gateway.provider] || CreditCard;
          return (
            <div 
              key={gateway.id}
              className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <RadioGroupItem value={gateway.id} id={gateway.id} />
              <Label htmlFor={gateway.id} className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{gateway.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {GATEWAY_DESCRIPTIONS[gateway.provider]}
                  </p>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
```

### Fase 4: Criar Dialog de Checkout

**Novo arquivo:** `src/components/checkout/CheckoutDialog.tsx`

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PixPaymentDialog } from './PixPaymentDialog';
import { useActivePaymentGateways } from '@/hooks/useActivePaymentGateways';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'plan' | 'module';
  itemId: string;
  itemName: string;
  itemPrice: number;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  itemPrice,
}: CheckoutDialogProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const { data: gateways, isLoading: loadingGateways } = useActivePaymentGateways();
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<{ pixKey: string; qrCode: string; amount: number } | null>(null);

  const selectedGateway = gateways?.find(g => g.id === selectedGatewayId);

  const handleConfirmPayment = async () => {
    if (!selectedGateway || !session?.access_token) return;

    setIsProcessing(true);
    try {
      const functionName = itemType === 'plan' ? 'create-checkout' : 'create-module-checkout';
      const body = itemType === 'plan' 
        ? { planId: itemId, gateway: selectedGateway.provider }
        : { moduleId: itemId, gateway: selectedGateway.provider };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      // Processar resposta baseado no gateway
      switch (selectedGateway.provider) {
        case 'stripe':
        case 'asaas':
          if (data?.url) {
            window.open(data.url, '_blank');
            onOpenChange(false);
          }
          break;
        case 'pix':
          setPixData({
            pixKey: data.pix_key,
            qrCode: data.qr_code,
            amount: data.amount,
          });
          break;
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Se PIX foi selecionado e temos dados, mostrar dialog de PIX
  if (pixData) {
    return (
      <PixPaymentDialog
        open={true}
        onOpenChange={() => {
          setPixData(null);
          onOpenChange(false);
        }}
        pixKey={pixData.pixKey}
        qrCodeUrl={pixData.qrCode}
        amount={pixData.amount}
        itemName={itemName}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Compra</DialogTitle>
          <DialogDescription>
            {itemName} - R$ {itemPrice.toFixed(2)}
            {itemType === 'plan' && '/mês'}
          </DialogDescription>
        </DialogHeader>

        {loadingGateways ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : gateways && gateways.length > 0 ? (
          <PaymentMethodSelector
            gateways={gateways}
            selectedGateway={selectedGatewayId}
            onSelect={setSelectedGatewayId}
            isLoading={isProcessing}
          />
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Nenhuma forma de pagamento disponível.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmPayment}
            disabled={!selectedGatewayId || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Continuar para Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Fase 5: Criar Dialog de PIX

**Novo arquivo:** `src/components/checkout/PixPaymentDialog.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PixPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pixKey: string;
  qrCodeUrl?: string;
  amount: number;
  itemName: string;
}

export function PixPaymentDialog({
  open,
  onOpenChange,
  pixKey,
  qrCodeUrl,
  amount,
  itemName,
}: PixPaymentDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyPixKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast({ title: 'Chave PIX copiada!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento via PIX</DialogTitle>
          <DialogDescription>
            {itemName} - R$ {amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code */}
          {qrCodeUrl && (
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg">
                <img src={qrCodeUrl} alt="QR Code PIX" className="w-48 h-48" />
              </div>
            </div>
          )}

          {/* Chave PIX */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Chave PIX:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-md text-sm break-all">
                {pixKey}
              </code>
              <Button size="icon" variant="outline" onClick={handleCopyPixKey}>
                {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Instruções */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Instruções:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abra o app do seu banco</li>
              <li>Escaneie o QR Code ou copie a chave PIX</li>
              <li>Confirme o valor de R$ {amount.toFixed(2)}</li>
              <li>Após o pagamento, sua ativação será processada em até 24h</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Fase 6: Modificar Edge Function create-checkout

**Arquivo:** `supabase/functions/create-checkout/index.ts`

Adicionar suporte a múltiplos gateways:

```typescript
// Receber gateway selecionado
const { planId, gateway = 'stripe' } = await req.json();

// Buscar configuração do gateway
const { data: gatewayConfig } = await supabase
  .from('payment_gateways')
  .select('*')
  .eq('provider', gateway)
  .eq('is_active', true)
  .maybeSingle();

if (!gatewayConfig && gateway !== 'stripe') {
  throw new Error('Gateway não disponível');
}

// Processar de acordo com o gateway
switch (gateway) {
  case 'stripe':
    return await processStripeCheckout(plan, user, origin);
  case 'pix':
    return await processPixCheckout(plan, user, gatewayConfig);
  case 'asaas':
    return await processAsaasCheckout(plan, user, gatewayConfig);
  default:
    throw new Error('Gateway não suportado');
}
```

### Fase 7: Criar Edge Function create-module-checkout

**Novo arquivo:** `supabase/functions/create-module-checkout/index.ts`

Similar ao `create-checkout`, mas para módulos:
- Recebe `moduleId` e `gateway`
- Busca detalhes do módulo em `addon_modules`
- Processa pagamento via gateway selecionado
- Ao confirmar, cria registro em `tenant_addon_subscriptions` com `source: 'purchase'`

### Fase 8: Atualizar ModulesSettings.tsx

Substituir WhatsApp por checkout real:

```typescript
const [checkoutOpen, setCheckoutOpen] = useState(false);
const [selectedModule, setSelectedModule] = useState<AddonModule | null>(null);

const handleRequestModule = (module: AddonModule) => {
  setSelectedModule(module);
  setCheckoutOpen(true);
};

// No retorno do componente, adicionar:
{selectedModule && (
  <CheckoutDialog
    open={checkoutOpen}
    onOpenChange={setCheckoutOpen}
    itemType="module"
    itemId={selectedModule.id}
    itemName={selectedModule.name}
    itemPrice={selectedModule.monthly_price}
  />
)}
```

### Fase 9: Atualizar PricingSection e SubscriptionSettings

Integrar o `CheckoutDialog` nos dois componentes para seleção de gateway antes do checkout.

### Fase 10: Corrigir Carregamento de Categorias

**Arquivo:** `src/hooks/useBusinessCategory.ts`

Adicionar fallback para RPC:

```typescript
export function useBusinessCategories() {
  return useQuery({
    queryKey: ['business-categories'],
    queryFn: async (): Promise<BusinessCategoryConfig[]> => {
      // Tentar query direta primeiro
      const { data: directData, error: directError } = await supabase
        .from('business_category_configs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (!directError && directData && directData.length > 0) {
        return mapToCategoryConfig(directData);
      }

      // Fallback: usar RPC pública
      console.warn('[useBusinessCategories] Using RPC fallback');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_public_business_categories');
      
      if (rpcError) throw rpcError;
      
      // Buscar configs completas pelos IDs
      const categoryIds = rpcData?.map((c: any) => c.id) || [];
      if (categoryIds.length === 0) return [];
      
      const { data: fullConfigs } = await supabase
        .from('business_category_configs')
        .select('*')
        .in('id', categoryIds);
      
      return mapToCategoryConfig(fullConfigs || []);
    },
    retry: 2,
    staleTime: 1000 * 60 * 10,
  });
}
```

---

## Resumo de Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| **Migração SQL** | Criar | RPC `get_active_payment_gateways` |
| `src/hooks/useActivePaymentGateways.ts` | Criar | Hook para buscar gateways ativos |
| `src/components/checkout/PaymentMethodSelector.tsx` | Criar | Componente de seleção de pagamento |
| `src/components/checkout/CheckoutDialog.tsx` | Criar | Dialog unificado de checkout |
| `src/components/checkout/PixPaymentDialog.tsx` | Criar | Dialog para pagamento PIX |
| `supabase/functions/create-checkout/index.ts` | Modificar | Suporte multi-gateway |
| `supabase/functions/create-module-checkout/index.ts` | Criar | Checkout de módulos |
| `src/components/settings/ModulesSettings.tsx` | Modificar | Integrar checkout self-service |
| `src/components/landing/PricingSection.tsx` | Modificar | Integrar seleção de gateway |
| `src/components/settings/SubscriptionSettings.tsx` | Modificar | Integrar seleção de gateway |
| `src/hooks/useBusinessCategory.ts` | Modificar | Adicionar fallback RPC |

---

## Fluxo de Compra de Módulo (Corrigido)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard > Configurações > Módulos          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Módulo: Integração iFood                                       │
│  R$ 49,90/mês                                                   │
│                                                                 │
│  [   Contratar Módulo   ]  ◄── Clique abre CheckoutDialog       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Finalizar Compra                                               │
│  Integração iFood - R$ 49,90/mês                                │
│                                                                 │
│  Forma de Pagamento:                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Stripe Principal                                       │   │
│  │   Cartão de crédito ou débito                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ PIX Manual                                             │   │
│  │   Pagamento instantâneo via PIX                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ foodhub09                                              │   │
│  │   Boleto, cartão ou PIX                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancelar]                    [Continuar para Pagamento]       │
└─────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        ┌───────────┐    ┌───────────┐    ┌───────────┐
        │  Stripe   │    │    PIX    │    │   Asaas   │
        │ Checkout  │    │  QR Code  │    │ Checkout  │
        │ (Externa) │    │  Dialog   │    │ (Externa) │
        └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │  Webhook / Verificação │
                  │  Confirma Pagamento    │
                  └────────────┬───────────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │  Cria registro em      │
                  │  tenant_addon_subs     │
                  │  source: 'purchase'    │
                  └────────────┬───────────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │  Módulo ativo!         │
                  │  Badge "Instalado"     │
                  └────────────────────────┘
```

---

## Considerações de Segurança

1. **API Keys**: As chaves reais do Asaas ficam nos secrets do Supabase, não expostas ao cliente
2. **Validação**: Verificar sempre se o gateway está ativo antes de processar
3. **PIX Manual**: Requer verificação manual do pagamento pelo Super Admin
4. **Webhooks**: Para Stripe e Asaas, implementar webhooks para confirmação automática

---

## Prioridade de Implementação

1. **Fase 1-2**: RPC + Hook de gateways (base para tudo)
2. **Fase 3-5**: Componentes de UI (PaymentMethodSelector, CheckoutDialog, PixPaymentDialog)
3. **Fase 6**: Modificar create-checkout (multi-gateway)
4. **Fase 7-8**: Criar create-module-checkout + Atualizar ModulesSettings
5. **Fase 9**: Atualizar PricingSection e SubscriptionSettings
6. **Fase 10**: Corrigir categorias
