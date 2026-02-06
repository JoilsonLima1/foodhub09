import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function MarketingCEOPanel() {
  const { tenantId } = useAuth();
  const { domains, isLoading: domainsLoading } = useOrganizationDomains(tenantId || undefined);
  const { settings, isLoading: seoLoading } = useMarketingSEO(tenantId || undefined);
  
  const activeDomain = domains.find(d => d.is_verified && d.is_primary) || domains.find(d => d.is_verified);
  const hasVerifiedDomain = !!activeDomain;

  if (domainsLoading || seoLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

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

      {/* Domain Status Alert */}
      {!hasVerifiedDomain ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Domínio não configurado</AlertTitle>
          <AlertDescription>
            Para usar as funcionalidades de SEO, você precisa ter um domínio verificado.
            Acesse <strong>Configurações → Domínios</strong> para configurar seu domínio.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Domínio ativo</AlertTitle>
          <AlertDescription>
            Seu SEO está configurado para: <strong>{activeDomain.domain}</strong>
            {activeDomain.is_primary && <Badge variant="outline" className="ml-2">Principal</Badge>}
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
