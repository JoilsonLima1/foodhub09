import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type POSBillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

export interface POSPaymentIntent {
  gatewayPaymentId: string;
  status: string;
  billingType: POSBillingType;
  pixQrCode: string | null;
  pixQrCodeImage: string | null;
  pixExpiration: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
}

export interface POSGatewayError {
  errorCode: string;
  message: string;
  fallbackAllowed: boolean;
  shouldSwitchToManual: boolean;
  suggestedManualMethod: string;
}

interface CreatePaymentInput {
  orderId: string;
  amount: number;
  billingType: POSBillingType;
  customerName?: string;
  customerCpfCnpj?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
}

async function parseEdgeFunctionError(res: { error: any; data: any }): Promise<POSGatewayError | null> {
  // supabase.functions.invoke wraps non-2xx as res.error
  if (!res.error) return null;

  // Try to extract structured error from data (supabase may put parsed JSON there)
  const body = res.data || {};
  return {
    errorCode: body.error_code || 'UNKNOWN_ERROR',
    message: body.message || body.error || res.error?.message || 'Erro ao processar pagamento',
    fallbackAllowed: body.fallback_allowed ?? true,
    shouldSwitchToManual: body.should_switch_to_manual ?? true,
    suggestedManualMethod: body.suggested_manual_method || 'cash',
  };
}

export function usePOSPayment() {
  const { tenantId } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<POSPaymentIntent | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [lastGatewayError, setLastGatewayError] = useState<POSGatewayError | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
    pollingCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const checkStatus = useCallback(async (gatewayPaymentId: string) => {
    if (!tenantId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke('pos-payment', {
        body: {
          action: 'status',
          tenant_id: tenantId,
          gateway_payment_id: gatewayPaymentId,
        },
      });

      if (res.error) {
        console.error('[usePOSPayment] Status check non-2xx, ignoring for polling');
        return;
      }

      const data = res.data;

      if (data.is_confirmed) {
        setPaymentConfirmed(true);
        stopPolling();
        toast({
          title: '✅ Pagamento confirmado!',
          description: 'O pagamento foi recebido com sucesso.',
        });
      }

      return data;
    } catch (e) {
      console.error('[usePOSPayment] Status check error:', e);
    }
  }, [tenantId, stopPolling]);

  const startPolling = useCallback((gatewayPaymentId: string) => {
    stopPolling();
    setIsPolling(true);
    pollingCountRef.current = 0;

    pollingRef.current = setInterval(async () => {
      pollingCountRef.current++;
      if (pollingCountRef.current > 60) {
        stopPolling();
        toast({
          title: 'Tempo esgotado',
          description: 'O tempo de espera pelo pagamento expirou. O pedido permanece pendente.',
          variant: 'destructive',
        });
        return;
      }

      await checkStatus(gatewayPaymentId);
    }, 5000);
  }, [checkStatus, stopPolling]);

  const createPayment = useCallback(async (input: CreatePaymentInput): Promise<POSPaymentIntent | null> => {
    if (!tenantId) {
      toast({ title: 'Erro', description: 'Tenant não configurado', variant: 'destructive' });
      return null;
    }

    setIsCreating(true);
    setPaymentConfirmed(false);
    setPaymentIntent(null);
    setLastGatewayError(null);

    try {
      const res = await supabase.functions.invoke('pos-payment', {
        body: {
          action: 'create',
          tenant_id: tenantId,
          order_id: input.orderId,
          amount: input.amount,
          billing_type: input.billingType,
          customer_name: input.customerName,
          customer_cpf_cnpj: input.customerCpfCnpj,
          customer_email: input.customerEmail,
          customer_phone: input.customerPhone,
          description: input.description,
          idempotency_key: `pos-${input.orderId}`,
        },
      });

      // Check for structured error
      const gatewayError = await parseEdgeFunctionError(res);
      if (gatewayError) {
        setLastGatewayError(gatewayError);
        // Don't toast here — let the UI handle the fallback UX
        return null;
      }

      const data = res.data;

      if (!data.success && data.error) {
        const fallbackErr: POSGatewayError = {
          errorCode: data.error_code || 'UNKNOWN_ERROR',
          message: data.error,
          fallbackAllowed: true,
          shouldSwitchToManual: true,
          suggestedManualMethod: 'cash',
        };
        setLastGatewayError(fallbackErr);
        return null;
      }

      const intent: POSPaymentIntent = {
        gatewayPaymentId: data.gateway_payment_id,
        status: data.status,
        billingType: input.billingType,
        pixQrCode: data.pix_qr_code,
        pixQrCodeImage: data.pix_qr_code_image,
        pixExpiration: data.pix_expiration,
        invoiceUrl: data.invoice_url,
        bankSlipUrl: data.bank_slip_url,
      };

      setPaymentIntent(intent);
      startPolling(intent.gatewayPaymentId);

      return intent;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar pagamento';
      setLastGatewayError({
        errorCode: 'NETWORK_ERROR',
        message: msg,
        fallbackAllowed: true,
        shouldSwitchToManual: true,
        suggestedManualMethod: 'cash',
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [tenantId, startPolling]);

  const cancelPayment = useCallback(async () => {
    if (!tenantId || !paymentIntent) return;

    stopPolling();

    try {
      await supabase.functions.invoke('pos-payment', {
        body: {
          action: 'cancel',
          tenant_id: tenantId,
          gateway_payment_id: paymentIntent.gatewayPaymentId,
        },
      });

      setPaymentIntent(null);
      setPaymentConfirmed(false);
    } catch (e) {
      console.error('[usePOSPayment] Cancel error:', e);
    }
  }, [tenantId, paymentIntent, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setPaymentIntent(null);
    setPaymentConfirmed(false);
    setIsCreating(false);
    setLastGatewayError(null);
  }, [stopPolling]);

  return {
    createPayment,
    cancelPayment,
    checkStatus,
    reset,
    stopPolling,
    paymentIntent,
    paymentConfirmed,
    isCreating,
    isPolling,
    lastGatewayError,
  };
}
