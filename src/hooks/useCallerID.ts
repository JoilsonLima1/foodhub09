import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface CallerIDConfig {
  id: string;
  tenant_id: string;
  is_active: boolean;
  auto_popup: boolean;
  show_history: boolean;
  record_calls: boolean;
  hardware_port: string | null;
  hardware_model: string | null;
  config: Record<string, any>;
}

export interface CallLog {
  id: string;
  tenant_id: string;
  phone_number: string;
  customer_name: string | null;
  customer_id: string | null;
  call_type: 'incoming' | 'outgoing';
  duration_seconds: number | null;
  was_answered: boolean;
  order_created: boolean;
  order_id: string | null;
  notes: string | null;
  created_at: string;
}

export function useCallerID() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['caller-id-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caller_id_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as CallerIDConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch call logs
  const { data: callLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['call-logs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CallLog[];
    },
    enabled: !!tenantId,
  });

  // Today's stats
  const today = new Date();
  const todayLogs = callLogs.filter(log => {
    const logDate = new Date(log.created_at);
    return logDate.toDateString() === today.toDateString();
  });

  const stats = {
    callsToday: todayLogs.length,
    customersIdentified: todayLogs.filter(l => l.customer_name).length,
    ordersCreated: todayLogs.filter(l => l.order_created).length,
    avgDuration: todayLogs.filter(l => l.duration_seconds).length > 0
      ? Math.round(todayLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / todayLogs.filter(l => l.duration_seconds).length)
      : 0,
  };

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<CallerIDConfig>) => {
      const { error } = await supabase
        .from('caller_id_config')
        .upsert({
          tenant_id: tenantId,
          ...newConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caller-id-config'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Log call
  const logCall = useMutation({
    mutationFn: async (call: {
      phone_number: string;
      customer_name?: string;
      customer_id?: string;
      call_type?: 'incoming' | 'outgoing';
      duration_seconds?: number;
      was_answered?: boolean;
      order_created?: boolean;
      order_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('call_logs')
        .insert({
          tenant_id: tenantId,
          ...call,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao registrar: ' + error.message);
    },
  });

  // Find customer by phone
  const findCustomerByPhone = async (phone: string) => {
    // Search in orders
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_name, customer_phone, id')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })
      .limit(5);

    return orders || [];
  };

  return {
    config,
    callLogs,
    stats,
    isLoading: configLoading || logsLoading,
    saveConfig,
    logCall,
    findCustomerByPhone,
  };
}
