import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface TEFConfig {
  id: string;
  tenant_id: string;
  is_active: boolean;
  provider: string | null;
  establishment_code: string | null;
  terminal_id: string | null;
  com_port: string | null;
  auto_capture: boolean;
  print_receipt: boolean;
  confirmation_required: boolean;
  config: Record<string, any>;
}

export interface TEFTransaction {
  id: string;
  tenant_id: string;
  order_id: string | null;
  payment_id: string | null;
  amount: number;
  transaction_type: 'credit' | 'debit' | 'pix' | 'voucher';
  installments: number;
  card_brand: string | null;
  card_last4: string | null;
  authorization_code: string | null;
  nsu: string | null;
  host_nsu: string | null;
  status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'error';
  error_message: string | null;
  receipt_merchant: string | null;
  receipt_customer: string | null;
  created_at: string;
}

export const TEF_PROVIDERS = [
  { value: 'sitef', label: 'SiTef (Software Express)' },
  { value: 'rede', label: 'Rede (Itaú)' },
  { value: 'stone', label: 'Stone' },
  { value: 'cielo', label: 'Cielo' },
  { value: 'pagseguro', label: 'PagSeguro' },
];

export function useTEFIntegration() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['tef-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tef_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as TEFConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['tef-transactions', tenantId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('tef_transactions')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TEFTransaction[];
    },
    enabled: !!tenantId,
  });

  // Stats
  const stats = {
    transactionsToday: transactions.length,
    approvedCount: transactions.filter(t => t.status === 'approved').length,
    totalVolume: transactions.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.amount, 0),
    approvalRate: transactions.length > 0
      ? Math.round(transactions.filter(t => t.status === 'approved').length / transactions.length * 100)
      : 0,
  };

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<TEFConfig>) => {
      const { error } = await supabase
        .from('tef_config')
        .upsert({
          tenant_id: tenantId,
          ...newConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tef-config'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Process payment (simulated - in real world this would communicate with PINPAD)
  const processPayment = useMutation({
    mutationFn: async (payment: {
      amount: number;
      transaction_type: 'credit' | 'debit' | 'pix' | 'voucher';
      installments?: number;
      order_id?: string;
    }) => {
      if (!config?.is_active) {
        throw new Error('TEF não está configurado');
      }

      // In a real implementation, this would:
      // 1. Communicate with the PINPAD via COM port
      // 2. Send transaction to the provider
      // 3. Wait for card insertion and PIN
      // 4. Return authorization result

      // Simulated response
      const transactionData = {
        tenant_id: tenantId!,
        order_id: payment.order_id || null,
        amount: payment.amount,
        transaction_type: payment.transaction_type,
        installments: payment.installments || 1,
        status: 'pending' as const,
      };

      const { data, error } = await supabase
        .from('tef_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      // Simulate PINPAD communication
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate approval
      const approved = Math.random() > 0.1; // 90% approval rate for demo
      
      const { error: updateError } = await supabase
        .from('tef_transactions')
        .update({
          status: approved ? 'approved' : 'declined',
          authorization_code: approved ? Math.random().toString(36).substring(2, 8).toUpperCase() : null,
          nsu: approved ? String(Math.floor(Math.random() * 1000000)).padStart(6, '0') : null,
          card_brand: approved ? ['VISA', 'MASTERCARD', 'ELO'][Math.floor(Math.random() * 3)] : null,
          card_last4: approved ? String(Math.floor(Math.random() * 10000)).padStart(4, '0') : null,
          error_message: approved ? null : 'Transação negada pelo emissor',
        })
        .eq('id', data.id);

      if (updateError) throw updateError;

      return { ...data, status: approved ? 'approved' : 'declined' };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tef-transactions'] });
      if (data.status === 'approved') {
        toast.success('Pagamento aprovado!');
      } else {
        toast.error('Pagamento recusado');
      }
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Cancel transaction
  const cancelTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('tef_transactions')
        .update({ status: 'cancelled' })
        .eq('id', transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tef-transactions'] });
      toast.success('Transação cancelada');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Test connection
  const testConnection = useMutation({
    mutationFn: async () => {
      if (!config?.com_port) {
        throw new Error('Porta COM não configurada');
      }

      // Simulate PINPAD detection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In real implementation, this would actually try to communicate with PINPAD
      return { success: true, message: 'PINPAD detectado com sucesso' };
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    config,
    transactions,
    stats,
    isLoading: configLoading || transactionsLoading,
    saveConfig,
    processPayment,
    cancelTransaction,
    testConnection,
  };
}
