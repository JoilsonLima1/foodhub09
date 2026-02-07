import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface MethodFeeConfig {
  percent: number;
  fixed: number;
}

export interface PlatformFeeConfig {
  id: string;
  enabled: boolean;
  mode: 'manual' | 'automatic';
  default_percent: number;
  default_fixed: number;
  per_method_config: {
    pix: MethodFeeConfig;
    credit_card: MethodFeeConfig;
    debit_card: MethodFeeConfig;
    boleto: MethodFeeConfig;
  };
  per_plan_config: {
    free: MethodFeeConfig;
    starter: MethodFeeConfig;
    professional: MethodFeeConfig;
    enterprise: MethodFeeConfig;
  };
  split_destination: string | null;
  split_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantFeeOverride {
  id: string;
  tenant_id: string;
  enabled: boolean;
  override_percent: number | null;
  override_fixed: number | null;
  per_method_override: Record<string, MethodFeeConfig> | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeAuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  ip_address: string | null;
  created_at: string;
}

export function usePlatformFees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch global platform fee config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['platform-fee-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_fee_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      
      // Cast JSON fields properly
      return {
        ...data,
        per_method_config: data.per_method_config as unknown as PlatformFeeConfig['per_method_config'],
        per_plan_config: data.per_plan_config as unknown as PlatformFeeConfig['per_plan_config'],
      } as PlatformFeeConfig;
    },
  });

  // Fetch all tenant fee overrides
  const { data: overrides, isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['tenant-fee-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_fee_overrides')
        .select(`
          *,
          tenant:tenants(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['fee-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as FeeAuditLog[];
    },
  });

  // Update platform fee config
  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<PlatformFeeConfig>) => {
      if (!config) throw new Error('Config not loaded');

      // Log the change
      const { error: auditError } = await supabase.from('fee_audit_logs').insert([{
        action: 'update',
        entity_type: 'platform_fee_config',
        entity_id: config.id,
        old_values: config as unknown as Json,
        new_values: updates as unknown as Json,
      }]);

      if (auditError) console.error('Audit log error:', auditError);

      // Prepare update payload with proper JSON types
      const updatePayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      if (updates.per_method_config) {
        updatePayload.per_method_config = updates.per_method_config as unknown;
      }
      if (updates.per_plan_config) {
        updatePayload.per_plan_config = updates.per_plan_config as unknown;
      }

      const { data, error } = await supabase
        .from('platform_fee_config')
        .update(updatePayload as Record<string, Json>)
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-config'] });
      queryClient.invalidateQueries({ queryKey: ['fee-audit-logs'] });
      toast({
        title: 'Configuração atualizada',
        description: 'As taxas da plataforma foram atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create tenant fee override
  const createOverride = useMutation({
    mutationFn: async (payload: {
      tenant_id: string;
      enabled?: boolean;
      override_percent?: number;
      override_fixed?: number;
      per_method_override?: Record<string, MethodFeeConfig>;
      notes?: string;
    }) => {
      const insertData: Record<string, unknown> = {
        tenant_id: payload.tenant_id,
        enabled: payload.enabled ?? true,
        override_percent: payload.override_percent,
        override_fixed: payload.override_fixed,
        notes: payload.notes,
      };
      
      if (payload.per_method_override) {
        insertData.per_method_override = payload.per_method_override as unknown;
      }

      const { data: result, error } = await supabase
        .from('tenant_fee_overrides')
        .insert([insertData as { tenant_id: string; [key: string]: Json | string | number | boolean | undefined }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-fee-overrides'] });
      toast({
        title: 'Override criado',
        description: 'Taxa personalizada criada para o tenant.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar override',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update tenant fee override
  const updateOverride = useMutation({
    mutationFn: async ({ id, per_method_override, ...updates }: { id: string; enabled?: boolean } & Partial<TenantFeeOverride>) => {
      const updatePayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      if (per_method_override) {
        updatePayload.per_method_override = per_method_override as unknown;
      }

      const { data, error } = await supabase
        .from('tenant_fee_overrides')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-fee-overrides'] });
      toast({
        title: 'Override atualizado',
        description: 'Taxa personalizada atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar override',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete tenant fee override
  const deleteOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_fee_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-fee-overrides'] });
      toast({
        title: 'Override removido',
        description: 'Taxa personalizada removida com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover override',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    config,
    overrides,
    auditLogs,
    isLoading: isLoadingConfig || isLoadingOverrides || isLoadingAudit,
    updateConfig,
    createOverride,
    updateOverride,
    deleteOverride,
  };
}
