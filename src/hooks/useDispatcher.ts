import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface DispatcherConfig {
  id: string;
  tenant_id: string;
  is_active: boolean;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_api_token: string | null;
  whatsapp_phone_id: string | null;
  config: Record<string, any>;
}

export interface DispatcherTrigger {
  id: string;
  tenant_id: string;
  name: string;
  trigger_type: string;
  delay_minutes: number;
  message_template: string;
  channel: 'whatsapp' | 'sms' | 'both';
  is_active: boolean;
  conditions: Record<string, any>;
  created_at: string;
}

export interface DispatcherMessage {
  id: string;
  tenant_id: string;
  trigger_id: string | null;
  order_id: string | null;
  customer_phone: string;
  channel: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export const TRIGGER_TYPES = [
  { value: 'order_confirmed', label: 'Pedido Confirmado', icon: '✅' },
  { value: 'order_preparing', label: 'Pedido em Preparo', icon: '👨‍🍳' },
  { value: 'order_ready', label: 'Pedido Pronto', icon: '🍽️' },
  { value: 'order_delivered', label: 'Pedido Entregue', icon: '🚀' },
  { value: 'abandoned_cart', label: 'Carrinho Abandonado', icon: '🛒' },
  { value: 'review_request', label: 'Solicitar Avaliação', icon: '⭐' },
  { value: 'birthday', label: 'Aniversário', icon: '🎂' },
  { value: 'inactive_customer', label: 'Cliente Inativo', icon: '😴' },
];

export function useDispatcher() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['dispatcher-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatcher_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as DispatcherConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch triggers
  const { data: triggers = [], isLoading: triggersLoading } = useQuery({
    queryKey: ['dispatcher-triggers', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatcher_triggers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as DispatcherTrigger[];
    },
    enabled: !!tenantId,
  });

  // Fetch recent messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['dispatcher-messages', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatcher_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as DispatcherMessage[];
    },
    enabled: !!tenantId,
  });

  // Stats
  const today = new Date();
  const todayMessages = messages.filter(m => {
    const msgDate = new Date(m.created_at);
    return msgDate.toDateString() === today.toDateString();
  });

  const stats = {
    messagesToday: todayMessages.length,
    deliveredToday: todayMessages.filter(m => m.status === 'delivered' || m.status === 'read').length,
    failedToday: todayMessages.filter(m => m.status === 'failed').length,
    activeTriggers: triggers.filter(t => t.is_active).length,
  };

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<DispatcherConfig>) => {
      const { error } = await supabase
        .from('dispatcher_config')
        .upsert({
          tenant_id: tenantId,
          ...newConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-config'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Create trigger
  const createTrigger = useMutation({
    mutationFn: async (trigger: {
      name: string;
      trigger_type: string;
      delay_minutes?: number;
      message_template: string;
      channel?: 'whatsapp' | 'sms' | 'both';
      conditions?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('dispatcher_triggers')
        .insert({
          tenant_id: tenantId,
          ...trigger,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-triggers'] });
      toast.success('Gatilho criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar: ' + error.message);
    },
  });

  // Update trigger
  const updateTrigger = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DispatcherTrigger> & { id: string }) => {
      const { error } = await supabase
        .from('dispatcher_triggers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-triggers'] });
      toast.success('Gatilho atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Delete trigger
  const deleteTrigger = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dispatcher_triggers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-triggers'] });
      toast.success('Gatilho removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  // Toggle trigger
  const toggleTrigger = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('dispatcher_triggers')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-triggers'] });
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    config,
    triggers,
    messages,
    stats,
    isLoading: configLoading || triggersLoading || messagesLoading,
    saveConfig,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
  };
}
