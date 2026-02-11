import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface PixRapidoOption {
  psp_provider_id: string;
  psp_name: string;
  psp_display_name: string;
  pricing_plan_id: string | null;
  pricing_plan_name: string | null;
  percent_rate: number;
  fixed_rate: number;
  min_fee: number;
  max_fee: number | null;
  is_subsidized: boolean;
  rule_scope: string;
  rule_priority: number;
}

export interface PixRapidoIntent {
  transaction_id: string;
  txid: string;
  qr_code: string | null;
  qr_code_url: string | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  expires_at: string;
  psp_name: string;
  status: string;
}

export function usePixRapido() {
  const { tenantId } = useAuth();
  const [options, setOptions] = useState<PixRapidoOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [intent, setIntent] = useState<PixRapidoIntent | null>(null);
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

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // Load available PIX options for this tenant
  const loadOptions = useCallback(async () => {
    if (!tenantId) return;
    setIsLoadingOptions(true);
    try {
      const { data, error } = await supabase.functions.invoke('pix-rapido', {
        body: { action: 'resolve-config', tenant_id: tenantId },
      });
      if (error) throw new Error('Erro ao carregar opções PIX');
      setOptions(data?.options || []);
    } catch (e) {
      console.error('[usePixRapido] loadOptions error:', e);
      setOptions([]);
    } finally {
      setIsLoadingOptions(false);
    }
  }, [tenantId]);

  // Check payment status
  const checkStatus = useCallback(async (transactionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('pix-rapido', {
        body: { action: 'status', transaction_id: transactionId },
      });
      if (error) return;
      if (data?.is_confirmed) {
        setPaymentConfirmed(true);
        stopPolling();
        toast({ title: '✅ PIX Confirmado!', description: 'Pagamento recebido com sucesso.' });
      }
      return data;
    } catch (e) {
      console.error('[usePixRapido] checkStatus error:', e);
    }
  }, [stopPolling]);

  const startPolling = useCallback((transactionId: string) => {
    stopPolling();
    setIsPolling(true);
    pollingCountRef.current = 0;
    pollingRef.current = setInterval(async () => {
      pollingCountRef.current++;
      if (pollingCountRef.current > 60) {
        stopPolling();
        toast({ title: 'Tempo esgotado', description: 'PIX expirou.', variant: 'destructive' });
        return;
      }
      await checkStatus(transactionId);
    }, 5000);
  }, [checkStatus, stopPolling]);

  // Create PIX charge
  const createCharge = useCallback(async (input: {
    orderId?: string;
    amount: number;
    pspProviderId: string;
    description?: string;
  }): Promise<PixRapidoIntent | null> => {
    if (!tenantId) return null;
    setIsCreating(true);
    setPaymentConfirmed(false);
    setIntent(null);

    try {
      const { data, error } = await supabase.functions.invoke('pix-rapido', {
        body: {
          action: 'create',
          tenant_id: tenantId,
          order_id: input.orderId,
          amount: input.amount,
          psp_provider_id: input.pspProviderId,
          description: input.description,
        },
      });

      if (error || !data?.success) {
        toast({ title: 'Erro', description: data?.error || 'Falha ao gerar PIX', variant: 'destructive' });
        return null;
      }

      const newIntent: PixRapidoIntent = {
        transaction_id: data.transaction_id,
        txid: data.txid,
        qr_code: data.qr_code,
        qr_code_url: data.qr_code_url,
        amount: data.amount,
        platform_fee: data.platform_fee,
        net_amount: data.net_amount,
        expires_at: data.expires_at,
        psp_name: data.psp_name,
        status: data.status,
      };

      setIntent(newIntent);
      startPolling(newIntent.transaction_id);
      return newIntent;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao gerar PIX';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [tenantId, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setIntent(null);
    setPaymentConfirmed(false);
    setIsCreating(false);
    setOptions([]);
  }, [stopPolling]);

  // Estimate fee for a given amount and option
  const estimateFee = useCallback((amount: number, option: PixRapidoOption) => {
    let fee = amount * option.percent_rate + option.fixed_rate;
    fee = Math.max(fee, option.min_fee);
    if (option.max_fee) fee = Math.min(fee, option.max_fee);
    return Math.round(fee * 100) / 100;
  }, []);

  return {
    options,
    isLoadingOptions,
    loadOptions,
    createCharge,
    intent,
    paymentConfirmed,
    isCreating,
    isPolling,
    reset,
    stopPolling,
    estimateFee,
  };
}
