import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  BarChart3, 
  Globe, 
  FileCode, 
  Search, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { useMarketingSEO } from '@/hooks/useMarketingSEO';
import { useOrganizationDomains } from '@/hooks/useOrganizationDomains';
import { useAuth } from '@/contexts/AuthContext';
import { SEOOverviewTab } from './SEOOverviewTab';
import { SEOTechnicalTab } from './SEOTechnicalTab';
import { SearchConsoleGuideTab } from './SearchConsoleGuideTab';
import { SEOPagesTab } from './SEOPagesTab';
import { SEOReportsTab } from './SEOReportsTab';

interface MarketingCEOPanelProps {
  /** Override tenant ID (used by Super Admin) */
  tenantId?: string;
  /** If true, bypasses module limits (Super Admin mode) */
  isSuperAdmin?: boolean;
}

export function MarketingCEOPanel({ tenantId: propTenantId, isSuperAdmin = false }: MarketingCEOPanelProps) {
  const { tenantId: authTenantId } = useAuth();
  const effectiveTenantId = propTenantId || authTenantId;
  
  const { domains, isLoading: domainsLoading } = useOrganizationDomains(effectiveTenantId || undefined);
  const { settings, isLoading: seoLoading } = useMarketingSEO(effectiveTenantId || undefined);
  
  // Domain validation - consider valid if at least 1 verified domain exists for this tenant
  const verifiedDomains = domains.filter(d => d.is_verified);
  const pendingDomains = domains.filter(d => !d.is_verified);
  const activeDomain = verifiedDomains.find(d => d.is_primary) || verifiedDomains[0];
  const hasVerifiedDomain = verifiedDomains.length > 0;
  const hasPendingDomains = pendingDomains.length > 0;
  const hasAnyDomain = domains.length > 0;

  if (domainsLoading || seoLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Determine domain status message
  const getDomainStatusInfo = () => {
    if (hasVerifiedDomain) {
      return {
        type: 'success' as const,
        title: 'Domínio ativo',
        description: `Seu SEO está configurado para: ${activeDomain?.domain}`,
        showPrimaryBadge: activeDomain?.is_primary,
      };
    }
    
    if (hasPendingDomains) {
      return {
        type: 'warning' as const,
        title: 'Verificação pendente',
        description: `Você possui ${pendingDomains.length} domínio(s) aguardando verificação DNS. Complete a configuração em Configurações → Domínios.`,
        showPrimaryBadge: false,
      };
    }
    
    return {
      type: 'error' as const,
      title: 'Domínio não configurado',
      description: 'Para usar as funcionalidades de SEO, você precisa ter um domínio verificado. Acesse Configurações → Domínios para configurar seu domínio.',
      showPrimaryBadge: false,
    };
  };

  const domainStatus = getDomainStatusInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            CEO de Marketing
          </h2>
          <p className="text-muted-foreground">
            Gerencie o SEO e presença online do seu negócio
          </p>
        </div>
        {settings?.seo_score !== undefined && settings.seo_score > 0 && (
          <Badge variant={settings.seo_score >= 70 ? 'default' : settings.seo_score >= 40 ? 'secondary' : 'destructive'} className="text-lg px-4 py-2">
            Score SEO: {settings.seo_score}%
          </Badge>
        )}
      </div>

      {/* Domain Status Alert - with specific feedback based on actual state */}
      {domainStatus.type === 'error' ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{domainStatus.title}</AlertTitle>
          <AlertDescription>{domainStatus.description}</AlertDescription>
        </Alert>
      ) : domainStatus.type === 'warning' ? (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>{domainStatus.title}</AlertTitle>
          <AlertDescription>{domainStatus.description}</AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>{domainStatus.title}</AlertTitle>
          <AlertDescription>
            {domainStatus.description}
            {domainStatus.showPrimaryBadge && <Badge variant="outline" className="ml-2">Principal</Badge>}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="technical" className="flex items-center gap-2" disabled={!hasVerifiedDomain}>
            <FileCode className="h-4 w-4" />
            <span className="hidden sm:inline">SEO Técnico</span>
          </TabsTrigger>
          <TabsTrigger value="search-console" className="flex items-center gap-2" disabled={!hasVerifiedDomain}>
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscadores</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2" disabled={!hasVerifiedDomain}>
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Páginas</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2" disabled={!hasVerifiedDomain}>
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SEOOverviewTab 
            domain={activeDomain} 
            settings={settings} 
            hasVerifiedDomain={hasVerifiedDomain}
            isSuperAdmin={isSuperAdmin}
            tenantId={effectiveTenantId}
          />
        </TabsContent>

        <TabsContent value="technical">
          <SEOTechnicalTab domain={activeDomain} />
        </TabsContent>

        <TabsContent value="search-console">
          <SearchConsoleGuideTab domain={activeDomain} />
        </TabsContent>

        <TabsContent value="pages">
          <SEOPagesTab />
        </TabsContent>

        <TabsContent value="reports">
          <SEOReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
