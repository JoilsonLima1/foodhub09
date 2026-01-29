import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface LoyaltyConfig {
  id: string;
  tenant_id: string;
  is_active: boolean;
  points_per_real: number;
  min_points_redemption: number;
  points_expiry_days: number;
  vip_threshold: number;
  vip_discount_percent: number;
  welcome_points: number;
  birthday_points: number;
  config: Record<string, any>;
}

export interface LoyaltyCustomer {
  id: string;
  tenant_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  current_points: number;
  total_points_earned: number;
  total_points_redeemed: number;
  is_vip: boolean;
  vip_since: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  order_id: string | null;
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';
  points: number;
  description: string | null;
  created_at: string;
}

export function useLoyaltyProgram() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['loyalty-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as LoyaltyConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['loyalty-customers', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_customers')
        .select('*')
        .order('current_points', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as LoyaltyCustomer[];
    },
    enabled: !!tenantId,
  });

  // Stats
  const stats = {
    totalCustomers: customers.length,
    vipCustomers: customers.filter(c => c.is_vip).length,
    totalPointsCirculating: customers.reduce((sum, c) => sum + c.current_points, 0),
    avgPointsPerCustomer: customers.length > 0 
      ? Math.round(customers.reduce((sum, c) => sum + c.current_points, 0) / customers.length)
      : 0,
  };

  // Save config
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<LoyaltyConfig>) => {
      const { error } = await supabase
        .from('loyalty_config')
        .upsert({
          tenant_id: tenantId,
          ...newConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Add customer
  const addCustomer = useMutation({
    mutationFn: async (customer: { phone: string; name?: string; email?: string; cpf?: string; birth_date?: string }) => {
      const { data, error } = await supabase
        .from('loyalty_customers')
        .insert({
          tenant_id: tenantId,
          ...customer,
          current_points: config?.welcome_points || 0,
          total_points_earned: config?.welcome_points || 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Log welcome bonus
      if (config?.welcome_points) {
        await supabase.from('loyalty_transactions').insert({
          tenant_id: tenantId,
          customer_id: data.id,
          type: 'bonus',
          points: config.welcome_points,
          description: 'Bônus de boas-vindas',
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-customers'] });
      toast.success('Cliente cadastrado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cadastrar: ' + error.message);
    },
  });

  // Add points
  const addPoints = useMutation({
    mutationFn: async ({ customerId, points, description, orderId }: { 
      customerId: string; 
      points: number; 
      description?: string;
      orderId?: string;
    }) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Cliente não encontrado');

      const newPoints = customer.current_points + points;
      const newIsVip = config?.vip_threshold ? newPoints >= config.vip_threshold : false;

      const { error: updateError } = await supabase
        .from('loyalty_customers')
        .update({
          current_points: newPoints,
          total_points_earned: customer.total_points_earned + points,
          is_vip: newIsVip,
          vip_since: newIsVip && !customer.is_vip ? new Date().toISOString() : customer.vip_since,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('loyalty_transactions').insert({
        tenant_id: tenantId,
        customer_id: customerId,
        order_id: orderId,
        type: 'earn',
        points,
        description: description || 'Pontos por compra',
      });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-customers'] });
      toast.success('Pontos adicionados');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Redeem points
  const redeemPoints = useMutation({
    mutationFn: async ({ customerId, points, description }: { 
      customerId: string; 
      points: number; 
      description?: string;
    }) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Cliente não encontrado');
      if (customer.current_points < points) throw new Error('Pontos insuficientes');
      if (config?.min_points_redemption && points < config.min_points_redemption) {
        throw new Error(`Mínimo de ${config.min_points_redemption} pontos para resgate`);
      }

      const { error: updateError } = await supabase
        .from('loyalty_customers')
        .update({
          current_points: customer.current_points - points,
          total_points_redeemed: customer.total_points_redeemed + points,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('loyalty_transactions').insert({
        tenant_id: tenantId,
        customer_id: customerId,
        type: 'redeem',
        points: -points,
        description: description || 'Resgate de pontos',
      });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-customers'] });
      toast.success('Pontos resgatados');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    config,
    customers,
    stats,
    isLoading: configLoading || customersLoading,
    saveConfig,
    addCustomer,
    addPoints,
    redeemPoints,
  };
}
