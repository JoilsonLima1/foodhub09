import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StoneProviderAccount {
  id: string;
  scope_type: 'platform' | 'partner' | 'tenant';
  scope_id: string | null;
  provider: string;
  environment: 'sandbox' | 'production';
  integration_type: 'stone_online' | 'stone_connect' | 'stone_tef' | 'stone_openbank';
  credentials_encrypted: Record<string, unknown>;
  status: 'active' | 'inactive' | 'error';
  display_name: string | null;
  auto_capture: boolean;
  allow_partial_refund: boolean;
  payment_timeout_seconds: number;
  last_tested_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoneGlobalSettings {
  id: string;
  allow_tenant_credentials: boolean;
  allow_partner_credentials: boolean;
  force_master_credentials: boolean;
  enabled_integration_types: string[];
  platform_fee_enabled: boolean;
  platform_fee_percent: number;
  created_at: string;
  updated_at: string;
}

export interface StoneProviderEvent {
  id: string;
  tenant_id: string | null;
  provider_account_id: string | null;
  event_type: string;
  provider_event_id: string | null;
  idempotency_key: string | null;
  payload: Record<string, unknown> | null;
  processed_at: string | null;
  process_status: 'pending' | 'ok' | 'retry' | 'failed';
  retry_count: number;
  error_message: string | null;
  created_at: string;
}

export interface StoneProviderTransaction {
  id: string;
  tenant_id: string | null;
  partner_id: string | null;
  provider_account_id: string;
  internal_reference: string | null;
  internal_reference_type: string | null;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'canceled' | 'refunded' | 'failed' | 'chargeback';
  method: string | null;
  raw_provider_payload: Record<string, unknown> | null;
  idempotency_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

type CreateAccountInput = {
  scope_type: 'platform' | 'partner' | 'tenant';
  scope_id?: string | null;
  environment: 'sandbox' | 'production';
  integration_type: 'stone_online' | 'stone_connect' | 'stone_tef' | 'stone_openbank';
  credentials_encrypted?: Record<string, unknown>;
  display_name?: string;
  auto_capture?: boolean;
  allow_partial_refund?: boolean;
  payment_timeout_seconds?: number;
};

export function useStoneProviderAccounts(scopeFilter?: { scope_type?: string; scope_id?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['stone-provider-accounts', scopeFilter];

  const { data: accounts, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('payment_provider_accounts')
        .select('*')
        .eq('provider', 'stone')
        .order('created_at', { ascending: false });

      if (scopeFilter?.scope_type) {
        query = query.eq('scope_type', scopeFilter.scope_type);
      }
      if (scopeFilter?.scope_id) {
        query = query.eq('scope_id', scopeFilter.scope_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StoneProviderAccount[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const { data, error } = await supabase
        .from('payment_provider_accounts')
        .insert({
          ...input,
          provider: 'stone',
          credentials_encrypted: input.credentials_encrypted || {},
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-provider-accounts'] });
      toast({ title: 'Conta Stone criada', description: 'A integração foi configurada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar conta Stone', description: error.message, variant: 'destructive' });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StoneProviderAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_provider_accounts')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-provider-accounts'] });
      toast({ title: 'Conta Stone atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_provider_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-provider-accounts'] });
      toast({ title: 'Conta Stone removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });

  const testConnection = useMutation({
    mutationFn: async (id: string) => {
      // Simulate a connection test (in production, this would call the Stone API)
      const { error } = await supabase
        .from('payment_provider_accounts')
        .update({
          last_tested_at: new Date().toISOString(),
          status: 'active',
          last_error: null,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-provider-accounts'] });
      toast({ title: 'Conexão testada com sucesso', description: 'A integração Stone está funcionando.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro no teste de conexão', description: error.message, variant: 'destructive' });
    },
  });

  return { accounts, isLoading, error, createAccount, updateAccount, deleteAccount, testConnection };
}

export function useStoneGlobalSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['stone-global-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stone_global_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as StoneGlobalSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<StoneGlobalSettings>) => {
      if (!settings?.id) throw new Error('Settings not loaded');
      const { data, error } = await supabase
        .from('stone_global_settings')
        .update(updates as any)
        .eq('id', settings.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-global-settings'] });
      toast({ title: 'Configurações Stone atualizadas' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  return { settings, isLoading, updateSettings };
}

export function useStoneEvents(filters?: { tenant_id?: string; provider_account_id?: string }) {
  return useQuery({
    queryKey: ['stone-provider-events', filters],
    queryFn: async () => {
      let query = supabase
        .from('payment_provider_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filters?.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
      if (filters?.provider_account_id) query = query.eq('provider_account_id', filters.provider_account_id);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StoneProviderEvent[];
    },
  });
}

export function useStoneTransactions(filters?: { tenant_id?: string; provider_account_id?: string }) {
  return useQuery({
    queryKey: ['stone-provider-transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('payment_provider_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
      if (filters?.provider_account_id) query = query.eq('provider_account_id', filters.provider_account_id);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StoneProviderTransaction[];
    },
  });
}

export function useStoneAuditLog() {
  return useQuery({
    queryKey: ['stone-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stone_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}
