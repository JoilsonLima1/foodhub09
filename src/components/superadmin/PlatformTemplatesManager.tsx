/**
 * PlatformTemplatesManager - Super Admin UI for managing plan & page templates
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Edit2, Trash2, FileText, Copy } from 'lucide-react';
import { usePlanTemplates, usePageTemplate, type PlanTemplate } from '@/hooks/usePlatformTemplates';

const emptyPlanTemplate: Partial<PlanTemplate> = {
  name: '',
  slug: '',
  description: '',
  monthly_price: 0,
  currency: 'BRL',
  max_users: 5,
  max_products: 100,
  max_orders_per_month: 500,
  included_modules: [],
  included_features: [],
  is_free: false,
  trial_days: 7,
  is_featured: false,
  is_default: false,
  display_order: 0,
  is_active: true,
};

export function PlatformTemplatesManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Copy className="h-6 w-6" />
          Templates da Plataforma
        </h2>
        <p className="text-muted-foreground">
          Modelos padrão de planos e página de vendas que parceiros podem importar
        </p>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Templates de Planos</TabsTrigger>
          <TabsTrigger value="page">Template de Página</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <PlanTemplatesTab />
        </TabsContent>

        <TabsContent value="page">
          <PageTemplateTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlanTemplatesTab() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = usePlanTemplates();
  const [editingTemplate, setEditingTemplate] = useState<Partial<PlanTemplate> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSave = () => {
    if (!editingTemplate) return;
    if (editingTemplate.id) {
      updateTemplate.mutate(editingTemplate as PlanTemplate);
    } else {
      createTemplate.mutate(editingTemplate);
    }
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTemplate({ ...emptyPlanTemplate })}>
              <Plus className="h-4 w-4 mr-2" /> Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate?.id ? 'Editar' : 'Novo'} Template de Plano</DialogTitle>
            </DialogHeader>
            {editingTemplate && (
              <div className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={editingTemplate.name || ''} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={editingTemplate.slug || ''} onChange={e => setEditingTemplate({ ...editingTemplate, slug: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={editingTemplate.description || ''} onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })} />
                </div>
                <div className="grid gap-4 grid-cols-3">
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input type="number" step="0.01" value={editingTemplate.monthly_price ?? 0} onChange={e => setEditingTemplate({ ...editingTemplate, monthly_price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx Usuários</Label>
                    <Input type="number" value={editingTemplate.max_users ?? 5} onChange={e => setEditingTemplate({ ...editingTemplate, max_users: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Trial (dias)</Label>
                    <Input type="number" value={editingTemplate.trial_days ?? 7} onChange={e => setEditingTemplate({ ...editingTemplate, trial_days: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Máx Produtos</Label>
                    <Input type="number" value={editingTemplate.max_products ?? 100} onChange={e => setEditingTemplate({ ...editingTemplate, max_products: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx Pedidos/Mês</Label>
                    <Input type="number" value={editingTemplate.max_orders_per_month ?? 500} onChange={e => setEditingTemplate({ ...editingTemplate, max_orders_per_month: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!editingTemplate.is_free} onCheckedChange={v => setEditingTemplate({ ...editingTemplate, is_free: v })} />
                    <Label>Gratuito</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!editingTemplate.is_featured} onCheckedChange={v => setEditingTemplate({ ...editingTemplate, is_featured: v })} />
                    <Label>Destaque</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!editingTemplate.is_default} onCheckedChange={v => setEditingTemplate({ ...editingTemplate, is_default: v })} />
                    <Label>Padrão</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ordem de exibição</Label>
                  <Input type="number" value={editingTemplate.display_order ?? 0} onChange={e => setEditingTemplate({ ...editingTemplate, display_order: parseInt(e.target.value) || 0 })} />
                </div>
                <Button onClick={handleSave} className="w-full" disabled={createTemplate.isPending || updateTemplate.isPending}>
                  {(createTemplate.isPending || updateTemplate.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <p>Nenhum template de plano criado ainda.</p>
            <p className="text-sm">Crie templates que parceiros poderão importar como base.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <div className="flex gap-1">
                    {t.is_featured && <Badge>Destaque</Badge>}
                    {t.is_free && <Badge variant="secondary">Grátis</Badge>}
                  </div>
                </div>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {t.is_free ? 'Grátis' : `R$ ${t.monthly_price.toFixed(2)}/mês`}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{t.max_users} usuários · {t.max_products} produtos · {t.max_orders_per_month} pedidos/mês</p>
                  {t.trial_days > 0 && <p>Trial: {t.trial_days} dias</p>}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => { setEditingTemplate(t); setIsDialogOpen(true); }}>
                    <Edit2 className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteTemplate.mutate(t.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PageTemplateTab() {
  const { template, isLoading, upsertTemplate } = usePageTemplate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  const startEditing = () => {
    setForm(template || {
      name: 'Padrão',
      hero_badge: 'Comece Agora',
      hero_title: 'Lance seu negócio digital',
      hero_subtitle: 'Tudo que você precisa para vender online',
      hero_cta_text: 'Começar Grátis',
      benefits_title: 'Benefícios',
      benefits: [],
      faq_title: 'Perguntas Frequentes',
      faq_items: [],
      cta_title: 'Pronto para começar?',
      cta_button_text: 'Criar Conta',
      show_modules_section: true,
      show_pricing_section: true,
      show_faq_section: true,
      show_testimonials_section: false,
    });
    setEditing(true);
  };

  const handleSave = () => {
    upsertTemplate.mutate(form);
    setEditing(false);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Template de Página de Vendas</CardTitle>
            <CardDescription>Modelo base que parceiros importarão para sua landing page</CardDescription>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={upsertTemplate.isPending}>
                {upsertTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          ) : (
            <Button onClick={startEditing}>
              <Edit2 className="h-4 w-4 mr-2" /> {template ? 'Editar' : 'Criar'} Template
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing && form ? (
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Badge do Hero</Label>
                <Input value={form.hero_badge || ''} onChange={e => setForm({ ...form, hero_badge: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CTA do Hero</Label>
                <Input value={form.hero_cta_text || ''} onChange={e => setForm({ ...form, hero_cta_text: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Título do Hero</Label>
              <Input value={form.hero_title || ''} onChange={e => setForm({ ...form, hero_title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo do Hero</Label>
              <Textarea value={form.hero_subtitle || ''} onChange={e => setForm({ ...form, hero_subtitle: e.target.value })} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Título Benefícios</Label>
                <Input value={form.benefits_title || ''} onChange={e => setForm({ ...form, benefits_title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Título FAQ</Label>
                <Input value={form.faq_title || ''} onChange={e => setForm({ ...form, faq_title: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>CTA Final - Título</Label>
                <Input value={form.cta_title || ''} onChange={e => setForm({ ...form, cta_title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CTA Final - Botão</Label>
                <Input value={form.cta_button_text || ''} onChange={e => setForm({ ...form, cta_button_text: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={!!form.show_modules_section} onCheckedChange={v => setForm({ ...form, show_modules_section: v })} />
                <Label>Módulos</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!form.show_pricing_section} onCheckedChange={v => setForm({ ...form, show_pricing_section: v })} />
                <Label>Preços</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!form.show_faq_section} onCheckedChange={v => setForm({ ...form, show_faq_section: v })} />
                <Label>FAQ</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!form.show_testimonials_section} onCheckedChange={v => setForm({ ...form, show_testimonials_section: v })} />
                <Label>Depoimentos</Label>
              </div>
            </div>
          </div>
        ) : template ? (
          <div className="space-y-3">
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Hero</p>
              <p className="font-semibold text-lg">{template.hero_title}</p>
              <p className="text-muted-foreground">{template.hero_subtitle}</p>
              <Badge className="mt-2">{template.hero_cta_text}</Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              {template.show_modules_section && <Badge variant="outline">Módulos</Badge>}
              {template.show_pricing_section && <Badge variant="outline">Preços</Badge>}
              {template.show_faq_section && <Badge variant="outline">FAQ</Badge>}
              {template.show_testimonials_section && <Badge variant="outline">Depoimentos</Badge>}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Nenhum template de página criado. Clique em "Criar Template" para começar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
