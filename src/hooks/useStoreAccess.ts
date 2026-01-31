import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StoreAccess {
  store_id: string;
  store_name: string;
  store_code: string;
  is_headquarters: boolean;
  is_active: boolean;
  access_level: string;
}

interface UseStoreAccessReturn {
  allowedStores: StoreAccess[];
  isLoading: boolean;
  hasAccess: (storeId: string) => boolean;
  refetch: () => Promise<void>;
}

export function useStoreAccess(): UseStoreAccessReturn {
  const { user, tenantId, hasRole } = useAuth();
  const [allowedStores, setAllowedStores] = useState<StoreAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = hasRole('admin') || hasRole('super_admin');

  const fetchAllowedStores = useCallback(async () => {
    if (!user?.id || !tenantId) {
      setAllowedStores([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Use the database function to get allowed stores
      const { data, error } = await supabase.rpc('get_user_allowed_stores', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useStoreAccess] Error fetching allowed stores:', error);
        setAllowedStores([]);
      } else {
        console.log('[useStoreAccess] Allowed stores:', data?.length || 0);
        setAllowedStores(data || []);
      }
    } catch (err) {
      console.error('[useStoreAccess] Exception:', err);
      setAllowedStores([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tenantId]);

  useEffect(() => {
    fetchAllowedStores();
  }, [fetchAllowedStores]);

  const hasAccess = useCallback((storeId: string): boolean => {
    if (isAdmin) return true;
    return allowedStores.some(s => s.store_id === storeId);
  }, [allowedStores, isAdmin]);

  return {
    allowedStores,
    isLoading,
    hasAccess,
    refetch: fetchAllowedStores,
  };
}

/**
 * Get store access for a specific user (admin use)
 */
export async function getUserStoreAccess(userId: string, tenantId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('store_user_access')
      .select('store_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[getUserStoreAccess] Error:', error);
      return [];
    }

    return data?.map(d => d.store_id) || [];
  } catch (err) {
    console.error('[getUserStoreAccess] Exception:', err);
    return [];
  }
}

/**
 * Update store access for a user (admin use)
 */
export async function updateUserStoreAccess(
  userId: string,
  tenantId: string,
  storeIds: string[],
  accessLevel: string = 'standard'
): Promise<boolean> {
  try {
    // Delete existing access
    const { error: deleteError } = await supabase
      .from('store_user_access')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      console.error('[updateUserStoreAccess] Delete error:', deleteError);
      return false;
    }

    // Insert new access records if any stores selected
    if (storeIds.length > 0) {
      const records = storeIds.map(store_id => ({
        user_id: userId,
        tenant_id: tenantId,
        store_id,
        access_level: accessLevel,
      }));

      const { error: insertError } = await supabase
        .from('store_user_access')
        .insert(records);

      if (insertError) {
        console.error('[updateUserStoreAccess] Insert error:', insertError);
        return false;
      }
    }

    console.log('[updateUserStoreAccess] Updated store access for user:', userId, 'stores:', storeIds.length);
    return true;
  } catch (err) {
    console.error('[updateUserStoreAccess] Exception:', err);
    return false;
  }
}
