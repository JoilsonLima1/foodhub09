import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface KitchenDisplayConfig {
  id: string;
  tenant_id: string;
  is_active: boolean;
  display_mode: 'list' | 'grid' | 'kanban';
  auto_advance: boolean;
  alert_threshold_minutes: number;
  show_customer_name: boolean;
  show_order_number: boolean;
  group_by_category: boolean;
  sound_enabled: boolean;
  config: Record<string, any>;
}

export interface KitchenStation {
  id: string;
  tenant_id: string;
  name: string;
  categories: string[];
  display_order: number;
  is_active: boolean;
  config: Record<string, any>;
}

export interface KitchenOrderItem {
  id: string;
  tenant_id: string;
  order_id: string;
  order_item_id: string;
  station_id: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  priority: number;
  notes: string | null;
  created_at: string;
  // Joined fields
  order?: {
    order_number: number;
    customer_name: string | null;
    created_at: string;
  };
  order_item?: {
    product_name: string;
    quantity: number;
    notes: string | null;
  };
}

export function useKitchenDisplay(stationId?: string) {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['kitchen-display-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_display_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as KitchenDisplayConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch stations
  const { data: stations = [], isLoading: stationsLoading } = useQuery({
    queryKey: ['kitchen-stations', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_stations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as KitchenStation[];
    },
    enabled: !!tenantId,
  });

  // Fetch kitchen order items
  const { data: orderItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['kitchen-order-items', tenantId, stationId],
    queryFn: async () => {
      let query = supabase
        .from('kitchen_order_items')
        .select(`
          *,
          order:orders(order_number, customer_name, created_at),
          order_item:order_items(product_name, quantity, notes)
        `)
        .in('status', ['pending', 'preparing'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (stationId) {
        query = query.eq('station_id', stationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as KitchenOrderItem[];
    },
    enabled: !!tenantId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('kitchen-items')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_order_items',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['kitchen-order-items'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Stats
  const stats = {
    pendingItems: orderItems.filter(i => i.status === 'pending').length,
    preparingItems: orderItems.filter(i => i.status === 'preparing').length,
    alertItems: orderItems.filter(i => {
      if (!i.created_at || !config?.alert_threshold_minutes) return false;
      const ageMinutes = (Date.now() - new Date(i.created_at).getTime()) / 60000;
      return ageMinutes > config.alert_threshold_minutes;
    }).length,
    avgPrepTime: 0, // Would calculate from completed items
  };

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<KitchenDisplayConfig>) => {
      const { error } = await supabase
        .from('kitchen_display_config')
        .upsert({
          tenant_id: tenantId,
          ...newConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-display-config'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Create station
  const createStation = useMutation({
    mutationFn: async (station: { name: string; categories?: string[] }) => {
      const { data, error } = await supabase
        .from('kitchen_stations')
        .insert({
          tenant_id: tenantId,
          ...station,
          display_order: stations.length,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-stations'] });
      toast.success('Estação criada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar: ' + error.message);
    },
  });

  // Update item status
  const updateItemStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: KitchenOrderItem['status'] }) => {
      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
      
      if (status === 'preparing') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'ready' || status === 'served') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('kitchen_order_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-order-items'] });
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Bump item (mark as ready)
  const bumpItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kitchen_order_items')
        .update({
          status: 'ready',
          completed_at: new Date().toISOString(),
          bumped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-order-items'] });
      if (config?.sound_enabled) {
        // Play bump sound
        const audio = new Audio('/sounds/bump.mp3');
        audio.play().catch(() => {});
      }
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    config,
    stations,
    orderItems,
    stats,
    isLoading: configLoading || stationsLoading || itemsLoading,
    saveConfig,
    createStation,
    updateItemStatus,
    bumpItem,
  };
}
