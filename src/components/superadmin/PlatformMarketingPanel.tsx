/**
 * PlatformMarketingPanel
 * 
 * Marketing management for the SaaS platform itself (FoodHub09).
 * SEPARATE from tenant marketing (MarketingCEOPanel).
 * 
 * This panel handles:
 * - Platform SEO status
 * - Landing page content control
 * - Signup/conversion metrics
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  Search, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { useSubscribers } from '@/hooks/useSubscribers';
import { usePlatformSEO } from '@/hooks/usePlatformSEO';

export function PlatformMarketingPanel() {
  const { stats } = useSubscribers();
  const { 
    seoStatus, 
    isLoading, 
    runSEOCheck, 
    isChecking,
    pages,
    sitemapUrl,
    robotsTxtUrl
  } = usePlatformSEO();
  
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Marketing da Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Marketing da Plataforma FoodHub09
              </CardTitle>
              <CardDescription>
                Gestão de SEO, conteúdo e aquisição de novos assinantes
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              Plataforma
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Novos Cadastros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de lojas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Em Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialing}</div>
            <p className="text-xs text-muted-foreground">Período de teste</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Conversões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Assinantes ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Trial → Pago</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Páginas
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* SEO Score Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score de SEO da Plataforma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24">
                    <svg className="h-24 w-24 -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(seoStatus.score / 100) * 251.2} 251.2`}
                        className="text-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{seoStatus.score}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Meta Tags</span>
                        <span className="font-medium">{seoStatus.metaScore}%</span>
                      </div>
                      <Progress value={seoStatus.metaScore} className="h-2" />
                      
                      <div className="flex justify-between text-sm">
                        <span>Técnico</span>
                        <span className="font-medium">{seoStatus.technicalScore}%</span>
                      </div>
                      <Progress value={seoStatus.technicalScore} className="h-2" />
                      
                      <div className="flex justify-between text-sm">
                        <span>Conteúdo</span>
                        <span className="font-medium">{seoStatus.contentScore}%</span>
                      </div>
                      <Progress value={seoStatus.contentScore} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => runSEOCheck()}
                  disabled={isChecking}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                  Executar Verificação de SEO
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  asChild
                >
                  <a href={sitemapUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Sitemap.xml
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  asChild
                >
                  <a href={robotsTxtUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Robots.txt
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Status Alerts */}
          <div className="space-y-2">
            {seoStatus.issues.map((issue, index) => (
              <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                {issue.type === 'error' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status de SEO Técnico</CardTitle>
              <CardDescription>
                Verificação dos elementos técnicos de SEO da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SEOCheckItem
                  label="Sitemap.xml"
                  status={seoStatus.hasSitemap}
                  url={sitemapUrl}
                />
                <SEOCheckItem
                  label="Robots.txt"
                  status={seoStatus.hasRobots}
                  url={robotsTxtUrl}
                />
                <SEOCheckItem
                  label="Schema.org (SoftwareApplication)"
                  status={seoStatus.hasSchema}
                />
                <SEOCheckItem
                  label="Open Graph Tags"
                  status={seoStatus.hasOpenGraph}
                />
                <SEOCheckItem
                  label="Canonical URLs"
                  status={seoStatus.hasCanonical}
                />
                <SEOCheckItem
                  label="Mobile Friendly"
                  status={seoStatus.isMobileFriendly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Páginas Públicas da Plataforma</CardTitle>
              <CardDescription>
                Status de indexação e SEO das páginas públicas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pages.map((page, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{page.title}</div>
                        <div className="text-sm text-muted-foreground">{page.path}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={page.indexed ? 'default' : 'secondary'}>
                        {page.indexed ? 'Indexada' : 'Pendente'}
                      </Badge>
                      <Badge variant="outline">{page.score}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SEOCheckItem({ 
  label, 
  status, 
  url 
}: { 
  label: string; 
  status: boolean; 
  url?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
      {status ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        )}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={status ? 'default' : 'secondary'}>
          {status ? 'OK' : 'Pendente'}
        </Badge>
        {url && (
          <Button variant="ghost" size="icon" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
