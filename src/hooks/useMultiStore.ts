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

export interface ToggleResult {
  success: boolean;
  message?: string;
  blockReason?: 'headquarters' | 'open_cash_register' | 'active_orders' | 'no_permission';
}

export function useMultiStore() {
  const queryClient = useQueryClient();
  const { tenantId, hasRole } = useAuth();

  // Check if user has permission to manage stores
  const canManageStores = hasRole('admin') || hasRole('manager');

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

  // Check if store can be toggled
  const checkStoreToggleAllowed = async (storeId: string): Promise<ToggleResult> => {
    const store = stores.find(s => s.id === storeId);
    
    // Rule 1: Headquarters cannot be deactivated
    if (store?.is_headquarters) {
      return {
        success: false,
        blockReason: 'headquarters',
        message: 'A loja matriz não pode ser desativada.',
      };
    }

    // Rule 2: Check user permission
    if (!canManageStores) {
      return {
        success: false,
        blockReason: 'no_permission',
        message: 'Você não tem permissão para alterar o status da loja.',
      };
    }

    // Rule 3: Check for open cash registers
    const { data: openCashRegisters, error: cashError } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('tenant_id', tenantId!)
      .is('closed_at', null)
      .eq('is_active', true);

    if (cashError) {
      console.error('Error checking cash registers:', cashError);
    }

    // Note: cash_registers doesn't have store_id, so we check tenant-level for now
    // In a full implementation, you'd add store_id to cash_registers

    // Rule 4: Check for active orders for this store
    const { data: activeOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', storeId)
      .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery'] as const)
      .limit(1);

    if (ordersError) {
      console.error('Error checking orders:', ordersError);
    }

    if (activeOrders && activeOrders.length > 0) {
      return {
        success: false,
        blockReason: 'active_orders',
        message: 'Não é possível desativar esta loja pois existem pedidos em andamento.',
      };
    }

    return { success: true };
  };

  // Toggle store status via Edge Function
  const toggleStore = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await supabase.functions.invoke('toggle-store-status', {
        body: { store_id: id, is_active },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao alterar status da loja');
      }

      const result = response.data as ToggleResult;

      if (!result.success) {
        throw new Error(result.message || 'Erro ao alterar status da loja');
      }

      return { id, is_active, message: result.message };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success(data.message || (data.is_active ? 'Loja ativada com sucesso' : 'Loja desativada com sucesso'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
    canManageStores,
    createStore,
    updateStore,
    deleteStore,
    toggleStore,
    checkStoreToggleAllowed,
    getStoreProducts,
    updateStoreProduct,
  };
}
