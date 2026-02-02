import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { DigitalServiceGlobalConfig, TenantServiceConfig } from '@/types/digitalService';

// Global Config (Super Admin)
export function useGlobalServiceConfig() {
  return useQuery({
    queryKey: ['global-service-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('digital_service_global_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as DigitalServiceGlobalConfig | null;
    },
  });
}

export function useSaveGlobalServiceConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<DigitalServiceGlobalConfig>) => {
      const { data: existing } = await supabase
        .from('digital_service_global_config')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('digital_service_global_config')
          .update({
            ...config,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('digital_service_global_config')
          .insert(config);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-service-config'] });
      toast({ title: 'Configurações globais salvas!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Tenant Config
export function useTenantServiceConfig() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['tenant-service-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenant_service_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data as TenantServiceConfig | null;
    },
    enabled: !!tenantId,
  });
}

export function useSaveTenantServiceConfig() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<TenantServiceConfig>) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      const { data: existing } = await supabase
        .from('tenant_service_config')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('tenant_service_config')
          .update({
            ...config,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_service_config')
          .insert({
            tenant_id: tenantId,
            ...config,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-service-config'] });
      toast({ title: 'Configurações salvas!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Exit Validations
export function useExitValidations(comandaId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['exit-validations', tenantId, comandaId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('exit_validations')
        .select(`
          *,
          participant:comanda_participants(
            *,
            customer:customer_registrations(id, full_name, phone)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (comandaId) {
        query = query.eq('comanda_id', comandaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useValidateExit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      validationId,
      method,
      approved,
      denialReason,
    }: {
      validationId: string;
      method: 'waiter' | 'cashier' | 'admin';
      approved: boolean;
      denialReason?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status: approved ? 'approved' : 'denied',
        validated_at: new Date().toISOString(),
        validated_by: user?.id,
        validation_method: method,
      };

      if (method === 'waiter') updateData.waiter_confirmed = true;
      if (method === 'cashier') updateData.cashier_confirmed = true;
      if (method === 'admin') updateData.admin_override = true;
      if (denialReason) updateData.denial_reason = denialReason;

      const { error } = await supabase
        .from('exit_validations')
        .update(updateData)
        .eq('id', validationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exit-validations'] });
      toast({ title: 'Validação processada!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro na validação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useGenerateExitQRCode() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      comandaId,
      participantId,
    }: {
      comandaId: string;
      participantId?: string;
    }) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      // Generate unique QR code
      const qrCode = `EXIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { data, error } = await supabase
        .from('exit_validations')
        .insert({
          tenant_id: tenantId,
          comanda_id: comandaId,
          participant_id: participantId,
          qr_code: qrCode,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exit-validations'] });
      toast({ title: 'QR Code de saída gerado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao gerar QR Code',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
