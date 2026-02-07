/**
 * PlatformMarketingAndSEOPanel
 * 
 * Unified panel for Platform Marketing and SEO management.
 * Combines the previous "Marketing Plataforma" and "SEO Plataforma" tabs.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  ArrowUpRight,
  Settings2,
  Code,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Info,
} from 'lucide-react';
import { useSubscribers } from '@/hooks/useSubscribers';
import { usePlatformSEO, usePlatformSEOAdmin, type PlatformSEOPage, type PlatformSEOSettings } from '@/hooks/usePlatformSEO';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DestructiveConfirmDialog } from './DestructiveConfirmDialog';
import { PageFormDialog } from './PageFormDialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function PlatformMarketingAndSEOPanel() {
  const { toast } = useToast();
  const { stats } = useSubscribers();
  const { 
    seoStatus, 
    isLoading: statusLoading, 
    runSEOCheck, 
    isChecking,
    pages: statusPages,
    sitemapUrl,
    robotsTxtUrl
  } = usePlatformSEO();
  
  const { 
    settings, 
    pages, 
    isLoading: adminLoading, 
    updateSettings, 
    createPage, 
    updatePage, 
    deletePage 
  } = usePlatformSEOAdmin();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isPageDialogOpen, setIsPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PlatformSEOPage | null>(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState<{ open: boolean; pageId: string | null }>({ open: false, pageId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [globalForm, setGlobalForm] = useState<Partial<PlatformSEOSettings>>({});

  const isLoading = statusLoading || adminLoading;

  const handleDeletePage = async (id: string) => {
    setIsDeleting(true);
    try {
      await deletePage(id);
      toast({ title: 'Página excluída', description: 'A página foi removida do sitemap e das configurações de SEO.' });
      setDeleteConfirmState({ open: false, pageId: null });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirmation = (id: string) => {
    setDeleteConfirmState({ open: true, pageId: id });
  };

  const handleSaveGlobalSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        ...globalForm,
        default_keywords: globalForm.default_keywords || [],
        social_links: globalForm.social_links || [],
        app_features: globalForm.app_features || [],
      });
      toast({ title: 'Configurações salvas', description: 'SEO global atualizado com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Marketing & SEO da Plataforma
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
                Marketing & SEO da Plataforma FoodHub09
              </CardTitle>
              <CardDescription>
                Gestão unificada de SEO, páginas e métricas de aquisição
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              Dinâmico
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

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Páginas SEO</span>
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Config. Global</span>
          </TabsTrigger>
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Schema.org</span>
          </TabsTrigger>
          <TabsTrigger value="technical" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Técnico</span>
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

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-4">
          {/* Sitemap delay notice */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Atualização Automática</AlertTitle>
            <AlertDescription>
              Páginas com <strong>Ativo = Sim</strong> e <strong>Incluir no Sitemap = Sim</strong> são automaticamente incluídas no sitemap.xml. 
              Alterações podem levar até alguns minutos para refletir nos mecanismos de busca.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Páginas SEO</CardTitle>
                  <CardDescription>Gerencie o SEO de cada página pública</CardDescription>
                </div>
                <Button onClick={() => { setEditingPage(null); setIsPageDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Página
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caminho</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Indexar</TableHead>
                    <TableHead>Sitemap</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-mono text-sm">{page.path}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{page.title}</TableCell>
                      <TableCell>
                        <Badge variant={page.is_active ? 'default' : 'secondary'}>
                          {page.is_active ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={page.is_indexable ? 'default' : 'secondary'}>
                          {page.is_indexable ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={page.include_in_sitemap ? 'default' : 'secondary'}>
                          {page.include_in_sitemap ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>{page.sitemap_priority ?? 0.5}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingPage(page);
                              setIsPageDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteConfirmation(page.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Page Form Dialog */}
          <PageFormDialog
            open={isPageDialogOpen}
            onOpenChange={setIsPageDialogOpen}
            page={editingPage}
            onSave={async (data) => {
              try {
                if (editingPage) {
                  await updatePage(editingPage.id, data);
                } else {
                  await createPage(data as Omit<PlatformSEOPage, 'id'>);
                }
                setIsPageDialogOpen(false);
                setEditingPage(null);
                toast({ title: editingPage ? 'Página atualizada' : 'Página criada' });
              } catch (error: any) {
                toast({ title: 'Erro', description: error.message, variant: 'destructive' });
              }
            }}
          />

          {/* Delete Confirmation Dialog */}
          <DestructiveConfirmDialog
            open={deleteConfirmState.open}
            onOpenChange={(open) => setDeleteConfirmState({ open, pageId: open ? deleteConfirmState.pageId : null })}
            onConfirm={() => deleteConfirmState.pageId && handleDeletePage(deleteConfirmState.pageId)}
            title="Excluir Página SEO"
            description="Esta ação removerá permanentemente a página do sitemap e das configurações de SEO. Isso pode afetar negativamente a indexação do seu site pelos mecanismos de busca."
            confirmWord="EXCLUIR"
            confirmLabel="Excluir Página"
            isLoading={isDeleting}
          />
        </TabsContent>

        {/* Global Settings Tab */}
        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Configurações Globais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="site_name">Nome do Site</Label>
                  <Input
                    id="site_name"
                    value={globalForm.site_name ?? settings?.site_name ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, site_name: e.target.value })}
                    placeholder="FoodHub09"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="canonical_domain">Domínio Canônico</Label>
                  <Input
                    id="canonical_domain"
                    value={globalForm.canonical_domain ?? settings?.canonical_domain ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, canonical_domain: e.target.value })}
                    placeholder="https://foodhub09.com.br"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_title">Título Padrão</Label>
                <Input
                  id="default_title"
                  value={globalForm.default_title ?? settings?.default_title ?? ''}
                  onChange={(e) => setGlobalForm({ ...globalForm, default_title: e.target.value })}
                  placeholder="FoodHub09 - Sistema de Gestão para Restaurantes"
                />
                <p className="text-xs text-muted-foreground">Máximo recomendado: 60 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_description">Descrição Padrão</Label>
                <Textarea
                  id="default_description"
                  value={globalForm.default_description ?? settings?.default_description ?? ''}
                  onChange={(e) => setGlobalForm({ ...globalForm, default_description: e.target.value })}
                  placeholder="Sistema completo para gestão de restaurantes..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Máximo recomendado: 160 caracteres</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="og_image_url">Imagem OG (Open Graph)</Label>
                  <Input
                    id="og_image_url"
                    value={globalForm.og_image_url ?? settings?.og_image_url ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, og_image_url: e.target.value })}
                    placeholder="https://foodhub09.com.br/og-image.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme_color">Cor do Tema</Label>
                  <Input
                    id="theme_color"
                    value={globalForm.theme_color ?? settings?.theme_color ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, theme_color: e.target.value })}
                    placeholder="#f97316"
                  />
                </div>
              </div>

              {/* Webmaster Verification */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Verificação de Webmasters</h4>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="google_site_verification">Google Search Console</Label>
                  <Input
                    id="google_site_verification"
                    value={globalForm.google_site_verification ?? settings?.google_site_verification ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, google_site_verification: e.target.value })}
                    placeholder="Código de verificação (content do meta tag)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole apenas o valor do atributo content da meta tag fornecida pelo Google.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bing_site_verification">Bing Webmaster Tools</Label>
                  <Input
                    id="bing_site_verification"
                    value={globalForm.bing_site_verification ?? settings?.bing_site_verification ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, bing_site_verification: e.target.value })}
                    placeholder="Código de verificação Bing (meta HTML)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole o valor do atributo content da meta tag msvalidate.01 fornecida pelo Bing.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_robots">Diretiva Robots Padrão</Label>
                <Input
                  id="default_robots"
                  value={globalForm.default_robots ?? settings?.default_robots ?? ''}
                  onChange={(e) => setGlobalForm({ ...globalForm, default_robots: e.target.value })}
                  placeholder="index, follow"
                />
              </div>

              <Button onClick={handleSaveGlobalSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema.org Tab */}
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                Schema.org - Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome da Organização</Label>
                  <Input
                    value={globalForm.organization_name ?? settings?.organization_name ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, organization_name: e.target.value })}
                    placeholder="FoodHub09"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={globalForm.logo_url ?? settings?.logo_url ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, logo_url: e.target.value })}
                    placeholder="https://foodhub09.com.br/logo.png"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email de Contato</Label>
                  <Input
                    value={globalForm.organization_email ?? settings?.organization_email ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, organization_email: e.target.value })}
                    placeholder="contato@foodhub09.com.br"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={globalForm.organization_phone ?? settings?.organization_phone ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, organization_phone: e.target.value })}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                Schema.org - SoftwareApplication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={globalForm.app_category ?? settings?.app_category ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, app_category: e.target.value })}
                    placeholder="BusinessApplication"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço</Label>
                  <Input
                    value={globalForm.app_price ?? settings?.app_price ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, app_price: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Input
                    value={globalForm.app_price_currency ?? settings?.app_price_currency ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, app_price_currency: e.target.value })}
                    placeholder="BRL"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rating (ex: 4.8)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={globalForm.app_rating_value ?? settings?.app_rating_value ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, app_rating_value: parseFloat(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número de Reviews</Label>
                  <Input
                    type="number"
                    value={globalForm.app_rating_count ?? settings?.app_rating_count ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, app_rating_count: parseInt(e.target.value) || null })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveGlobalSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Schema.org
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical SEO Tab */}
        <TabsContent value="technical" className="space-y-4">
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
                <SEOCheckItem
                  label="Google Site Verification"
                  status={!!settings?.google_site_verification}
                />
                <SEOCheckItem
                  label="Bing Webmaster Verification"
                  status={!!settings?.bing_site_verification}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Páginas Públicas</CardTitle>
              <CardDescription>
                Status de indexação das páginas públicas. Apenas páginas com <strong>Ativo = Sim</strong>, <strong>Indexar = Sim</strong> e <strong>Incluir no Sitemap = Sim</strong> são incluídas no sitemap.xml
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pages.map((page) => {
                  const isInSitemap = page.is_active && page.is_indexable && page.include_in_sitemap;
                  const canonicalUrl = `${settings?.canonical_domain || 'https://foodhub09.com.br'}${page.path === '/' ? '' : page.path}`;
                  
                  return (
                    <div 
                      key={page.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{page.title}</div>
                          <div className="text-sm text-muted-foreground font-mono">{page.path}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                            Canonical: {canonicalUrl}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!page.is_active && (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                        {page.is_active && !page.is_indexable && (
                          <Badge variant="secondary">noindex</Badge>
                        )}
                        {page.is_active && page.is_indexable && !page.include_in_sitemap && (
                          <Badge variant="outline">Fora do Sitemap</Badge>
                        )}
                        {isInSitemap && (
                          <Badge variant="default">No Sitemap</Badge>
                        )}
                        <Badge variant="outline">
                          Prioridade: {page.sitemap_priority ?? 0.5}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Warning for pages not in sitemap */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Páginas Técnicas Excluídas</AlertTitle>
            <AlertDescription>
              Rotas técnicas como <code>/auth</code>, <code>/super-admin</code>, <code>/dashboard</code> devem ser configuradas com <strong>Indexar = Não</strong> e <strong>Incluir no Sitemap = Não</strong> para evitar indexação indesejada.
            </AlertDescription>
          </Alert>
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
