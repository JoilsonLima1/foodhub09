import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface MarketplaceIntegration {
  id: string;
  tenant_id: string;
  provider: string;
  merchant_id: string | null;
  store_id: string | null;
  is_active: boolean;
  auto_accept_orders: boolean;
  sync_menu: boolean;
  sync_prices: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  credentials_configured?: boolean;
  has_valid_token?: boolean;
}

export interface MarketplaceOrder {
  id: string;
  tenant_id: string;
  provider: string;
  external_order_id: string;
  external_short_id: string | null;
  order_id: string | null;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: string | null;
  scheduled_to: string | null;
  created_at: string;
}

export interface MarketplaceStats {
  ordersToday: number;
  totalRevenue: number;
  avgTime: number;
  cancelledCount: number;
}

export function useMarketplaceIntegration(provider: string) {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch integration config
  const { data: integration, isLoading } = useQuery({
    queryKey: ['marketplace-integration', provider, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_integrations')
        .select('*')
        .eq('provider', provider)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        return {
          ...data,
          credentials_configured: !!(data.client_id || data.api_key),
          has_valid_token: !!data.access_token,
        } as MarketplaceIntegration;
      }
      return null;
    },
    enabled: !!tenantId,
  });

  // Fetch orders
  const { data: orders = [] } = useQuery({
    queryKey: ['marketplace-orders', provider, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select('*')
        .eq('provider', provider)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MarketplaceOrder[];
    },
    enabled: !!tenantId,
  });

  // Calculate stats
  const stats: MarketplaceStats = {
    ordersToday: orders.filter(o => {
      const today = new Date();
      const orderDate = new Date(o.created_at);
      return orderDate.toDateString() === today.toDateString();
    }).length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    avgTime: 0, // Would need delivery data
    cancelledCount: orders.filter(o => o.status === 'CANCELLED').length,
  };

  // Save credentials
  const saveCredentials = useMutation({
    mutationFn: async (credentials: {
      client_id?: string;
      client_secret?: string;
      api_key?: string;
      merchant_id?: string;
      store_id?: string;
    }) => {
      const { error } = await supabase
        .from('marketplace_integrations')
        .upsert({
          tenant_id: tenantId,
          provider,
          ...credentials,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,provider' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-integration', provider] });
      toast.success('Credenciais salvas com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar credenciais: ' + error.message);
    },
  });

  // Update settings
  const updateSettings = useMutation({
    mutationFn: async (settings: {
      auto_accept_orders?: boolean;
      sync_menu?: boolean;
      sync_prices?: boolean;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from('marketplace_integrations')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('provider', provider)
        .eq('tenant_id', tenantId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-integration', provider] });
      toast.success('Configurações atualizadas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Test connection
  const testConnection = useMutation({
    mutationFn: async () => {
      // This would call an edge function to test the API
      const { data, error } = await supabase.functions.invoke('marketplace-api', {
        body: { action: 'test_connection', provider },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Conexão falhou');
      return data;
    },
    onSuccess: () => {
      toast.success('Conexão realizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['marketplace-integration', provider] });
    },
    onError: (error: Error) => {
      toast.error('Falha na conexão: ' + error.message);
    },
  });

  return {
    integration,
    orders,
    stats,
    isLoading,
    saveCredentials,
    updateSettings,
    testConnection,
  };
}
