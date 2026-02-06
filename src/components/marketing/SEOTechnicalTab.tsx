import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, FileCode, Globe, Check, RefreshCw } from 'lucide-react';
import { useMarketingSEO } from '@/hooks/useMarketingSEO';
import { OrganizationDomain } from '@/hooks/useOrganizationDomains';
import { useToast } from '@/hooks/use-toast';

interface SEOTechnicalTabProps {
  domain: OrganizationDomain | undefined;
}

export function SEOTechnicalTab({ domain }: SEOTechnicalTabProps) {
  const { toast } = useToast();
  const { settings, saveSettings, generateRobotsTxt, getSitemapUrl } = useMarketingSEO();
  const [copied, setCopied] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    default_title_suffix: settings?.default_title_suffix || '',
    default_description: settings?.default_description || '',
    default_keywords: settings?.default_keywords?.join(', ') || '',
    schema_org_type: settings?.schema_org_type || 'LocalBusiness',
    sitemap_enabled: settings?.sitemap_enabled ?? true,
    sitemap_change_freq: settings?.sitemap_change_freq || 'weekly',
    sitemap_priority: settings?.sitemap_priority || 0.8,
    robots_allow_all: settings?.robots_allow_all ?? true,
    robots_txt_custom: settings?.robots_txt_custom || '',
  });

  const handleSave = async () => {
    await saveSettings.mutateAsync({
      ...formData,
      default_keywords: formData.default_keywords.split(',').map(k => k.trim()).filter(Boolean),
      domain_id: domain?.id,
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: 'Copiado!', description: 'Conteúdo copiado para a área de transferência.' });
    setTimeout(() => setCopied(null), 2000);
  };

  const sitemapUrl = getSitemapUrl(domain?.domain);
  const robotsTxt = generateRobotsTxt();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="meta" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meta">Meta Tags</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="robots">Robots.txt</TabsTrigger>
          <TabsTrigger value="schema">Schema.org</TabsTrigger>
        </TabsList>

        {/* Meta Tags */}
        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Meta Tags Padrão
              </CardTitle>
              <CardDescription>
                Configure as meta tags que serão usadas em todas as páginas do seu site.
                Estas informações aparecem nos resultados de busca.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sufixo do Título</Label>
                <Input
                  placeholder="| Minha Empresa"
                  value={formData.default_title_suffix}
                  onChange={(e) => setFormData({ ...formData, default_title_suffix: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Será adicionado ao final de todos os títulos. Ex: "Página Inicial | Minha Empresa"
                </p>
              </div>

              <div className="space-y-2">
                <Label>Descrição Padrão</Label>
                <Textarea
                  placeholder="Descreva seu negócio em até 160 caracteres..."
                  value={formData.default_description}
                  onChange={(e) => setFormData({ ...formData, default_description: e.target.value })}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.default_description.length}/160 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label>Palavras-chave</Label>
                <Input
                  placeholder="restaurante, delivery, pizza, hamburger"
                  value={formData.default_keywords}
                  onChange={(e) => setFormData({ ...formData, default_keywords: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Separe as palavras-chave por vírgula
                </p>
              </div>

              <Button onClick={handleSave} disabled={saveSettings.isPending}>
                {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sitemap */}
        <TabsContent value="sitemap">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Sitemap XML
              </CardTitle>
              <CardDescription>
                O sitemap ajuda os buscadores a encontrar todas as páginas do seu site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Habilitar Sitemap</Label>
                  <p className="text-xs text-muted-foreground">
                    Gera automaticamente o arquivo sitemap.xml
                  </p>
                </div>
                <Switch
                  checked={formData.sitemap_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, sitemap_enabled: checked })}
                />
              </div>

              {formData.sitemap_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Frequência de Atualização</Label>
                    <Select
                      value={formData.sitemap_change_freq}
                      onValueChange={(value) => setFormData({ ...formData, sitemap_change_freq: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Sempre</SelectItem>
                        <SelectItem value="hourly">A cada hora</SelectItem>
                        <SelectItem value="daily">Diariamente</SelectItem>
                        <SelectItem value="weekly">Semanalmente</SelectItem>
                        <SelectItem value="monthly">Mensalmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {sitemapUrl && (
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-sm">URL do Sitemap</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 text-sm bg-background px-3 py-2 rounded border">
                          {sitemapUrl}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(sitemapUrl, 'sitemap')}
                        >
                          {copied === 'sitemap' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button onClick={handleSave} disabled={saveSettings.isPending}>
                {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Robots.txt */}
        <TabsContent value="robots">
          <Card>
            <CardHeader>
              <CardTitle>Robots.txt</CardTitle>
              <CardDescription>
                O robots.txt informa aos buscadores quais páginas podem ser indexadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir indexação completa</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite que os buscadores acessem todo o conteúdo
                  </p>
                </div>
                <Switch
                  checked={formData.robots_allow_all}
                  onCheckedChange={(checked) => setFormData({ ...formData, robots_allow_all: checked })}
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Conteúdo do robots.txt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(robotsTxt, 'robots')}
                  >
                    {copied === 'robots' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    Copiar
                  </Button>
                </div>
                <pre className="text-sm bg-background p-3 rounded border overflow-x-auto">
                  {robotsTxt}
                </pre>
              </div>

              <Button onClick={handleSave} disabled={saveSettings.isPending}>
                {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema.org */}
        <TabsContent value="schema">
          <Card>
            <CardHeader>
              <CardTitle>Schema.org (Dados Estruturados)</CardTitle>
              <CardDescription>
                Dados estruturados ajudam os buscadores a entender melhor seu negócio
                e podem gerar rich snippets nos resultados de busca.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Negócio</Label>
                <Select
                  value={formData.schema_org_type}
                  onValueChange={(value: 'Organization' | 'LocalBusiness' | 'Restaurant' | 'Store') => 
                    setFormData({ ...formData, schema_org_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Organization">Organização</SelectItem>
                    <SelectItem value="LocalBusiness">Negócio Local</SelectItem>
                    <SelectItem value="Restaurant">Restaurante</SelectItem>
                    <SelectItem value="Store">Loja</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Escolha o tipo que melhor descreve seu negócio
                </p>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm">
                  💡 <strong>Dica:</strong> Os dados estruturados são gerados automaticamente
                  com base nas informações do seu estabelecimento. Mantenha seus dados
                  de contato e endereço atualizados nas configurações.
                </p>
              </div>

              <Button onClick={handleSave} disabled={saveSettings.isPending}>
                {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
