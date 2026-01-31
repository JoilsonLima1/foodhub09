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
  hasMultiStore: boolean;
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
  const [hasMultiStore, setHasMultiStore] = useState(false);

  // Only admin/manager can switch stores
  const canSwitchStore = roles.includes('admin') || roles.includes('super_admin');

  // Check if tenant has Multi-Store module
  const checkMultiStoreModule = useCallback(async () => {
    if (!tenantId) return false;

    try {
      const { data, error } = await supabase
        .from('tenant_addon_subscriptions')
        .select(`
          id,
          status,
          addon_module:addon_modules!inner(slug)
        `)
        .eq('tenant_id', tenantId)
        .eq('addon_module.slug', 'multi_store')
        .in('status', ['active', 'trial'])
        .limit(1);

      if (error) {
        console.error('[ActiveStoreContext] Error checking multi-store module:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (err) {
      console.error('[ActiveStoreContext] Exception checking module:', err);
      return false;
    }
  }, [tenantId]);

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
      // 1. Check if Multi-Store module is active
      const moduleActive = await checkMultiStoreModule();
      setHasMultiStore(moduleActive);

      // 2. If NO Multi-Store module, use simple single-store logic
      if (!moduleActive) {
        // Just get the headquarters (or first store) for single-store tenants
        const hq = stores.find(s => s.is_headquarters) || stores[0] || null;
        
        if (hq) {
          setActiveStoreIdState(hq.id);
          setActiveStore(hq);
          console.log('[ActiveStoreContext] Single-store mode - using:', hq.name);
        } else {
          // No store exists yet - this is OK for new tenants
          // The bootstrap-user function should create the HQ store
          setActiveStoreIdState(null);
          setActiveStore(null);
          console.log('[ActiveStoreContext] No stores found for tenant');
        }
        
        setIsLoading(false);
        return;
      }

      // 3. Multi-Store mode: Apply full logic
      const profileStoreId = (profile as any)?.store_id;
      const savedStoreId = localStorage.getItem(`${STORAGE_KEY}_${tenantId}`);

      let finalStoreId: string | null = null;

      if (!canSwitchStore && profileStoreId) {
        // Branch managers are locked to their store
        finalStoreId = profileStoreId;
      } else if (savedStoreId && stores.some(s => s.id === savedStoreId)) {
        // Admin has saved preference and it's valid
        finalStoreId = savedStoreId;
      } else if (profileStoreId && stores.some(s => s.id === profileStoreId)) {
        // Use profile store_id if valid
        finalStoreId = profileStoreId;
      } else {
        // Fallback to headquarters
        const hq = stores.find(s => s.is_headquarters);
        finalStoreId = hq?.id || stores[0]?.id || null;
      }

      setActiveStoreIdState(finalStoreId);
      const store = stores.find(s => s.id === finalStoreId) || null;
      setActiveStore(store);

      console.log('[ActiveStoreContext] Multi-store mode - active store:', {
        storeId: finalStoreId,
        storeName: store?.name,
        source: !canSwitchStore && profileStoreId ? 'locked_profile' : 
                savedStoreId ? 'localStorage' : 
                profileStoreId ? 'profile' : 'headquarters_fallback'
      });

    } catch (err) {
      console.error('[ActiveStoreContext] Error determining active store:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, tenantId, profile, stores, canSwitchStore, checkMultiStoreModule]);

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
        hasMultiStore,
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
