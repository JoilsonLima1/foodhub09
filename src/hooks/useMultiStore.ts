import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Store {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  type: 'headquarters' | 'branch' | 'franchise';
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_active: boolean;
  is_headquarters: boolean;
  timezone: string;
  business_hours: Record<string, any>;
  config: Record<string, any>;
  created_at: string;
}

export interface StoreProduct {
  id: string;
  store_id: string;
  product_id: string;
  price_override: number | null;
  is_available: boolean;
  stock_quantity: number | null;
}

export interface StoreStats {
  storeId: string;
  storeName: string;
  ordersToday: number;
  revenueToday: number;
  avgTicket: number;
}

export function useMultiStore() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch stores
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['stores', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('is_headquarters', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Store[];
    },
    enabled: !!tenantId,
  });

  // Stats summary
  const stats = {
    totalStores: stores.length,
    activeStores: stores.filter(s => s.is_active).length,
    headquarters: stores.find(s => s.is_headquarters),
    branches: stores.filter(s => !s.is_headquarters),
  };

  // Create store
  const createStore = useMutation({
    mutationFn: async (store: {
      name: string;
      code: string;
      type?: 'headquarters' | 'branch' | 'franchise';
      address?: string;
      city?: string;
      state?: string;
      zip_code?: string;
      phone?: string;
      email?: string;
      manager_name?: string;
    }) => {
      const isFirst = stores.length === 0;
      
      const { data, error } = await supabase
        .from('stores')
        .insert({
          tenant_id: tenantId,
          ...store,
          is_headquarters: isFirst,
          type: store.type || (isFirst ? 'headquarters' : 'branch'),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar loja: ' + error.message);
    },
  });

  // Update store
  const updateStore = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Store> & { id: string }) => {
      const { error } = await supabase
        .from('stores')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Delete store
  const deleteStore = useMutation({
    mutationFn: async (id: string) => {
      const store = stores.find(s => s.id === id);
      if (store?.is_headquarters) {
        throw new Error('Não é possível excluir a matriz');
      }

      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja excluída');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Toggle store status
  const toggleStore = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('stores')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Fetch store products
  const getStoreProducts = async (storeId: string) => {
    const { data, error } = await supabase
      .from('store_products')
      .select('*, product:products(*)')
      .eq('store_id', storeId);

    if (error) throw error;
    return data;
  };

  // Update store product
  const updateStoreProduct = useMutation({
    mutationFn: async (product: {
      store_id: string;
      product_id: string;
      price_override?: number | null;
      is_available?: boolean;
      stock_quantity?: number | null;
    }) => {
      const { error } = await supabase
        .from('store_products')
        .upsert({
          ...product,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'store_id,product_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Produto atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    stores,
    stats,
    isLoading: storesLoading,
    createStore,
    updateStore,
    deleteStore,
    toggleStore,
    getStoreProducts,
    updateStoreProduct,
  };
}
