import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MenuMapping {
  id: string;
  product_id: string;
  ifood_item_id: string | null;
  sync_status: 'pending' | 'synced' | 'error';
  last_synced_at: string | null;
  product?: {
    id: string;
    name: string;
    base_price: number;
    description: string | null;
    image_url: string | null;
    category?: {
      name: string;
    };
  };
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export function useIFoodMenuSync() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch menu mappings with product details
  const { data: menuMappings = [], isLoading, refetch } = useQuery({
    queryKey: ['ifood-menu-mappings', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('ifood_menu_mapping')
        .select(`
          id,
          product_id,
          ifood_item_id,
          sync_status,
          last_synced_at,
          product:products (
            id,
            name,
            base_price,
            description,
            image_url,
            category:categories (name)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('last_synced_at', { ascending: false, nullsFirst: true });

      if (error) throw error;
      return data as unknown as MenuMapping[];
    },
    enabled: !!tenantId,
  });

  // Sync all products mutation
  const syncAllProducts = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'sync_menu' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as SyncResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ifood-menu-mappings'] });
      toast({
        title: 'Sincronização concluída',
        description: `${result?.synced || 0} produtos sincronizados`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSyncing(false);
    },
  });

  // Sync single product mutation
  const syncSingleProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { action: 'sync_single_product', product_id: productId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ifood-menu-mappings'] });
      toast({
        title: 'Produto sincronizado',
        description: 'O produto foi atualizado no iFood',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao sincronizar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update product availability on iFood
  const updateAvailability = useMutation({
    mutationFn: async ({ productId, available }: { productId: string; available: boolean }) => {
      const { data, error } = await supabase.functions.invoke('ifood-api', {
        body: { 
          action: 'update_product_availability', 
          product_id: productId,
          available 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ifood-menu-mappings'] });
      toast({
        title: variables.available ? 'Produto ativado' : 'Produto pausado',
        description: `Disponibilidade atualizada no iFood`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar disponibilidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get sync statistics
  const syncStats = {
    total: menuMappings.length,
    synced: menuMappings.filter(m => m.sync_status === 'synced').length,
    pending: menuMappings.filter(m => m.sync_status === 'pending').length,
    error: menuMappings.filter(m => m.sync_status === 'error').length,
  };

  return {
    menuMappings,
    syncStats,
    isLoading,
    isSyncing,
    refetch,
    syncAllProducts,
    syncSingleProduct,
    updateAvailability,
  };
}
