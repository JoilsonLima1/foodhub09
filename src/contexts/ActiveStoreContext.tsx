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
  activeStoreName: string | null;
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
  const checkMultiStoreModule = useCallback(async (): Promise<boolean> => {
    if (!tenantId) {
      console.log('[ActiveStoreContext] No tenantId, skipping module check');
      return false;
    }

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

      const hasModule = (data?.length || 0) > 0;
      console.log('[ActiveStoreContext] Multi-store module check:', { tenantId, hasModule });
      return hasModule;
    } catch (err) {
      console.error('[ActiveStoreContext] Exception checking module:', err);
      return false;
    }
  }, [tenantId]);

  const fetchStores = useCallback(async () => {
    if (!tenantId) {
      console.log('[ActiveStoreContext] No tenantId, clearing stores');
      setStores([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[ActiveStoreContext] Fetching stores for tenant:', tenantId);
      
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, code, is_headquarters, is_active')
        .eq('tenant_id', tenantId)
        .order('is_headquarters', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ActiveStoreContext] Error fetching stores:', error);
        setStores([]);
      } else {
        console.log('[ActiveStoreContext] Stores fetched:', {
          count: data?.length || 0,
          stores: data?.map(s => ({ id: s.id, name: s.name, isHQ: s.is_headquarters }))
        });
        setStores(data || []);
      }
    } catch (err) {
      console.error('[ActiveStoreContext] Exception fetching stores:', err);
      setStores([]);
    }
  }, [tenantId]);

  // Ensure headquarters store exists for the tenant
  const ensureHeadquarters = useCallback(async (): Promise<Store | null> => {
    if (!tenantId) return null;

    try {
      console.log('[ActiveStoreContext] Ensuring headquarters exists for tenant:', tenantId);
      
      // Call the database function to ensure HQ exists
      const { data: storeId, error } = await supabase.rpc('ensure_headquarters_store', {
        p_tenant_id: tenantId
      });

      if (error) {
        console.error('[ActiveStoreContext] Error ensuring headquarters:', error);
        return null;
      }

      console.log('[ActiveStoreContext] Headquarters store ID:', storeId);

      // Fetch the store details
      const { data: store, error: fetchError } = await supabase
        .from('stores')
        .select('id, name, code, is_headquarters, is_active')
        .eq('id', storeId)
        .single();

      if (fetchError) {
        console.error('[ActiveStoreContext] Error fetching headquarters:', fetchError);
        return null;
      }

      return store;
    } catch (err) {
      console.error('[ActiveStoreContext] Exception ensuring headquarters:', err);
      return null;
    }
  }, [tenantId]);

  const determineActiveStore = useCallback(async () => {
    console.log('[ActiveStoreContext] === DETERMINING ACTIVE STORE ===');
    console.log('[ActiveStoreContext] Context:', { 
      user: user?.id, 
      tenantId, 
      storesCount: stores.length,
      roles 
    });

    if (!user || !tenantId) {
      console.log('[ActiveStoreContext] No user or tenant, clearing state');
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

      console.log('[ActiveStoreContext] Module status:', { 
        hasMultiStore: moduleActive,
        storesAvailable: stores.length 
      });

      // 2. If no stores exist, ensure headquarters is created
      let availableStores = stores;
      if (stores.length === 0) {
        console.log('[ActiveStoreContext] No stores found, ensuring headquarters...');
        const hqStore = await ensureHeadquarters();
        if (hqStore) {
          availableStores = [hqStore];
          setStores([hqStore]);
          console.log('[ActiveStoreContext] Headquarters created:', hqStore.name);
        }
      }

      // 3. Determine the active store
      let finalStoreId: string | null = null;
      let source = 'unknown';

      if (!moduleActive) {
        // SINGLE-STORE MODE: Just use the first store (headquarters)
        const hq = availableStores.find(s => s.is_headquarters) || availableStores[0] || null;
        
        if (hq) {
          finalStoreId = hq.id;
          source = 'single_store_hq';
          console.log('[ActiveStoreContext] SINGLE-STORE MODE - using:', { 
            id: hq.id, 
            name: hq.name,
            isHQ: hq.is_headquarters 
          });
        } else {
          console.warn('[ActiveStoreContext] SINGLE-STORE MODE - no store available!');
        }
      } else {
        // MULTI-STORE MODE: Apply full logic
        const profileStoreId = (profile as any)?.store_id;
        const savedStoreId = localStorage.getItem(`${STORAGE_KEY}_${tenantId}`);

        console.log('[ActiveStoreContext] MULTI-STORE MODE - checking sources:', {
          profileStoreId,
          savedStoreId,
          canSwitchStore
        });

        if (!canSwitchStore && profileStoreId) {
          // Branch managers are locked to their store
          finalStoreId = profileStoreId;
          source = 'locked_profile';
        } else if (savedStoreId && availableStores.some(s => s.id === savedStoreId)) {
          // Admin has saved preference and it's valid
          finalStoreId = savedStoreId;
          source = 'localStorage';
        } else if (profileStoreId && availableStores.some(s => s.id === profileStoreId)) {
          // Use profile store_id if valid
          finalStoreId = profileStoreId;
          source = 'profile';
        } else {
          // Fallback to headquarters
          const hq = availableStores.find(s => s.is_headquarters);
          finalStoreId = hq?.id || availableStores[0]?.id || null;
          source = 'headquarters_fallback';
        }
      }

      setActiveStoreIdState(finalStoreId);
      const store = availableStores.find(s => s.id === finalStoreId) || null;
      setActiveStore(store);

      console.log('[ActiveStoreContext] === FINAL RESULT ===');
      console.log('[ActiveStoreContext] Active store determined:', {
        activeStoreId: finalStoreId,
        storeName: store?.name || 'NONE',
        isHeadquarters: store?.is_headquarters,
        isActive: store?.is_active,
        source,
        hasMultiStore: moduleActive
      });

    } catch (err) {
      console.error('[ActiveStoreContext] Error determining active store:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, tenantId, profile, stores, canSwitchStore, checkMultiStoreModule, ensureHeadquarters, roles]);

  // Fetch stores when tenant changes
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Determine active store when stores or profile changes
  useEffect(() => {
    // Run determination even if stores is empty - we'll create HQ if needed
    if (tenantId) {
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
        activeStoreName: activeStore?.name || null,
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
