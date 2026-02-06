import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrganizationDomain {
  id: string;
  tenant_id: string;
  domain: string;
  domain_type: 'subdomain' | 'custom';
  is_primary: boolean;
  is_verified: boolean;
  verification_token: string | null;
  verification_method: 'dns_txt' | 'dns_cname' | 'file';
  ssl_status: 'pending' | 'issuing' | 'active' | 'failed';
  dns_configured: boolean;
  last_checked_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  tenant?: {
    name: string;
  };
}

export function useOrganizationDomains(tenantId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: domains = [], isLoading, refetch } = useQuery({
    queryKey: ['organization-domains', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('organization_domains')
        .select(`
          *,
          tenant:tenants(name)
        `)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OrganizationDomain[];
    },
  });

  const addDomain = useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      domain: string;
      domain_type: 'subdomain' | 'custom';
      is_primary?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('organization_domains')
        .insert({
          tenant_id: input.tenant_id,
          domain: input.domain.toLowerCase().trim(),
          domain_type: input.domain_type,
          is_primary: input.is_primary || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domains'] });
      toast({
        title: 'Domínio adicionado',
        description: 'O domínio foi adicionado com sucesso. Configure o DNS para verificá-lo.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar domínio',
        description: error.message.includes('duplicate') 
          ? 'Este domínio já está cadastrado no sistema.'
          : error.message,
        variant: 'destructive',
      });
    },
  });

  const updateDomain = useMutation({
    mutationFn: async (input: {
      id: string;
      is_primary?: boolean;
      is_verified?: boolean;
      dns_configured?: boolean;
      ssl_status?: 'pending' | 'issuing' | 'active' | 'failed';
    }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('organization_domains')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domains'] });
      toast({
        title: 'Domínio atualizado',
        description: 'As configurações do domínio foram atualizadas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar domínio',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteDomain = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organization_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domains'] });
      toast({
        title: 'Domínio removido',
        description: 'O domínio foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover domínio',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const verifyDomain = useMutation({
    mutationFn: async (id: string) => {
      // Simulate DNS verification check
      const { data, error } = await supabase
        .from('organization_domains')
        .update({
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domains'] });
      toast({
        title: 'Verificação iniciada',
        description: 'O DNS do domínio está sendo verificado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na verificação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const setPrimary = useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      // First, remove primary from all other domains for this tenant
      await supabase
        .from('organization_domains')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId);

      // Then set the selected domain as primary
      const { data, error } = await supabase
        .from('organization_domains')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domains'] });
      toast({
        title: 'Domínio principal definido',
        description: 'Este domínio agora é o principal da organização.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao definir domínio principal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    domains,
    isLoading,
    refetch,
    addDomain,
    updateDomain,
    deleteDomain,
    verifyDomain,
    setPrimary,
  };
}
