import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface PasswordPanelConfig {
  id: string;
  tenant_id: string;
  is_active: boolean;
  display_format: 'numeric' | 'alphanumeric';
  voice_enabled: boolean;
  voice_text: string;
  display_timeout_seconds: number;
  max_displayed: number;
  reset_daily: boolean;
  current_number: number;
  config: Record<string, any>;
}

export interface PasswordQueueItem {
  id: string;
  tenant_id: string;
  order_id: string | null;
  password_number: string;
  status: 'waiting' | 'preparing' | 'ready' | 'called' | 'delivered';
  called_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export function usePasswordPanel() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['password-panel-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_panel_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as PasswordPanelConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch queue
  const { data: queue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['password-queue', tenantId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('password_queue')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PasswordQueueItem[];
    },
    enabled: !!tenantId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('password-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'password_queue',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['password-queue'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Stats
  const stats = {
    waiting: queue.filter(p => p.status === 'waiting').length,
    preparing: queue.filter(p => p.status === 'preparing').length,
    ready: queue.filter(p => p.status === 'ready' || p.status === 'called').length,
    delivered: queue.filter(p => p.status === 'delivered').length,
    currentNumber: config?.current_number || 0,
  };

  // Ready passwords (to display)
  const readyPasswords = queue
    .filter(p => p.status === 'ready' || p.status === 'called')
    .slice(0, config?.max_displayed || 5);

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<PasswordPanelConfig>) => {
      const { error } = await supabase
        .from('password_panel_config')
        .upsert({
          tenant_id: tenantId,
          ...newConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-panel-config'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Generate next password
  const generatePassword = useMutation({
    mutationFn: async (orderId?: string) => {
      const nextNumber = (config?.current_number || 0) + 1;
      const passwordNumber = config?.display_format === 'alphanumeric'
        ? `A${String(nextNumber).padStart(3, '0')}`
        : String(nextNumber).padStart(3, '0');

      // Update config with new number
      await supabase
        .from('password_panel_config')
        .update({ current_number: nextNumber, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId!);

      // Create queue item
      const { data, error } = await supabase
        .from('password_queue')
        .insert({
          tenant_id: tenantId,
          order_id: orderId,
          password_number: passwordNumber,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['password-queue'] });
      queryClient.invalidateQueries({ queryKey: ['password-panel-config'] });
      toast.success(`Senha ${data.password_number} gerada`);
      return data;
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar senha: ' + error.message);
    },
  });

  // Update password status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PasswordQueueItem['status'] }) => {
      const updates: Record<string, any> = { status };
      
      if (status === 'called') {
        updates.called_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('password_queue')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-queue'] });
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Call password (mark as ready and announce)
  const callPassword = useMutation({
    mutationFn: async (id: string) => {
      const item = queue.find(p => p.id === id);
      if (!item) throw new Error('Senha não encontrada');

      await supabase
        .from('password_queue')
        .update({ status: 'called', called_at: new Date().toISOString() })
        .eq('id', id);

      // Voice announcement
      if (config?.voice_enabled && 'speechSynthesis' in window) {
        const text = (config.voice_text || 'Senha {number} pronta para retirada')
          .replace('{number}', item.password_number);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        speechSynthesis.speak(utterance);
      }

      return item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['password-queue'] });
      toast.success(`Senha ${item.password_number} chamada`);
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Reset daily counter
  const resetCounter = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('password_panel_config')
        .update({ current_number: 0, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-panel-config'] });
      toast.success('Contador reiniciado');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    config,
    queue,
    readyPasswords,
    stats,
    isLoading: configLoading || queueLoading,
    saveConfig,
    generatePassword,
    updateStatus,
    callPassword,
    resetCounter,
  };
}
