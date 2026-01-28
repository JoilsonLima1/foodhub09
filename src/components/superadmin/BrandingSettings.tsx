import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Image, Palette, MessageSquare, Calendar, Layout } from 'lucide-react';
import { useSystemSettings, BrandingSettings as BrandingType, ColorSettings, WhatsAppSettings, TrialSettings, LandingLayoutSettings } from '@/hooks/useSystemSettings';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImageUploader } from './ImageUploader';

export function BrandingSettings() {
  const { settings, isLoading, updateSetting, branding, colors, whatsapp, trialPeriod, landingLayout } = useSystemSettings();
  
  const [brandingData, setBrandingData] = useState<BrandingType>({
    logo_url: null,
    icon_url: null,
    company_name: 'FoodHub',
  });

  const [colorData, setColorData] = useState<ColorSettings>({
    primary: '47 97% 60%',
    secondary: '217 33% 17%',
    accent: '47 97% 50%',
  });

  const [whatsappData, setWhatsappData] = useState<WhatsAppSettings>({
    number: null,
    message: 'Olá! Gostaria de saber mais sobre o FoodHub.',
  });

  const [trialData, setTrialData] = useState<TrialSettings>({
    days: 14,
    highlight_text: '14 dias grátis',
    end_date: null,
  });

  const [landingData, setLandingData] = useState<LandingLayoutSettings>({
    hero_badge: 'Plataforma #1 para Gestão de Restaurantes',
    hero_title: 'Transforme seu restaurante em uma',
    hero_title_highlight: 'máquina de vendas',
    hero_subtitle: 'Unifique pedidos de múltiplas origens, gerencie entregas, controle estoque e tome decisões inteligentes com relatórios em tempo real e previsões com IA.',
    hero_description: '',
    trust_badge_1: 'Sem cartão de crédito',
    trust_badge_2: 'Cancele quando quiser',
    trust_badge_3: 'Suporte em português',
    social_proof_text: 'Mais de 500+ restaurantes já confiam no',
    show_testimonials: true,
    show_features: true,
  });

  useEffect(() => {
    if (branding) setBrandingData(branding);
    if (colors) setColorData(colors);
    if (whatsapp) setWhatsappData(whatsapp);
    if (trialPeriod) setTrialData(trialPeriod);
    if (landingLayout) setLandingData(landingLayout);
  }, [branding, colors, whatsapp, trialPeriod, landingLayout]);

  const handleSaveBranding = () => {
    updateSetting.mutate({ key: 'branding', value: brandingData });
  };

  const handleSaveColors = () => {
    updateSetting.mutate({ key: 'colors', value: colorData });
  };

  const handleSaveWhatsapp = () => {
    updateSetting.mutate({ key: 'whatsapp', value: whatsappData });
  };

  const handleSaveTrial = () => {
    updateSetting.mutate({ key: 'trial_period', value: trialData });
  };

  const handleSaveLanding = () => {
    updateSetting.mutate({ key: 'landing_layout', value: landingData });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branding Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo e Marca
          </CardTitle>
          <CardDescription>
            Configure a identidade visual do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Nome da Empresa</Label>
            <Input
              value={brandingData.company_name}
              onChange={(e) => setBrandingData({ ...brandingData, company_name: e.target.value })}
            />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <ImageUploader
              value={brandingData.logo_url}
              onChange={(url) => setBrandingData({ ...brandingData, logo_url: url })}
              label="Logo da Empresa"
              description="Arraste ou clique para enviar. O fundo será removido automaticamente com IA."
              folder="logos"
              maxSizeMB={10}
              removeBackground={true}
            />
            
            <ImageUploader
              value={brandingData.icon_url}
              onChange={(url) => setBrandingData({ ...brandingData, icon_url: url })}
              label="Ícone (Favicon)"
              description="Ícone quadrado para navegador. Fundo removido automaticamente."
              folder="icons"
              maxSizeMB={5}
              removeBackground={true}
            />
          </div>
          
          <Button onClick={handleSaveBranding} disabled={updateSetting.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Branding
          </Button>
        </CardContent>
      </Card>

      {/* Colors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Cores do Sistema
          </CardTitle>
          <CardDescription>
            Personalize as cores da página de vendas (formato HSL)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Cor Primária (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  value={colorData.primary}
                  onChange={(e) => setColorData({ ...colorData, primary: e.target.value })}
                  placeholder="47 97% 60%"
                />
                <div 
                  className="w-10 h-10 rounded border" 
                  style={{ backgroundColor: `hsl(${colorData.primary})` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor Secundária (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  value={colorData.secondary}
                  onChange={(e) => setColorData({ ...colorData, secondary: e.target.value })}
                  placeholder="217 33% 17%"
                />
                <div 
                  className="w-10 h-10 rounded border" 
                  style={{ backgroundColor: `hsl(${colorData.secondary})` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Destaque (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  value={colorData.accent}
                  onChange={(e) => setColorData({ ...colorData, accent: e.target.value })}
                  placeholder="47 97% 50%"
                />
                <div 
                  className="w-10 h-10 rounded border" 
                  style={{ backgroundColor: `hsl(${colorData.accent})` }}
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSaveColors} disabled={updateSetting.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Cores
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp de Vendas
          </CardTitle>
          <CardDescription>
            Configure o número de WhatsApp exibido para contato comercial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Número do WhatsApp</Label>
              <Input
                value={whatsappData.number || ''}
                onChange={(e) => setWhatsappData({ ...whatsappData, number: e.target.value })}
                placeholder="5511999999999"
              />
              <p className="text-xs text-muted-foreground">
                Formato: código do país + DDD + número (sem espaços ou traços)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Mensagem Padrão</Label>
              <Textarea
                value={whatsappData.message}
                onChange={(e) => setWhatsappData({ ...whatsappData, message: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <Button onClick={handleSaveWhatsapp} disabled={updateSetting.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar WhatsApp
          </Button>
        </CardContent>
      </Card>

      {/* Trial Period Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período Gratuito
          </CardTitle>
          <CardDescription>
            Configure o período de teste gratuito e o destaque na página de vendas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Dias de Teste</Label>
              <Input
                type="number"
                value={trialData.days}
                onChange={(e) => setTrialData({ ...trialData, days: parseInt(e.target.value) || 14 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Texto de Destaque</Label>
              <Input
                value={trialData.highlight_text}
                onChange={(e) => setTrialData({ ...trialData, highlight_text: e.target.value })}
                placeholder="14 dias grátis"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final da Promoção</Label>
              <Input
                type="date"
                value={trialData.end_date || ''}
                onChange={(e) => setTrialData({ ...trialData, end_date: e.target.value || null })}
              />
            </div>
          </div>
          <Button onClick={handleSaveTrial} disabled={updateSetting.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Período
          </Button>
        </CardContent>
      </Card>

      {/* Landing Layout Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Layout da Landing Page
          </CardTitle>
          <CardDescription>
            Personalize os textos e seções da página de vendas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Badge */}
          <div className="space-y-2">
            <Label>Badge do Hero (Selo superior)</Label>
            <Input
              value={landingData.hero_badge}
              onChange={(e) => setLandingData({ ...landingData, hero_badge: e.target.value })}
              placeholder="Plataforma #1 para Gestão de Restaurantes"
            />
            <p className="text-xs text-muted-foreground">
              Aparece no selo acima do título principal
            </p>
          </div>

          {/* Hero Title */}
          <div className="space-y-2">
            <Label>Título Principal (Parte 1 - Cor normal)</Label>
            <Input
              value={landingData.hero_title}
              onChange={(e) => setLandingData({ ...landingData, hero_title: e.target.value })}
              placeholder="Transforme seu restaurante em uma"
            />
            <p className="text-xs text-muted-foreground">
              Primeira parte do título em cor normal
            </p>
          </div>

          {/* Hero Title Highlight */}
          <div className="space-y-2">
            <Label>Título Principal (Parte 2 - Cor destaque)</Label>
            <Input
              value={landingData.hero_title_highlight}
              onChange={(e) => setLandingData({ ...landingData, hero_title_highlight: e.target.value })}
              placeholder="máquina de vendas"
            />
            <p className="text-xs text-muted-foreground">
              Segunda parte do título em cor primária (destaque)
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-xs text-muted-foreground mb-2 block">Prévia do título:</Label>
            <p className="text-xl font-bold">
              {landingData.hero_title}{' '}
              <span className="text-primary">{landingData.hero_title_highlight}</span>
            </p>
          </div>

          {/* Hero Subtitle/Description */}
          <div className="space-y-2">
            <Label>Descrição do Hero (Subtítulo)</Label>
            <Textarea
              value={landingData.hero_subtitle}
              onChange={(e) => setLandingData({ ...landingData, hero_subtitle: e.target.value })}
              rows={3}
              placeholder="Unifique pedidos de múltiplas origens, gerencie entregas..."
            />
            <p className="text-xs text-muted-foreground">
              Texto descritivo abaixo do título principal
            </p>
          </div>

          {/* Trust Badges */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Selos de Confiança</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Os três textos com ícones de "check" abaixo da descrição
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Selo 1</Label>
                <Input
                  value={landingData.trust_badge_1}
                  onChange={(e) => setLandingData({ ...landingData, trust_badge_1: e.target.value })}
                  placeholder="Sem cartão de crédito"
                />
              </div>
              <div className="space-y-2">
                <Label>Selo 2</Label>
                <Input
                  value={landingData.trust_badge_2}
                  onChange={(e) => setLandingData({ ...landingData, trust_badge_2: e.target.value })}
                  placeholder="Cancele quando quiser"
                />
              </div>
              <div className="space-y-2">
                <Label>Selo 3</Label>
                <Input
                  value={landingData.trust_badge_3}
                  onChange={(e) => setLandingData({ ...landingData, trust_badge_3: e.target.value })}
                  placeholder="Suporte em português"
                />
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="space-y-2">
            <Label>Texto de Prova Social</Label>
            <Input
              value={landingData.social_proof_text}
              onChange={(e) => setLandingData({ ...landingData, social_proof_text: e.target.value })}
              placeholder="Mais de 500+ restaurantes já confiam no"
            />
            <p className="text-xs text-muted-foreground">
              Texto exibido abaixo dos botões (o nome da empresa é adicionado automaticamente)
            </p>
          </div>

          {/* Toggles */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label>Exibir Depoimentos</Label>
              <Switch
                checked={landingData.show_testimonials}
                onCheckedChange={(checked) => setLandingData({ ...landingData, show_testimonials: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label>Exibir Recursos</Label>
              <Switch
                checked={landingData.show_features}
                onCheckedChange={(checked) => setLandingData({ ...landingData, show_features: checked })}
              />
            </div>
          </div>
          <Button onClick={handleSaveLanding} disabled={updateSetting.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Layout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
