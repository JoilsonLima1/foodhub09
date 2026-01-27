import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IFoodIntegration {
  id: string;
  tenant_id: string;
  merchant_id: string | null;
  is_active: boolean;
  auto_accept_orders: boolean;
  sync_menu: boolean;
  created_at: string;
  updated_at: string;
}

interface SaveCredentialsParams {
  client_id: string;
  client_secret: string;
  merchant_id: string;
}

export function useIFoodIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Fetch current integration status
  const { data: integration, isLoading, error } = useQuery({
    queryKey: ['ifood-integration'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'get_integration' }
      });

      if (error) throw error;
      return data?.integration as IFoodIntegration | null;
    }
  });

  // Save credentials mutation
  const saveCredentials = useMutation({
    mutationFn: async (params: SaveCredentialsParams) => {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'save_credentials', ...params }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ifood-integration'] });
      toast({
        title: 'Credenciais salvas',
        description: 'Integração com iFood configurada com sucesso!'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar credenciais',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Test connection
  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'test_connection' }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Conexão OK',
          description: `Conectado a: ${data.merchant?.name || 'Restaurante'}`
        });
        return { success: true, merchant: data.merchant };
      } else {
        toast({
          title: 'Falha na conexão',
          description: data?.error || 'Não foi possível conectar ao iFood',
          variant: 'destructive'
        });
        return { success: false, error: data?.error };
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao testar conexão',
        variant: 'destructive'
      });
      return { success: false, error: 'Connection failed' };
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Toggle integration active state
  const toggleIntegration = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'toggle_integration', is_active: isActive }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: ['ifood-integration'] });
      toast({
        title: isActive ? 'Integração ativada' : 'Integração desativada',
        description: isActive 
          ? 'Pedidos do iFood serão recebidos automaticamente'
          : 'Integração com iFood foi pausada'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update settings
  const updateSettings = useMutation({
    mutationFn: async (params: { auto_accept_orders?: boolean; sync_menu?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'update_settings', ...params }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ifood-integration'] });
      toast({
        title: 'Configurações atualizadas',
        description: 'As preferências foram salvas'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Sync menu
  const syncMenu = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'sync_menu' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Cardápio sincronizado',
        description: data?.message || 'Produtos preparados para sincronização'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update iFood order status
  const updateOrderStatus = useMutation({
    mutationFn: async (params: { ifood_order_id: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'update_order_status', ...params }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ifood-orders'] });
      toast({
        title: 'Status atualizado',
        description: 'O status do pedido foi atualizado no iFood'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    integration,
    isLoading,
    error,
    isTestingConnection,
    saveCredentials,
    testConnection,
    toggleIntegration,
    updateSettings,
    syncMenu,
    updateOrderStatus
  };
}
