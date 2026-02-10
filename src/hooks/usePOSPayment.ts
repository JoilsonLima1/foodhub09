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

export function usePOSPayment() {
  const { tenantId } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<POSPaymentIntent | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
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

      if (res.error) throw res.error;
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

    // Poll every 5 seconds for up to 5 minutes (60 attempts)
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

      if (res.error) throw res.error;
      const data = res.data;

      if (!data.success && data.error) {
        throw new Error(data.error);
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

      // Start polling for status
      startPolling(intent.gatewayPaymentId);

      return intent;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar pagamento';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
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
  };
}
