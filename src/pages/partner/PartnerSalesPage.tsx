/**
 * PartnerSalesPage - Sales page builder for partners
 * Edits partner_marketing_pages content with live preview
 */

import { useState, useEffect } from 'react';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2, Save, Eye, Plus, Trash2, GripVertical,
  Sparkles, MessageSquare, HelpCircle, Star, Layout,
  Search, Globe, Image, Rocket,
} from 'lucide-react';

interface BenefitItem {
  icon: string;
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface TestimonialItem {
  name: string;
  role: string;
  text: string;
  avatar_url?: string;
}

interface MarketingPageData {
  id?: string;
  partner_id: string;
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_cta_url: string;
  hero_image_url: string;
  benefits_title: string;
  benefits: BenefitItem[];
  features_title: string;
  features: { icon: string; title: string; description: string }[];
  faq_title: string;
  faq_items: FaqItem[];
  testimonials: TestimonialItem[];
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;
  social_proof_text: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  show_modules_section: boolean;
  show_pricing_section: boolean;
  show_faq_section: boolean;
  show_testimonials_section: boolean;
  whatsapp_number: string;
  demo_url: string;
  signup_url: string;
  published: boolean;
  published_at: string | null;
}

const DEFAULT_PAGE: Omit<MarketingPageData, 'partner_id'> = {
  hero_badge: '🚀 Novo',
  hero_title: 'Transforme seu negócio',
  hero_subtitle: 'Sistema completo de gestão para seu restaurante, bar ou loja.',
  hero_cta_text: 'Começar Agora',
  hero_cta_url: '',
  hero_image_url: '',
  benefits_title: 'Por que escolher nossa plataforma?',
  benefits: [
    { icon: '📱', title: 'PDV Completo', description: 'Sistema de ponto de venda intuitivo e rápido.' },
    { icon: '📊', title: 'Relatórios', description: 'Acompanhe vendas e métricas em tempo real.' },
    { icon: '🛵', title: 'Delivery', description: 'Gestão de entregas integrada ao seu sistema.' },
  ],
  features_title: 'Funcionalidades',
  features: [],
  faq_title: 'Perguntas Frequentes',
  faq_items: [
    { question: 'Preciso de equipamento especial?', answer: 'Não! Funciona em qualquer computador, tablet ou celular com acesso à internet.' },
    { question: 'Tem período de teste?', answer: 'Sim, todos os planos incluem período de teste gratuito.' },
  ],
  testimonials: [],
  cta_title: 'Pronto para começar?',
  cta_subtitle: 'Cadastre-se gratuitamente e comece a usar em minutos.',
  cta_button_text: 'Criar minha conta grátis',
  social_proof_text: '',
  seo_title: '',
  seo_description: '',
  seo_keywords: [],
  show_modules_section: true,
  show_pricing_section: true,
  show_faq_section: true,
  show_testimonials_section: false,
  whatsapp_number: '',
  demo_url: '',
  signup_url: '',
  published: false,
  published_at: null,
};

export default function PartnerSalesPage() {
  const { currentPartner } = usePartnerContext();
  const queryClient = useQueryClient();
  const partnerId = currentPartner?.id;

  const { data: existingPage, isLoading } = useQuery({
    queryKey: ['partner-marketing-page', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const { data, error } = await supabase
        .from('partner_marketing_pages')
        .select('*')
        .eq('partner_id', partnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });

  const [formData, setFormData] = useState<Omit<MarketingPageData, 'partner_id'>>({ ...DEFAULT_PAGE });

  useEffect(() => {
    if (existingPage) {
      setFormData({
        id: existingPage.id,
        hero_badge: existingPage.hero_badge || '',
        hero_title: existingPage.hero_title || '',
        hero_subtitle: existingPage.hero_subtitle || '',
        hero_cta_text: existingPage.hero_cta_text || '',
        hero_cta_url: existingPage.hero_cta_url || '',
        hero_image_url: existingPage.hero_image_url || '',
        benefits_title: existingPage.benefits_title || '',
        benefits: (existingPage.benefits as any) || [],
        features_title: existingPage.features_title || '',
        features: (existingPage.features as any) || [],
        faq_title: existingPage.faq_title || '',
        faq_items: (existingPage.faq_items as any) || [],
        testimonials: (existingPage.testimonials as any) || [],
        cta_title: existingPage.cta_title || '',
        cta_subtitle: existingPage.cta_subtitle || '',
        cta_button_text: existingPage.cta_button_text || '',
        social_proof_text: existingPage.social_proof_text || '',
        seo_title: existingPage.seo_title || '',
        seo_description: existingPage.seo_description || '',
        seo_keywords: existingPage.seo_keywords || [],
        show_modules_section: existingPage.show_modules_section ?? true,
        show_pricing_section: existingPage.show_pricing_section ?? true,
        show_faq_section: existingPage.show_faq_section ?? true,
        show_testimonials_section: existingPage.show_testimonials_section ?? false,
        whatsapp_number: (existingPage as any).whatsapp_number || '',
        demo_url: (existingPage as any).demo_url || '',
        signup_url: (existingPage as any).signup_url || '',
        published: existingPage.published || false,
        published_at: existingPage.published_at || null,
      });
    }
  }, [existingPage]);

  const saveMutation = useMutation({
    mutationFn: async (publish?: boolean) => {
      if (!partnerId) throw new Error('No partner');
      const payload: any = {
        partner_id: partnerId,
        hero_badge: formData.hero_badge,
        hero_title: formData.hero_title,
        hero_subtitle: formData.hero_subtitle,
        hero_cta_text: formData.hero_cta_text,
        hero_cta_url: formData.hero_cta_url,
        hero_image_url: formData.hero_image_url,
        benefits_title: formData.benefits_title,
        benefits: formData.benefits as any,
        features_title: formData.features_title,
        features: formData.features as any,
        faq_title: formData.faq_title,
        faq_items: formData.faq_items as any,
        testimonials: formData.testimonials as any,
        cta_title: formData.cta_title,
        cta_subtitle: formData.cta_subtitle,
        cta_button_text: formData.cta_button_text,
        social_proof_text: formData.social_proof_text,
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_keywords: formData.seo_keywords,
        show_modules_section: formData.show_modules_section,
        show_pricing_section: formData.show_pricing_section,
        show_faq_section: formData.show_faq_section,
        show_testimonials_section: formData.show_testimonials_section,
        whatsapp_number: formData.whatsapp_number,
        demo_url: formData.demo_url,
        signup_url: formData.signup_url,
        updated_at: new Date().toISOString(),
      };

      if (publish !== undefined) {
        payload.published = publish;
        if (publish) payload.published_at = new Date().toISOString();
      }

      if (existingPage?.id) {
        const { error } = await supabase
          .from('partner_marketing_pages')
          .update(payload)
          .eq('id', existingPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('partner_marketing_pages')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-marketing-page'] });
      toast.success('Página salva com sucesso!');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Benefits CRUD
  const addBenefit = () => {
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, { icon: '✨', title: '', description: '' }],
    }));
  };
  const updateBenefit = (idx: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => i === idx ? { ...b, [field]: value } : b),
    }));
  };
  const removeBenefit = (idx: number) => {
    setFormData(prev => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== idx) }));
  };

  // FAQ CRUD
  const addFaq = () => {
    setFormData(prev => ({
      ...prev,
      faq_items: [...prev.faq_items, { question: '', answer: '' }],
    }));
  };
  const updateFaq = (idx: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      faq_items: prev.faq_items.map((f, i) => i === idx ? { ...f, [field]: value } : f),
    }));
  };
  const removeFaq = (idx: number) => {
    setFormData(prev => ({ ...prev, faq_items: prev.faq_items.filter((_, i) => i !== idx) }));
  };

  // Testimonials CRUD
  const addTestimonial = () => {
    setFormData(prev => ({
      ...prev,
      testimonials: [...prev.testimonials, { name: '', role: '', text: '' }],
    }));
  };
  const updateTestimonial = (idx: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      testimonials: prev.testimonials.map((t, i) => i === idx ? { ...t, [field]: value } : t),
    }));
  };
  const removeTestimonial = (idx: number) => {
    setFormData(prev => ({ ...prev, testimonials: prev.testimonials.filter((_, i) => i !== idx) }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const previewUrl = currentPartner?.slug ? `/parceiros/${currentPartner.slug}?preview=1` : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Página de Vendas</h1>
          <p className="text-muted-foreground">
            Configure a landing page pública do seu negócio
          </p>
        </div>
        <div className="flex gap-2">
          {previewUrl && (
            <Button variant="outline" onClick={() => window.open(previewUrl, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate(undefined)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Rascunho
          </Button>
          <Button
            onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending}
          >
            <Rocket className="h-4 w-4 mr-2" />
            {formData.published ? 'Atualizar Publicação' : 'Publicar'}
          </Button>
        </div>
      </div>

      {formData.published && (
        <Badge className="bg-primary text-primary-foreground">
          Publicada em {formData.published_at ? new Date(formData.published_at).toLocaleDateString('pt-BR') : '—'}
        </Badge>
      )}

      <Tabs defaultValue="hero" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="hero"><Layout className="h-4 w-4 mr-1" /> Hero</TabsTrigger>
          <TabsTrigger value="benefits"><Sparkles className="h-4 w-4 mr-1" /> Benefícios</TabsTrigger>
          <TabsTrigger value="testimonials"><Star className="h-4 w-4 mr-1" /> Depoimentos</TabsTrigger>
          <TabsTrigger value="faq"><HelpCircle className="h-4 w-4 mr-1" /> FAQ</TabsTrigger>
          <TabsTrigger value="cta"><MessageSquare className="h-4 w-4 mr-1" /> CTA</TabsTrigger>
          <TabsTrigger value="seo"><Search className="h-4 w-4 mr-1" /> SEO</TabsTrigger>
        </TabsList>

        {/* ========= HERO ========= */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Seção Hero</CardTitle>
              <CardDescription>O topo da sua página de vendas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Badge (emoji + texto curto)</Label>
                  <Input value={formData.hero_badge} onChange={e => updateField('hero_badge', e.target.value)} placeholder="🚀 Novo" />
                </div>
                <div className="space-y-2">
                  <Label>Imagem Hero (URL)</Label>
                  <Input value={formData.hero_image_url} onChange={e => updateField('hero_image_url', e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Título Principal *</Label>
                <Input value={formData.hero_title} onChange={e => updateField('hero_title', e.target.value)} placeholder="Transforme seu negócio" />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Textarea value={formData.hero_subtitle} onChange={e => updateField('hero_subtitle', e.target.value)} rows={2} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Texto do Botão CTA</Label>
                  <Input value={formData.hero_cta_text} onChange={e => updateField('hero_cta_text', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>URL do CTA (vazio = signup padrão)</Label>
                  <Input value={formData.hero_cta_url} onChange={e => updateField('hero_cta_url', e.target.value)} />
                </div>
              </div>
              <Separator />
              <h4 className="font-medium">Links de Ação</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>WhatsApp (com DDD)</Label>
                  <Input value={formData.whatsapp_number} onChange={e => updateField('whatsapp_number', e.target.value)} placeholder="5511999999999" />
                </div>
                <div className="space-y-2">
                  <Label>URL Agendar Demo</Label>
                  <Input value={formData.demo_url} onChange={e => updateField('demo_url', e.target.value)} placeholder="https://calendly.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>URL Criar Conta (override)</Label>
                  <Input value={formData.signup_url} onChange={e => updateField('signup_url', e.target.value)} placeholder="/signup?partner=..." />
                </div>
              </div>
              <Separator />
              <h4 className="font-medium">Seções visíveis</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: 'show_pricing_section', label: 'Planos e Preços' },
                  { key: 'show_modules_section', label: 'Módulos' },
                  { key: 'show_faq_section', label: 'FAQ' },
                  { key: 'show_testimonials_section', label: 'Depoimentos' },
                ].map(s => (
                  <div key={s.key} className="flex items-center gap-3">
                    <Switch
                      checked={(formData as any)[s.key]}
                      onCheckedChange={v => updateField(s.key, v)}
                    />
                    <Label>{s.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= BENEFITS ========= */}
        <TabsContent value="benefits">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Benefícios</CardTitle>
                  <CardDescription>Cards de benefícios exibidos na página</CardDescription>
                </div>
                <Button size="sm" onClick={addBenefit}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título da Seção</Label>
                <Input value={formData.benefits_title} onChange={e => updateField('benefits_title', e.target.value)} />
              </div>
              {formData.benefits.map((b, i) => (
                <div key={i} className="flex gap-3 p-3 border rounded-lg items-start">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                  <div className="flex-1 grid gap-3 md:grid-cols-3">
                    <Input value={b.icon} onChange={e => updateBenefit(i, 'icon', e.target.value)} placeholder="📱" />
                    <Input value={b.title} onChange={e => updateBenefit(i, 'title', e.target.value)} placeholder="Título" />
                    <Input value={b.description} onChange={e => updateBenefit(i, 'description', e.target.value)} placeholder="Descrição" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeBenefit(i)} className="text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formData.benefits.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum benefício adicionado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= TESTIMONIALS ========= */}
        <TabsContent value="testimonials">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Depoimentos</CardTitle>
                  <CardDescription>Provas sociais de clientes satisfeitos</CardDescription>
                </div>
                <Button size="sm" onClick={addTestimonial}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto de Prova Social</Label>
                <Input value={formData.social_proof_text} onChange={e => updateField('social_proof_text', e.target.value)} placeholder="+500 restaurantes confiam em nós" />
              </div>
              {formData.testimonials.map((t, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Depoimento #{i + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeTestimonial(i)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={t.name} onChange={e => updateTestimonial(i, 'name', e.target.value)} placeholder="Nome" />
                    <Input value={t.role} onChange={e => updateTestimonial(i, 'role', e.target.value)} placeholder="Cargo / Empresa" />
                  </div>
                  <Textarea value={t.text} onChange={e => updateTestimonial(i, 'text', e.target.value)} placeholder="Depoimento..." rows={2} />
                </div>
              ))}
              {formData.testimonials.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum depoimento adicionado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= FAQ ========= */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>FAQ</CardTitle>
                  <CardDescription>Perguntas frequentes da sua página</CardDescription>
                </div>
                <Button size="sm" onClick={addFaq}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título da Seção</Label>
                <Input value={formData.faq_title} onChange={e => updateField('faq_title', e.target.value)} />
              </div>
              {formData.faq_items.map((f, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pergunta #{i + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeFaq(i)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input value={f.question} onChange={e => updateFaq(i, 'question', e.target.value)} placeholder="Pergunta" />
                  <Textarea value={f.answer} onChange={e => updateFaq(i, 'answer', e.target.value)} placeholder="Resposta" rows={2} />
                </div>
              ))}
              {formData.faq_items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pergunta adicionada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= CTA ========= */}
        <TabsContent value="cta">
          <Card>
            <CardHeader>
              <CardTitle>CTA Final</CardTitle>
              <CardDescription>Chamada para ação no rodapé da página</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={formData.cta_title} onChange={e => updateField('cta_title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input value={formData.cta_subtitle} onChange={e => updateField('cta_subtitle', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Texto do Botão</Label>
                <Input value={formData.cta_button_text} onChange={e => updateField('cta_button_text', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= SEO ========= */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO e Meta Tags</CardTitle>
              <CardDescription>Configurações para mecanismos de busca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título SEO (max 60 caracteres)</Label>
                <Input
                  value={formData.seo_title}
                  onChange={e => updateField('seo_title', e.target.value)}
                  maxLength={60}
                  placeholder={formData.hero_title}
                />
                <p className="text-xs text-muted-foreground">{formData.seo_title.length}/60</p>
              </div>
              <div className="space-y-2">
                <Label>Descrição SEO (max 160 caracteres)</Label>
                <Textarea
                  value={formData.seo_description}
                  onChange={e => updateField('seo_description', e.target.value)}
                  maxLength={160}
                  rows={2}
                  placeholder={formData.hero_subtitle}
                />
                <p className="text-xs text-muted-foreground">{formData.seo_description.length}/160</p>
              </div>
              <div className="space-y-2">
                <Label>Palavras-chave (separadas por vírgula)</Label>
                <Input
                  value={formData.seo_keywords.join(', ')}
                  onChange={e => updateField('seo_keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="restaurante, pdv, delivery"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
