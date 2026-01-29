import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BillingSettings {
  id: string;
  modules_billing_mode: 'bundle' | 'separate';
  invoice_show_breakdown: boolean;
  proration_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch and manage global billing settings
 */
export function useBillingSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['billing-settings'],
    queryFn: async () => {
      // Use RPC function for public access
      const { data, error } = await supabase.rpc('get_billing_settings');

      if (error) throw error;
      
      // RPC returns array, get first item
      if (data && data.length > 0) {
        return data[0] as BillingSettings;
      }
      
      // Default fallback
      return {
        id: '',
        modules_billing_mode: 'bundle' as const,
        invoice_show_breakdown: true,
        proration_enabled: false,
        created_at: '',
        updated_at: '',
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<BillingSettings>) => {
      // Get current settings first
      const { data: current, error: fetchError } = await supabase
        .from('billing_settings')
        .select('*')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('billing_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
      toast({
        title: 'Configurações atualizadas',
        description: 'As configurações de cobrança foram salvas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings,
  };
}
