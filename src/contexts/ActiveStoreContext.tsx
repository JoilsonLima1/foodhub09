import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Store {
  id: string;
  name: string;
  code: string;
  is_headquarters: boolean;
  is_active: boolean;
}

interface ActiveStoreContextType {
  activeStoreId: string | null;
  activeStore: Store | null;
  stores: Store[];
  isLoading: boolean;
  canSwitchStore: boolean;
  setActiveStoreId: (storeId: string) => void;
  refreshStores: () => Promise<void>;
}

const ActiveStoreContext = createContext<ActiveStoreContextType | undefined>(undefined);

const STORAGE_KEY = 'foodhub_active_store';

export function ActiveStoreProvider({ children }: { children: React.ReactNode }) {
  const { user, tenantId, roles, profile } = useAuth();
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Only admin/manager can switch stores
  const canSwitchStore = roles.includes('admin') || roles.includes('super_admin');

  const fetchStores = useCallback(async () => {
    if (!tenantId) {
      setStores([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, code, is_headquarters, is_active')
        .eq('tenant_id', tenantId)
        .order('is_headquarters', { ascending: false })
        .order('name');

      if (error) {
        console.error('[ActiveStoreContext] Error fetching stores:', error);
        setStores([]);
      } else {
        setStores(data || []);
      }
    } catch (err) {
      console.error('[ActiveStoreContext] Exception fetching stores:', err);
      setStores([]);
    }
  }, [tenantId]);

  const determineActiveStore = useCallback(async () => {
    if (!user || !tenantId) {
      setActiveStoreIdState(null);
      setActiveStore(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check if user has a store_id in profile (branch manager scenario)
      const profileStoreId = (profile as any)?.store_id;
      
      // 2. Check localStorage for saved preference (admin scenario)
      const savedStoreId = localStorage.getItem(`${STORAGE_KEY}_${tenantId}`);
      
      // 3. Fallback: get from DB function
      let fallbackStoreId: string | null = null;
      if (!profileStoreId && !savedStoreId) {
        const { data: storeIdData } = await supabase
          .rpc('get_user_active_store', { p_user_id: user.id });
        fallbackStoreId = storeIdData;
      }

      // Determine final store ID
      let finalStoreId: string | null = null;

      if (!canSwitchStore && profileStoreId) {
        // Branch managers are locked to their store
        finalStoreId = profileStoreId;
      } else if (savedStoreId && stores.some(s => s.id === savedStoreId)) {
        // Admin has saved preference and it's valid
        finalStoreId = savedStoreId;
      } else if (profileStoreId) {
        // Use profile store_id
        finalStoreId = profileStoreId;
      } else if (fallbackStoreId) {
        // Use DB fallback (headquarters)
        finalStoreId = fallbackStoreId;
      } else if (stores.length > 0) {
        // Last resort: first store (should be headquarters)
        const hq = stores.find(s => s.is_headquarters);
        finalStoreId = hq?.id || stores[0].id;
      }

      setActiveStoreIdState(finalStoreId);

      // Find and set the active store object
      const store = stores.find(s => s.id === finalStoreId) || null;
      setActiveStore(store);

      console.log('[ActiveStoreContext] Active store determined:', {
        storeId: finalStoreId,
        storeName: store?.name,
        source: !canSwitchStore && profileStoreId ? 'locked_profile' : 
                savedStoreId ? 'localStorage' : 
                profileStoreId ? 'profile' : 
                fallbackStoreId ? 'db_fallback' : 'first_store'
      });

    } catch (err) {
      console.error('[ActiveStoreContext] Error determining active store:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, tenantId, profile, stores, canSwitchStore]);

  // Fetch stores when tenant changes
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Determine active store when stores or profile changes
  useEffect(() => {
    if (stores.length > 0 || !tenantId) {
      determineActiveStore();
    }
  }, [stores, determineActiveStore, tenantId]);

  const setActiveStoreId = useCallback((storeId: string) => {
    if (!canSwitchStore) {
      console.warn('[ActiveStoreContext] User cannot switch stores');
      return;
    }

    setActiveStoreIdState(storeId);
    const store = stores.find(s => s.id === storeId) || null;
    setActiveStore(store);

    // Save to localStorage for persistence
    if (tenantId) {
      localStorage.setItem(`${STORAGE_KEY}_${tenantId}`, storeId);
    }

    console.log('[ActiveStoreContext] Store switched to:', store?.name);
  }, [canSwitchStore, stores, tenantId]);

  const refreshStores = useCallback(async () => {
    await fetchStores();
  }, [fetchStores]);

  return (
    <ActiveStoreContext.Provider
      value={{
        activeStoreId,
        activeStore,
        stores,
        isLoading,
        canSwitchStore,
        setActiveStoreId,
        refreshStores,
      }}
    >
      {children}
    </ActiveStoreContext.Provider>
  );
}

export function useActiveStore() {
  const context = useContext(ActiveStoreContext);
  if (context === undefined) {
    throw new Error('useActiveStore must be used within an ActiveStoreProvider');
  }
  return context;
}
