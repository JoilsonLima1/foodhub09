import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface MobileCommandConfig {
  id: string;
  tenant_id: string;
  is_active: boolean;
  require_table: boolean;
  allow_split_payment: boolean;
  show_product_images: boolean;
  config: Record<string, any>;
}

export interface MobileSession {
  id: string;
  tenant_id: string;
  user_id: string;
  device_id: string | null;
  device_name: string | null;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
  // Joined
  user?: {
    email: string;
    full_name: string | null;
  };
}

export function useMobileCommand() {
  const queryClient = useQueryClient();
  const { tenantId, user } = useAuth();

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['mobile-command-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_command_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as MobileCommandConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['mobile-sessions', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      return data as MobileSession[];
    },
    enabled: !!tenantId,
  });

  // Stats
  const stats = {
    activeSessions: sessions.length,
    activeDevices: new Set(sessions.map(s => s.device_id).filter(Boolean)).size,
  };

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<MobileCommandConfig>) => {
      const { error } = await supabase
        .from('mobile_command_config')
        .upsert({
          tenant_id: tenantId,
          ...newConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-command-config'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Start session
  const startSession = useMutation({
    mutationFn: async (deviceInfo?: { device_id?: string; device_name?: string }) => {
      const { data, error } = await supabase
        .from('mobile_sessions')
        .insert({
          tenant_id: tenantId,
          user_id: user?.id,
          ...deviceInfo,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-sessions'] });
      toast.success('Sessão iniciada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao iniciar: ' + error.message);
    },
  });

  // End session
  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('mobile_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-sessions'] });
      toast.success('Sessão encerrada');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // End all sessions
  const endAllSessions = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('mobile_sessions')
        .update({ is_active: false })
        .eq('tenant_id', tenantId!)
        .eq('is_active', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-sessions'] });
      toast.success('Todas as sessões encerradas');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Update activity
  const updateActivity = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('mobile_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
    },
  });

  return {
    config,
    sessions,
    stats,
    isLoading: configLoading || sessionsLoading,
    saveConfig,
    startSession,
    endSession,
    endAllSessions,
    updateActivity,
  };
}
