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

interface AllowedStore {
  store_id: string;
  store_name: string;
  store_code: string;
  is_headquarters: boolean;
  is_active: boolean;
  access_level: string;
}

interface ActiveStoreContextType {
  activeStoreId: string | null;
  activeStore: Store | null;
  activeStoreName: string | null;
  stores: Store[];
  allowedStores: Store[];
  isLoading: boolean;
  canSwitchStore: boolean;
  hasMultiStore: boolean;
  hasNoStoreAccess: boolean;
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
  const [allowedStores, setAllowedStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMultiStore, setHasMultiStore] = useState(false);
  const [hasNoStoreAccess, setHasNoStoreAccess] = useState(false);

  // Admin/super_admin can switch stores
  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  const canSwitchStore = isAdmin;

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

  // Fetch all stores for the tenant
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

  // Fetch allowed stores for the current user
  const fetchAllowedStores = useCallback(async (): Promise<Store[]> => {
    if (!user?.id || !tenantId) {
      return [];
    }

    try {
      console.log('[ActiveStoreContext] Fetching allowed stores for user:', user.id);
      
      const { data, error } = await supabase.rpc('get_user_allowed_stores', {
        _user_id: user.id
      });

      if (error) {
        console.error('[ActiveStoreContext] Error fetching allowed stores:', error);
        return [];
      }

      const allowed: Store[] = (data || []).map((s: AllowedStore) => ({
        id: s.store_id,
        name: s.store_name,
        code: s.store_code,
        is_headquarters: s.is_headquarters,
        is_active: s.is_active,
      }));

      console.log('[ActiveStoreContext] Allowed stores:', allowed.length);
      return allowed;
    } catch (err) {
      console.error('[ActiveStoreContext] Exception fetching allowed stores:', err);
      return [];
    }
  }, [user?.id, tenantId]);

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
      setAllowedStores([]);
      setHasNoStoreAccess(false);
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

      // 3. Fetch allowed stores for the user
      const userAllowedStores = await fetchAllowedStores();
      setAllowedStores(userAllowedStores);

      console.log('[ActiveStoreContext] User allowed stores:', userAllowedStores.length);

      // 4. Check if user has no store access (non-admin with no explicit access)
      if (!isAdmin && userAllowedStores.length === 0 && moduleActive) {
        console.warn('[ActiveStoreContext] User has no store access!');
        setHasNoStoreAccess(true);
        setActiveStoreIdState(null);
        setActiveStore(null);
        setIsLoading(false);
        return;
      }

      setHasNoStoreAccess(false);

      // 5. Determine which stores the user can actually use
      const effectiveStores = isAdmin 
        ? availableStores 
        : (userAllowedStores.length > 0 ? userAllowedStores : availableStores);

      // 6. Determine the active store
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
        // MULTI-STORE MODE: Apply full logic with allowed stores filter
        const profileStoreId = (profile as any)?.store_id;
        const savedStoreId = localStorage.getItem(`${STORAGE_KEY}_${tenantId}`);

        console.log('[ActiveStoreContext] MULTI-STORE MODE - checking sources:', {
          profileStoreId,
          savedStoreId,
          canSwitchStore,
          effectiveStoresCount: effectiveStores.length
        });

        if (!canSwitchStore && profileStoreId && effectiveStores.some(s => s.id === profileStoreId)) {
          // Non-admins are locked to their assigned store
          finalStoreId = profileStoreId;
          source = 'locked_profile';
        } else if (savedStoreId && effectiveStores.some(s => s.id === savedStoreId)) {
          // Use saved preference if valid within allowed stores
          finalStoreId = savedStoreId;
          source = 'localStorage';
        } else if (profileStoreId && effectiveStores.some(s => s.id === profileStoreId)) {
          // Use profile store_id if valid
          finalStoreId = profileStoreId;
          source = 'profile';
        } else if (effectiveStores.length > 0) {
          // Fallback to headquarters or first allowed store
          const hq = effectiveStores.find(s => s.is_headquarters);
          finalStoreId = hq?.id || effectiveStores[0]?.id || null;
          source = 'headquarters_fallback';
        }
      }

      setActiveStoreIdState(finalStoreId);
      const store = effectiveStores.find(s => s.id === finalStoreId) || null;
      setActiveStore(store);

      console.log('[ActiveStoreContext] === FINAL RESULT ===');
      console.log('[ActiveStoreContext] Active store determined:', {
        activeStoreId: finalStoreId,
        storeName: store?.name || 'NONE',
        isHeadquarters: store?.is_headquarters,
        isActive: store?.is_active,
        source,
        hasMultiStore: moduleActive,
        allowedStoresCount: userAllowedStores.length
      });

    } catch (err) {
      console.error('[ActiveStoreContext] Error determining active store:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, tenantId, profile, stores, canSwitchStore, isAdmin, checkMultiStoreModule, ensureHeadquarters, fetchAllowedStores, roles]);

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

    // Validate the store is in allowed stores (or all stores for admins)
    const effectiveStores = isAdmin ? stores : allowedStores;
    if (!effectiveStores.some(s => s.id === storeId)) {
      console.warn('[ActiveStoreContext] Store not in allowed list:', storeId);
      return;
    }

    setActiveStoreIdState(storeId);
    const store = effectiveStores.find(s => s.id === storeId) || null;
    setActiveStore(store);

    // Save to localStorage for persistence
    if (tenantId) {
      localStorage.setItem(`${STORAGE_KEY}_${tenantId}`, storeId);
    }

    console.log('[ActiveStoreContext] Store switched to:', store?.name);
  }, [canSwitchStore, isAdmin, stores, allowedStores, tenantId]);

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
        allowedStores,
        isLoading,
        canSwitchStore,
        hasMultiStore,
        hasNoStoreAccess,
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
