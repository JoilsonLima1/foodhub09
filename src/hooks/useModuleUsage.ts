/**
 * useModuleUsage Hook
 * 
 * Tracks and enforces module usage limits per tenant per month.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UsageLimitResult {
  allowed: boolean;
  limit: number;  // -1 = unlimited
  used: number;
  remaining: number;  // -1 = unlimited
}

export interface ModuleUsageInfo {
  moduleSlug: string;
  limits: Record<string, UsageLimitResult>;
  isLoading: boolean;
}

/**
 * Hook to check and manage usage limits for a module
 */
export function useModuleUsage(moduleSlug: string, limitKeys: string[] = []) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current usage for all limit keys
  const { data: limits, isLoading, refetch } = useQuery({
    queryKey: ['module-usage', tenantId, moduleSlug, limitKeys],
    queryFn: async () => {
      if (!tenantId) return {};

      const results: Record<string, UsageLimitResult> = {};

      for (const key of limitKeys) {
        const { data, error } = await supabase.rpc('check_module_limit', {
          p_tenant_id: tenantId,
          p_module_slug: moduleSlug,
          p_limit_key: key,
        });

        if (error) {
          console.error(`Error checking ${key} limit:`, error);
          // Default to allowed if check fails
          results[key] = { allowed: true, limit: -1, used: 0, remaining: -1 };
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
          const jsonData = data as Record<string, unknown>;
          results[key] = {
            allowed: Boolean(jsonData.allowed),
            limit: Number(jsonData.limit ?? -1),
            used: Number(jsonData.used ?? 0),
            remaining: Number(jsonData.remaining ?? -1),
          };
        } else {
          results[key] = { allowed: true, limit: -1, used: 0, remaining: -1 };
        }
      }

      return results;
    },
    enabled: !!tenantId && limitKeys.length > 0,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Mutation to increment usage
  const incrementUsage = useMutation({
    mutationFn: async (limitKey: string) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase.rpc('increment_module_usage', {
        p_tenant_id: tenantId,
        p_module_slug: moduleSlug,
        p_usage_key: limitKey,
      });

      if (error) throw error;
      
      // Parse JSON response
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const jsonData = data as Record<string, unknown>;
        return {
          success: Boolean(jsonData.success),
          new_count: Number(jsonData.new_count ?? 0),
          limit: Number(jsonData.limit ?? -1),
          remaining: Number(jsonData.remaining ?? -1),
          error: jsonData.error as string | undefined,
        };
      }
      return { success: false, error: 'invalid_response', new_count: 0, limit: -1, remaining: -1 };
    },
    onSuccess: (data) => {
      // Refetch to update UI
      queryClient.invalidateQueries({ queryKey: ['module-usage', tenantId, moduleSlug] });
      
      if (!data.success) {
        toast({
          title: 'Limite atingido',
          description: 'Você atingiu o limite mensal para esta funcionalidade. Faça upgrade para continuar.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Error incrementing usage:', error);
    },
  });

  /**
   * Check if a specific action is allowed
   */
  const canPerformAction = (limitKey: string): boolean => {
    if (!limits || !limits[limitKey]) return true; // Default to allowed
    return limits[limitKey].allowed;
  };

  /**
   * Get remaining count for a limit key
   */
  const getRemaining = (limitKey: string): number => {
    if (!limits || !limits[limitKey]) return -1;
    return limits[limitKey].remaining;
  };

  /**
   * Get limit value for a limit key
   */
  const getLimit = (limitKey: string): number => {
    if (!limits || !limits[limitKey]) return -1;
    return limits[limitKey].limit;
  };

  /**
   * Get current usage for a limit key
   */
  const getUsed = (limitKey: string): number => {
    if (!limits || !limits[limitKey]) return 0;
    return limits[limitKey].used;
  };

  /**
   * Check if a limit is unlimited
   */
  const isUnlimited = (limitKey: string): boolean => {
    if (!limits || !limits[limitKey]) return true;
    return limits[limitKey].limit === -1;
  };

  /**
   * Try to perform an action - checks limit and increments if allowed
   */
  const tryPerformAction = async (limitKey: string): Promise<boolean> => {
    if (!canPerformAction(limitKey)) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite mensal para esta funcionalidade.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await incrementUsage.mutateAsync(limitKey);
      return result.success;
    } catch {
      return false;
    }
  };

  return {
    limits: limits || {},
    isLoading,
    canPerformAction,
    getRemaining,
    getLimit,
    getUsed,
    isUnlimited,
    tryPerformAction,
    incrementUsage,
    refetch,
  };
}

/**
 * Hook to fetch plan limits configuration (for Super Admin)
 */
export function useModulePlanLimits(moduleSlug?: string) {
  const { data: planLimits, isLoading, refetch } = useQuery({
    queryKey: ['module-plan-limits', moduleSlug],
    queryFn: async () => {
      let query = supabase
        .from('module_plan_limits')
        .select(`
          *,
          plan:subscription_plans(id, name)
        `)
        .order('module_slug')
        .order('limit_key');

      if (moduleSlug) {
        query = query.eq('module_slug', moduleSlug);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateLimit = useMutation({
    mutationFn: async ({ id, limit_value }: { id: string; limit_value: number }) => {
      const { error } = await supabase
        .from('module_plan_limits')
        .update({ limit_value, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-plan-limits'] });
      toast({ title: 'Limite atualizado' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar limite', description: error.message, variant: 'destructive' });
    },
  });

  const createLimit = useMutation({
    mutationFn: async (data: { module_slug: string; plan_id: string; limit_key: string; limit_value: number }) => {
      const { error } = await supabase
        .from('module_plan_limits')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-plan-limits'] });
      toast({ title: 'Limite criado' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar limite', description: error.message, variant: 'destructive' });
    },
  });

  return {
    planLimits,
    isLoading,
    updateLimit,
    createLimit,
    refetch,
  };
}
