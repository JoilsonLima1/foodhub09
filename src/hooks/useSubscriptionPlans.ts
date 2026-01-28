import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionPlan } from '@/types/database';

export function useSubscriptionPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async (plan: Partial<SubscriptionPlan> & { id: string }) => {
      const { id, ...updates } = plan;
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Plano atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createPlan = useMutation({
    mutationFn: async (plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Plano criado',
        description: 'O novo plano foi criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({
        title: 'Plano removido',
        description: 'O plano foi removido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    plans,
    isLoading,
    error,
    updatePlan,
    createPlan,
    deletePlan,
  };
}

// Feature definitions for UI
export const PLAN_FEATURES = [
  // Limits
  { key: 'max_users', label: 'Máximo de Usuários', description: 'Número máximo de usuários ativos (-1 = ilimitado)', type: 'number', category: 'limits' },
  { key: 'max_products', label: 'Máximo de Produtos', description: 'Número máximo de produtos no cardápio (-1 = ilimitado)', type: 'number', category: 'limits' },
  { key: 'max_orders_per_month', label: 'Pedidos por Mês', description: 'Limite de pedidos por mês (-1 = ilimitado)', type: 'number', category: 'limits' },
  
  // Core features
  { key: 'feature_pos', label: 'PDV/Caixa', description: 'Sistema de ponto de venda completo', type: 'boolean', category: 'core' },
  { key: 'feature_kitchen_display', label: 'Painel da Cozinha', description: 'Tela de gestão de preparo', type: 'boolean', category: 'core' },
  { key: 'feature_delivery_management', label: 'Gestão de Entregas', description: 'Gerenciamento de entregadores e rotas', type: 'boolean', category: 'core' },
  { key: 'feature_stock_control', label: 'Controle de Estoque', description: 'Gestão de insumos e receitas', type: 'boolean', category: 'core' },
  { key: 'feature_courier_app', label: 'App do Entregador', description: 'Dashboard mobile para entregadores', type: 'boolean', category: 'core' },
  { key: 'feature_public_menu', label: 'Cardápio na Internet', description: 'Link exclusivo para visualização do cardápio online', type: 'boolean', category: 'core' },
  
  // Reports
  { key: 'feature_reports_basic', label: 'Relatórios Básicos', description: 'Vendas diárias e produtos mais vendidos', type: 'boolean', category: 'reports' },
  { key: 'feature_reports_advanced', label: 'Relatórios Avançados', description: 'Análises detalhadas e comparativos', type: 'boolean', category: 'reports' },
  { key: 'feature_cmv_reports', label: 'Relatório CMV', description: 'Custo de Mercadoria Vendida', type: 'boolean', category: 'reports' },
  { key: 'feature_ai_forecast', label: 'Previsão com IA', description: 'Previsão de vendas com inteligência artificial', type: 'boolean', category: 'reports' },
  { key: 'feature_goal_notifications', label: 'Metas e Notificações', description: 'Alertas quando metas são atingidas', type: 'boolean', category: 'reports' },
  
  // Advanced
  { key: 'feature_multi_branch', label: 'Multi-Unidades', description: 'Gestão de múltiplas filiais', type: 'boolean', category: 'advanced' },
  { key: 'feature_api_access', label: 'Acesso à API', description: 'Integração via API REST', type: 'boolean', category: 'advanced' },
  { key: 'feature_white_label', label: 'White Label', description: 'Marca própria sem FoodHub', type: 'boolean', category: 'advanced' },
  { key: 'feature_priority_support', label: 'Suporte Prioritário', description: 'Atendimento preferencial', type: 'boolean', category: 'advanced' },
  { key: 'feature_custom_integrations', label: 'Integrações Personalizadas', description: 'iFood, Rappi, e outras', type: 'boolean', category: 'advanced' },
] as const;
