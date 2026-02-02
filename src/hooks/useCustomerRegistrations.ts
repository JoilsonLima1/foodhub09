import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { CustomerRegistration, CustomerRegistrationType } from '@/types/digitalService';

export function useCustomerRegistrations(registrationType?: CustomerRegistrationType) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['customer-registrations', tenantId, registrationType],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('customer_registrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (registrationType) {
        query = query.eq('registration_type', registrationType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerRegistration[];
    },
    enabled: !!tenantId,
  });
}

export function useCustomerRegistration(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-registration', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await supabase
        .from('customer_registrations')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data as CustomerRegistration;
    },
    enabled: !!customerId,
  });
}

export function useSearchCustomer() {
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (searchTerm: string) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      const { data, error } = await supabase
        .from('customer_registrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`phone.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data as CustomerRegistration[];
    },
  });
}

export function useRegisterCustomer() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      fullName: string;
      phone: string;
      email?: string;
      registrationType?: CustomerRegistrationType;
      cpf?: string;
      selfieUrl?: string;
      documentUrl?: string;
      documentType?: 'rg' | 'cnh';
    }) => {
      if (!tenantId) throw new Error('Tenant não configurado');

      // Check if customer already exists by phone
      const { data: existing } = await supabase
        .from('customer_registrations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('phone', input.phone)
        .maybeSingle();

      if (existing) {
        throw new Error('Cliente já cadastrado com este telefone');
      }

      const { data, error } = await supabase
        .from('customer_registrations')
        .insert({
          tenant_id: tenantId,
          full_name: input.fullName,
          phone: input.phone,
          email: input.email,
          registration_type: input.registrationType || 'simple',
          cpf: input.cpf,
          selfie_url: input.selfieUrl,
          document_url: input.documentUrl,
          document_type: input.documentType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-registrations'] });
      toast({ title: 'Cliente cadastrado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao cadastrar cliente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpgradeToCompleteRegistration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      cpf,
      selfieUrl,
      documentUrl,
      documentType,
    }: {
      customerId: string;
      cpf: string;
      selfieUrl: string;
      documentUrl: string;
      documentType: 'rg' | 'cnh';
    }) => {
      const { error } = await supabase
        .from('customer_registrations')
        .update({
          registration_type: 'complete',
          cpf,
          selfie_url: selfieUrl,
          document_url: documentUrl,
          document_type: documentType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-registration'] });
      toast({ title: 'Cadastro atualizado para completo!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar cadastro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useVerifyCustomer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      verified,
      notes,
    }: {
      customerId: string;
      verified: boolean;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('customer_registrations')
        .update({
          is_verified: verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? user?.id : null,
          verification_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-registration'] });
      toast({ title: verified ? 'Cliente verificado!' : 'Verificação removida' });
    },
    onError: (error) => {
      toast({
        title: 'Erro na verificação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
