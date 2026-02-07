/**
 * PlatformSEOManager - Full CRUD for platform SEO settings
 * 
 * Super Admin panel to manage:
 * - Global SEO settings (meta tags, Schema.org, etc.)
 * - Per-page SEO configuration
 * - Sitemap control
 */

import { useState } from 'react';
import { usePlatformSEOAdmin, type PlatformSEOSettings, type PlatformSEOPage } from '@/hooks/usePlatformSEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Globe,
  Settings2,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  ExternalLink,
  Search,
  Code,
} from 'lucide-react';

export function PlatformSEOManager() {
  const { toast } = useToast();
  const { settings, pages, isLoading, updateSettings, createPage, updatePage, deletePage } = usePlatformSEOAdmin();
  const [activeTab, setActiveTab] = useState('global');
  const [isSaving, setIsSaving] = useState(false);
  const [isPageDialogOpen, setIsPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PlatformSEOPage | null>(null);

  // Form states for global settings
  const [globalForm, setGlobalForm] = useState<Partial<PlatformSEOSettings>>({});

  // Initialize form when settings load
  useState(() => {
    if (settings) {
      setGlobalForm(settings);
    }
  });

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

  const handleDeletePage = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta página?')) return;
    try {
      await deletePage(id);
      toast({ title: 'Página excluída' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando SEO...</CardTitle>
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
                <Search className="h-5 w-5 text-primary" />
                Gestão de SEO da Plataforma
              </CardTitle>
              <CardDescription>
                Configure meta tags, Schema.org e controle o sitemap dinamicamente
              </CardDescription>
            </div>
            <Badge className="bg-primary">Dinâmico</Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            SEO Global
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Páginas
          </TabsTrigger>
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Schema.org
          </TabsTrigger>
        </TabsList>

        {/* Global SEO Tab */}
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="google_site_verification">Google Site Verification</Label>
                  <Input
                    id="google_site_verification"
                    value={globalForm.google_site_verification ?? settings?.google_site_verification ?? ''}
                    onChange={(e) => setGlobalForm({ ...globalForm, google_site_verification: e.target.value })}
                    placeholder="Código de verificação Google"
                  />
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
              </div>

              <Button onClick={handleSaveGlobalSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Páginas SEO</CardTitle>
                  <CardDescription>Gerencie o SEO de cada página pública</CardDescription>
                </div>
                <Dialog open={isPageDialogOpen} onOpenChange={setIsPageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingPage(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Página
                    </Button>
                  </DialogTrigger>
                  <PageFormDialog
                    page={editingPage}
                    onSave={async (data) => {
                      try {
                        if (editingPage) {
                          await updatePage(editingPage.id, data);
                        } else {
                          await createPage(data as Omit<PlatformSEOPage, 'id'>);
                        }
                        setIsPageDialogOpen(false);
                        toast({ title: editingPage ? 'Página atualizada' : 'Página criada' });
                      } catch (error: any) {
                        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                      }
                    }}
                    onClose={() => setIsPageDialogOpen(false)}
                  />
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caminho</TableHead>
                    <TableHead>Título</TableHead>
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
                            onClick={() => handleDeletePage(page.id)}
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
      </Tabs>
    </div>
  );
}

// Page Form Dialog Component
function PageFormDialog({
  page,
  onSave,
  onClose,
}: {
  page: PlatformSEOPage | null;
  onSave: (data: Partial<PlatformSEOPage>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<PlatformSEOPage>>(
    page ?? {
      path: '',
      title: '',
      description: '',
      slug: '',
      is_indexable: true,
      include_in_sitemap: true,
      sitemap_priority: 0.8,
      sitemap_changefreq: 'weekly',
      is_active: true,
      display_order: 0,
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.path || !form.title) return;
    setIsSaving(true);
    try {
      await onSave(form);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{page ? 'Editar Página' : 'Nova Página SEO'}</DialogTitle>
        <DialogDescription>Configure as meta tags desta página pública</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="path">Caminho *</Label>
            <Input
              id="path"
              value={form.path ?? ''}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              placeholder="/minha-pagina"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={form.slug ?? ''}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="minha-pagina"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={form.title ?? ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Título da Página | FoodHub09"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição da página para mecanismos de busca..."
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Prioridade Sitemap</Label>
            <Select
              value={String(form.sitemap_priority ?? 0.8)}
              onValueChange={(v) => setForm({ ...form, sitemap_priority: parseFloat(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.0">1.0 (Máxima)</SelectItem>
                <SelectItem value="0.9">0.9</SelectItem>
                <SelectItem value="0.8">0.8</SelectItem>
                <SelectItem value="0.7">0.7</SelectItem>
                <SelectItem value="0.5">0.5 (Média)</SelectItem>
                <SelectItem value="0.3">0.3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select
              value={form.sitemap_changefreq ?? 'weekly'}
              onValueChange={(v) => setForm({ ...form, sitemap_changefreq: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Sempre</SelectItem>
                <SelectItem value="hourly">Por hora</SelectItem>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
                <SelectItem value="never">Nunca</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ordem</Label>
            <Input
              type="number"
              value={form.display_order ?? 0}
              onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_indexable ?? true}
              onCheckedChange={(v) => setForm({ ...form, is_indexable: v })}
            />
            <Label>Indexar (robots)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.include_in_sitemap ?? true}
              onCheckedChange={(v) => setForm({ ...form, include_in_sitemap: v })}
            />
            <Label>Incluir no Sitemap</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
            <Label>Ativo</Label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isSaving || !form.path || !form.title}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {page ? 'Atualizar' : 'Criar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
