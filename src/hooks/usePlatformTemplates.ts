/**
 * usePlatformTemplates - Hook for managing platform plan & page templates (Super Admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlanTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  currency: string;
  max_users: number;
  max_products: number;
  max_orders_per_month: number;
  included_modules: string[];
  included_features: string[];
  is_free: boolean;
  trial_days: number;
  is_featured: boolean;
  is_default: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageTemplate {
  id: string;
  name: string;
  hero_badge: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_cta_text: string | null;
  hero_image_url: string | null;
  benefits_title: string | null;
  benefits: any[];
  features_title: string | null;
  features: any[];
  faq_title: string | null;
  faq_items: any[];
  testimonials: any[];
  cta_title: string | null;
  cta_subtitle: string | null;
  cta_button_text: string | null;
  social_proof_text: string | null;
  show_modules_section: boolean;
  show_pricing_section: boolean;
  show_faq_section: boolean;
  show_testimonials_section: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePlanTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['platform-plan-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_plan_templates')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PlanTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<PlanTemplate>) => {
      const { data, error } = await supabase
        .from('platform_plan_templates')
        .insert([template as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plan-templates'] });
      toast({ title: 'Template de plano criado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanTemplate> & { id: string }) => {
      const { error } = await supabase
        .from('platform_plan_templates')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plan-templates'] });
      toast({ title: 'Template atualizado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_plan_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plan-templates'] });
      toast({ title: 'Template removido!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { templates, isLoading, createTemplate, updateTemplate, deleteTemplate };
}

export function usePageTemplate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ['platform-page-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_partner_page_template')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PageTemplate | null;
    },
  });

  const upsertTemplate = useMutation({
    mutationFn: async (tpl: Partial<PageTemplate>) => {
      if (template?.id) {
        const { error } = await supabase
          .from('platform_partner_page_template')
          .update(tpl as any)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_partner_page_template')
          .insert([tpl as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-page-template'] });
      toast({ title: 'Template de página salvo!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { template, isLoading, upsertTemplate };
}

export function useImportTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partnerId: string) => {
      const { data, error } = await supabase
        .rpc('import_platform_templates_for_partner', { p_partner_id: partnerId });
      if (error) throw error;
      return data as { plans_imported: number; page_imported: boolean; skipped_free_count: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-plans'] });
      queryClient.invalidateQueries({ queryKey: ['partner-marketing-page'] });

      if (data.plans_imported === 0 && data.skipped_free_count === 0) {
        toast({
          title: 'Nenhum template encontrado',
          description: 'Não existem templates ativos configurados pela plataforma. Contate o administrador.',
          variant: 'destructive',
        });
        return;
      }

      const parts: string[] = [];
      if (data.plans_imported > 0) {
        parts.push(`${data.plans_imported} plano(s) importado(s)`);
      }
      if (data.page_imported) {
        parts.push('página de vendas importada');
      }
      if (data.skipped_free_count > 0) {
        parts.push(`${data.skipped_free_count} plano(s) gratuito(s) ignorado(s) — não permitido para este parceiro. Peça liberação ao suporte.`);
      }

      toast({
        title: data.plans_imported > 0 ? 'Templates importados!' : 'Importação parcial',
        description: parts.join('. '),
        variant: data.plans_imported > 0 ? 'default' : 'destructive',
      });
    },
    onError: (e: any) => toast({ title: 'Erro ao importar', description: e.message, variant: 'destructive' }),
  });
}
