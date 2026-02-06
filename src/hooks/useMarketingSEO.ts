import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface MarketingSEOSettings {
  id: string;
  tenant_id: string;
  domain_id: string | null;
  default_title_suffix: string;
  default_description: string | null;
  default_keywords: string[] | null;
  schema_org_type: 'Organization' | 'LocalBusiness' | 'Restaurant' | 'Store';
  schema_org_data: unknown;
  sitemap_enabled: boolean;
  sitemap_change_freq: string;
  sitemap_priority: number;
  robots_txt_custom: string | null;
  robots_allow_all: boolean;
  google_search_console_verified: boolean;
  google_search_console_verified_at: string | null;
  bing_webmaster_verified: boolean;
  bing_webmaster_verified_at: string | null;
  seo_score: number;
  last_audit_at: string | null;
  created_at: string;
  updated_at: string;
  domain?: {
    domain: string;
    is_verified: boolean;
    is_primary: boolean;
  };
}

export interface MarketingSEOPage {
  id: string;
  tenant_id: string;
  settings_id: string | null;
  page_path: string;
  page_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  title_score: number;
  description_score: number;
  content_score: number;
  overall_score: number;
  issues: unknown[];
  suggestions: unknown[];
  is_indexed: boolean | null;
  last_crawled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingSEOReport {
  id: string;
  tenant_id: string;
  settings_id: string | null;
  report_type: 'full_audit' | 'page_audit' | 'sitemap_check' | 'indexation_check';
  overall_score: number;
  technical_score: number;
  content_score: number;
  meta_score: number;
  critical_issues: number;
  warnings: number;
  recommendations: number;
  issues: unknown[];
  recommendations_list: unknown[];
  created_at: string;
}

export function useMarketingSEO(tenantId?: string) {
  const { toast } = useToast();
  const { tenantId: authTenantId } = useAuth();
  const queryClient = useQueryClient();
  const effectiveTenantId = tenantId || authTenantId;

  // Fetch SEO settings
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['marketing-seo-settings', effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTenantId) return null;

      const { data, error } = await supabase
        .from('marketing_seo_settings')
        .select(`
          *,
          domain:organization_domains(domain, is_verified, is_primary)
        `)
        .eq('tenant_id', effectiveTenantId)
        .maybeSingle();

      if (error) throw error;
      return data as MarketingSEOSettings | null;
    },
    enabled: !!effectiveTenantId,
  });

  // Fetch SEO pages
  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ['marketing-seo-pages', effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTenantId) return [];

      const { data, error } = await supabase
        .from('marketing_seo_pages')
        .select('*')
        .eq('tenant_id', effectiveTenantId)
        .order('page_path');

      if (error) throw error;
      return data as MarketingSEOPage[];
    },
    enabled: !!effectiveTenantId,
  });

  // Fetch recent reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['marketing-seo-reports', effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTenantId) return [];

      const { data, error } = await supabase
        .from('marketing_seo_reports')
        .select('*')
        .eq('tenant_id', effectiveTenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as MarketingSEOReport[];
    },
    enabled: !!effectiveTenantId,
  });

  // Create or update settings
  const saveSettings = useMutation({
    mutationFn: async (input: {
      domain_id?: string;
      default_title_suffix?: string;
      default_description?: string;
      default_keywords?: string[];
      schema_org_type?: 'Organization' | 'LocalBusiness' | 'Restaurant' | 'Store';
      sitemap_enabled?: boolean;
      sitemap_change_freq?: string;
      sitemap_priority?: number;
      robots_allow_all?: boolean;
      robots_txt_custom?: string;
    }) => {
      if (!effectiveTenantId) throw new Error('Tenant ID required');

      const payload = {
        ...input,
        tenant_id: effectiveTenantId,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { data, error } = await supabase
          .from('marketing_seo_settings')
          .update(payload)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('marketing_seo_settings')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-seo-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de SEO foram atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update search console verification status
  const updateSearchConsoleStatus = useMutation({
    mutationFn: async (input: { platform: 'google' | 'bing'; verified: boolean }) => {
      if (!settings?.id) throw new Error('Settings not found');

      const updates = input.platform === 'google'
        ? {
            google_search_console_verified: input.verified,
            google_search_console_verified_at: input.verified ? new Date().toISOString() : null,
          }
        : {
            bing_webmaster_verified: input.verified,
            bing_webmaster_verified_at: input.verified ? new Date().toISOString() : null,
          };

      const { data, error } = await supabase
        .from('marketing_seo_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-seo-settings'] });
      toast({
        title: 'Status atualizado',
        description: 'O status de verificação foi atualizado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create SEO audit report
  const runAudit = useMutation({
    mutationFn: async () => {
      if (!effectiveTenantId) throw new Error('Tenant ID required');

      // Calculate scores based on current settings
      const technicalScore = settings?.sitemap_enabled ? 80 : 40;
      const metaScore = settings?.default_description ? 70 : 30;
      const contentScore = pages.length > 0 ? 60 : 20;
      const overallScore = Math.round((technicalScore + metaScore + contentScore) / 3);

      const issues = [];
      const recommendations = [];

      if (!settings?.sitemap_enabled) {
        issues.push({ type: 'warning', message: 'Sitemap não está habilitado' });
        recommendations.push({ priority: 'high', message: 'Habilite o sitemap para melhorar a indexação' });
      }

      if (!settings?.default_description) {
        issues.push({ type: 'critical', message: 'Descrição padrão não configurada' });
        recommendations.push({ priority: 'high', message: 'Adicione uma descrição padrão para SEO' });
      }

      if (!settings?.google_search_console_verified) {
        recommendations.push({ priority: 'medium', message: 'Verifique seu site no Google Search Console' });
      }

      const report = {
        tenant_id: effectiveTenantId,
        settings_id: settings?.id || null,
        report_type: 'full_audit' as const,
        overall_score: overallScore,
        technical_score: technicalScore,
        content_score: contentScore,
        meta_score: metaScore,
        critical_issues: issues.filter(i => i.type === 'critical').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        recommendations: recommendations.length,
        issues: issues,
        recommendations_list: recommendations,
      };

      const { data, error } = await supabase
        .from('marketing_seo_reports')
        .insert(report)
        .select()
        .single();

      if (error) throw error;

      // Update last audit date
      if (settings?.id) {
        await supabase
          .from('marketing_seo_settings')
          .update({ 
            seo_score: overallScore, 
            last_audit_at: new Date().toISOString() 
          })
          .eq('id', settings.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-seo-reports'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-seo-settings'] });
      toast({
        title: 'Auditoria concluída',
        description: 'O relatório de SEO foi gerado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na auditoria',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Generate sitemap URL
  const getSitemapUrl = (domain?: string) => {
    if (!domain) return null;
    return `https://${domain}/sitemap.xml`;
  };

  // Generate robots.txt content
  const generateRobotsTxt = () => {
    if (settings?.robots_txt_custom) {
      return settings.robots_txt_custom;
    }

    const domain = settings?.domain?.domain;
    let content = `User-agent: *\n`;
    
    if (settings?.robots_allow_all) {
      content += `Allow: /\n`;
    } else {
      content += `Disallow: /admin/\nDisallow: /api/\n`;
    }

    if (domain && settings?.sitemap_enabled) {
      content += `\nSitemap: https://${domain}/sitemap.xml`;
    }

    return content;
  };

  return {
    settings,
    pages,
    reports,
    isLoading: settingsLoading || pagesLoading || reportsLoading,
    saveSettings,
    updateSearchConsoleStatus,
    runAudit,
    getSitemapUrl,
    generateRobotsTxt,
    refetchSettings,
  };
}
