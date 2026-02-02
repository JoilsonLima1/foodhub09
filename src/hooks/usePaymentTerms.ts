import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface PaymentTermsClause {
  id: string;
  title: string;
  content: string;
}

export interface PaymentTerms {
  id: string;
  version: string;
  title: string;
  content: string;
  clauses: PaymentTermsClause[];
  is_active: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTermsAcceptance {
  id: string;
  tenant_id: string;
  terms_id: string;
  terms_version: string;
  accepted_by: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export function usePaymentTerms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  // Fetch all payment terms (super admin)
  const { data: allTerms, isLoading: isLoadingAll } = useQuery({
    queryKey: ['payment-terms-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_terms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(item => ({
        ...item,
        clauses: item.clauses as unknown as PaymentTermsClause[],
      })) as PaymentTerms[];
    },
  });

  // Fetch active payment terms
  const { data: activeTerms, isLoading: isLoadingActive } = useQuery({
    queryKey: ['payment-terms-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_terms')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      
      return {
        ...data,
        clauses: data.clauses as unknown as PaymentTermsClause[],
      } as PaymentTerms;
    },
  });

  // Check if current tenant has accepted active terms
  const { data: acceptance, isLoading: isLoadingAcceptance } = useQuery({
    queryKey: ['payment-terms-acceptance', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;

      const { data, error } = await supabase
        .from('payment_terms_acceptance')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PaymentTermsAcceptance | null;
    },
    enabled: !!profile?.tenant_id,
  });

  // Check if tenant needs to accept terms
  const needsAcceptance = activeTerms && (!acceptance || acceptance.terms_version !== activeTerms.version);

  // Create new payment terms version (super admin)
  const createTerms = useMutation({
    mutationFn: async (payload: {
      version: string;
      title: string;
      content: string;
      clauses: PaymentTermsClause[];
      is_active?: boolean;
    }) => {
      // If this will be active, deactivate others first
      if (payload.is_active) {
        await supabase
          .from('payment_terms')
          .update({ is_active: false })
          .eq('is_active', true);
      }

      const { data: result, error } = await supabase
        .from('payment_terms')
        .insert([{
          version: payload.version,
          title: payload.title,
          content: payload.content,
          clauses: payload.clauses as unknown as Json,
          is_active: payload.is_active,
          published_at: payload.is_active ? new Date().toISOString() : null,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['payment-terms-active'] });
      toast({
        title: 'Termos criados',
        description: 'Nova versão dos termos de pagamento criada.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar termos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update payment terms (super admin)
  const updateTerms = useMutation({
    mutationFn: async ({ id, clauses, ...updates }: { id: string } & Partial<PaymentTerms>) => {
      // If activating this version, deactivate others
      if (updates.is_active) {
        await supabase
          .from('payment_terms')
          .update({ is_active: false })
          .neq('id', id);
          
        updates.published_at = new Date().toISOString();
      }

      const updatePayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      if (clauses) {
        updatePayload.clauses = clauses as unknown;
      }

      const { data, error } = await supabase
        .from('payment_terms')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['payment-terms-active'] });
      toast({
        title: 'Termos atualizados',
        description: 'Termos de pagamento atualizados com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar termos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Accept payment terms (tenant admin)
  const acceptTerms = useMutation({
    mutationFn: async () => {
      if (!user || !profile?.tenant_id || !activeTerms) {
        throw new Error('Dados insuficientes para aceitar termos');
      }

      const { data, error } = await supabase
        .from('payment_terms_acceptance')
        .insert({
          tenant_id: profile.tenant_id,
          terms_id: activeTerms.id,
          terms_version: activeTerms.version,
          accepted_by: user.id,
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms-acceptance'] });
      toast({
        title: 'Termos aceitos',
        description: 'Você aceitou os termos de pagamento.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao aceitar termos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    allTerms,
    activeTerms,
    acceptance,
    needsAcceptance,
    isLoading: isLoadingAll || isLoadingActive || isLoadingAcceptance,
    createTerms,
    updateTerms,
    acceptTerms,
  };
}
