import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Partner {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  document: string | null;
  is_active: boolean;
  max_tenants: number;
  max_users_per_tenant: number;
  revenue_share_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerBranding {
  id: string;
  partner_id: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  platform_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
}

export interface PartnerDomain {
  id: string;
  partner_id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  verification_token: string | null;
  verified_at: string | null;
  ssl_status: string;
  created_at: string;
}

export interface PartnerPlan {
  id: string;
  partner_id: string;
  base_plan_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  currency: string;
  max_users: number | null;
  max_products: number | null;
  max_orders_per_month: number | null;
  included_modules: string[];
  is_active: boolean;
  display_order: number;
}

export interface PartnerTenant {
  id: string;
  partner_id: string;
  tenant_id: string;
  partner_plan_id: string | null;
  status: string;
  joined_at: string;
  next_billing_date: string | null;
  billing_notes: string | null;
  tenant?: {
    id: string;
    name: string;
  };
}

export interface PartnerWithStats extends Partner {
  branding?: PartnerBranding;
  domains?: PartnerDomain[];
  tenant_count?: number;
}

export function usePartners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select(`
          *,
          partner_branding(*),
          partner_domains(*),
          partner_tenants(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        branding: p.partner_branding?.[0] || p.partner_branding,
        domains: p.partner_domains || [],
        tenant_count: p.partner_tenants?.[0]?.count || 0,
      })) as PartnerWithStats[];
    },
  });

  const createPartner = useMutation({
    mutationFn: async (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at' | 'is_active'> & { is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('partners')
        .insert({
          name: partner.name,
          slug: partner.slug,
          email: partner.email,
          phone: partner.phone || null,
          document: partner.document || null,
          max_tenants: partner.max_tenants,
          max_users_per_tenant: partner.max_users_per_tenant,
          revenue_share_percent: partner.revenue_share_percent,
          notes: partner.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default branding
      await supabase.from('partner_branding').insert({
        partner_id: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: 'Parceiro criado com sucesso' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar parceiro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePartner = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Partner> & { id: string }) => {
      const { error } = await supabase
        .from('partners')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: 'Parceiro atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: 'Parceiro removido' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stats = {
    total: partners.length,
    active: partners.filter((p) => p.is_active).length,
    totalTenants: partners.reduce((sum, p) => sum + (p.tenant_count || 0), 0),
  };

  return {
    partners,
    isLoading,
    stats,
    createPartner,
    updatePartner,
    deletePartner,
  };
}

export function usePartnerBranding(partnerId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery({
    queryKey: ['partner-branding', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_branding')
        .select('*')
        .eq('partner_id', partnerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as PartnerBranding | null;
    },
    enabled: !!partnerId,
  });

  const updateBranding = useMutation({
    mutationFn: async (updates: Partial<PartnerBranding>) => {
      const { error } = await supabase
        .from('partner_branding')
        .upsert({
          partner_id: partnerId,
          ...updates,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-branding', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: 'Branding atualizado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar branding',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { branding, isLoading, updateBranding };
}

export function usePartnerDomains(partnerId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['partner-domains', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_domains')
        .select('*')
        .eq('partner_id', partnerId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data as PartnerDomain[];
    },
    enabled: !!partnerId,
  });

  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      const token = crypto.randomUUID().split('-')[0];
      
      const { error } = await supabase.from('partner_domains').insert({
        partner_id: partnerId,
        domain,
        verification_token: token,
      });

      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-domains', partnerId] });
      toast({ title: 'Domínio adicionado', description: 'Configure os registros DNS para verificar.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar domínio',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const verifyDomain = useMutation({
    mutationFn: async (domainId: string) => {
      // In production, this would check DNS records
      const { error } = await supabase
        .from('partner_domains')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          ssl_status: 'active',
        })
        .eq('id', domainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-domains', partnerId] });
      toast({ title: 'Domínio verificado!' });
    },
  });

  const setPrimary = useMutation({
    mutationFn: async (domainId: string) => {
      // Remove primary from all
      await supabase
        .from('partner_domains')
        .update({ is_primary: false })
        .eq('partner_id', partnerId);

      // Set new primary
      const { error } = await supabase
        .from('partner_domains')
        .update({ is_primary: true })
        .eq('id', domainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-domains', partnerId] });
      toast({ title: 'Domínio principal definido' });
    },
  });

  const deleteDomain = useMutation({
    mutationFn: async (domainId: string) => {
      const { error } = await supabase.from('partner_domains').delete().eq('id', domainId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-domains', partnerId] });
      toast({ title: 'Domínio removido' });
    },
  });

  return { domains, isLoading, addDomain, verifyDomain, setPrimary, deleteDomain };
}

export function usePartnerTenants(partnerId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['partner-tenants', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_tenants')
        .select(`
          *,
          tenant:tenants(id, name)
        `)
        .eq('partner_id', partnerId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data as PartnerTenant[];
    },
    enabled: !!partnerId,
  });

  const updateTenantStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('partner_tenants')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-tenants', partnerId] });
      toast({ title: 'Status atualizado' });
    },
  });

  return { tenants, isLoading, updateTenantStatus };
}
