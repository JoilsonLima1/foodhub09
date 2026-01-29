import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Image, Palette, MessageSquare, Calendar, Layout, Megaphone } from 'lucide-react';
import { useSystemSettings, BrandingSettings as BrandingType, ColorSettings, WhatsAppSettings, TrialSettings, LandingLayoutSettings, AnnouncementBannerSettings, AnnouncementBannerStyle } from '@/hooks/useSystemSettings';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImageUploader } from './ImageUploader';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AnnouncementBanner } from '@/components/landing/AnnouncementBanner';
import { HeroTitleEditor } from './HeroTitleEditor';

// Default colors for 4-part title (alternating)
const defaultHeroColor1 = 'foreground';
const defaultHeroColor2 = 'primary';

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
    hero_title: 'Transforme seu',
    hero_title_highlight: 'restaurante',
    hero_title_part3: 'em uma',
    hero_title_part4: 'máquina de vendas',
    hero_subtitle: 'Unifique pedidos de múltiplas origens, gerencie entregas, controle estoque e tome decisões inteligentes com relatórios em tempo real e previsões com IA.',
    hero_description: '',
    trust_badge_1: 'Sem cartão de crédito',
    trust_badge_2: 'Cancele quando quiser',
    trust_badge_3: 'Suporte em português',
    social_proof_text: 'Mais de 500+ restaurantes já confiam no',
    show_testimonials: true,
    show_features: true,
    announcement_banner: {
      is_visible: true,
      text: 'Use TODAS as funcionalidades por',
      highlight_text: '14 DIAS GRÁTIS',
      style: 'gradient',
    },
  });

  const [heroColor1, setHeroColor1] = useState(defaultHeroColor1);
  const [heroColor2, setHeroColor2] = useState(defaultHeroColor2);

  const bannerStyles: { value: AnnouncementBannerStyle; label: string; description: string }[] = [
    // Básicos
    { value: 'gradient', label: 'Gradiente', description: 'Banner colorido com padrão grid' },
    { value: 'minimal', label: 'Minimalista', description: 'Fundo neutro, borda inferior' },
    { value: 'glass', label: 'Vidro', description: 'Transparência com blur' },
    { value: 'ribbon', label: 'Fita', description: 'Linhas decorativas laterais' },
    { value: 'badge', label: 'Badge', description: 'Centralizado em forma de pílula' },
    { value: 'glow', label: 'Brilho', description: 'Efeito luminoso nas laterais' },
    // Animados
    { value: 'bubbles', label: 'Bolhas', description: 'Bolhas flutuantes animadas' },
    { value: 'circles', label: 'Círculos', description: 'Círculos de destaque fixos' },
    { value: 'neon', label: 'Neon', description: 'Efeito neon brilhante' },
    { value: 'stripes', label: 'Listras', description: 'Padrão de listras diagonais' },
    { value: 'confetti', label: 'Confete', description: 'Partículas coloridas festivas' },
    { value: 'wave', label: 'Onda', description: 'Ondas suaves decorativas' },
    { value: 'sparkle', label: 'Brilhos', description: 'Estrelas cintilantes' },
    // Geométricos
    { value: 'geometric', label: 'Geométrico', description: 'Formas geométricas abstratas' },
    { value: 'aurora', label: 'Aurora', description: 'Gradiente aurora boreal' },
    { value: 'pulse', label: 'Pulso', description: 'Efeito de pulsação' },
    // Temáticos
    { value: 'retro', label: 'Retrô', description: 'Estilo vintage anos 70' },
    { value: 'cyber', label: 'Cyber', description: 'Futurista cyberpunk' },
    { value: 'elegant', label: 'Elegante', description: 'Sofisticado e refinado' },
    { value: 'festive', label: 'Festivo', description: 'Celebração e festa' },
    // Natureza
    { value: 'sunset', label: 'Pôr do Sol', description: 'Tons quentes de sunset' },
    { value: 'ocean', label: 'Oceano', description: 'Azuis profundos do mar' },
    { value: 'forest', label: 'Floresta', description: 'Verdes naturais' },
    { value: 'fire', label: 'Fogo', description: 'Laranjas e vermelhos vibrantes' },
    { value: 'holographic', label: 'Holográfico', description: 'Efeito iridescente futurista' },
  ];

  useEffect(() => {
    if (branding) setBrandingData(branding);
    if (colors) setColorData(colors);
    if (whatsapp) setWhatsappData(whatsapp);
    if (trialPeriod) setTrialData(trialPeriod);
    if (landingLayout) {
      setLandingData(landingLayout);
    }
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

      {/* Announcement Banner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Banner de Destaque
          </CardTitle>
          <CardDescription>
            Configure o banner de anúncio no topo da página
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle visibility */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Exibir Banner</Label>
              <p className="text-xs text-muted-foreground">Mostrar o banner de destaque na landing page</p>
            </div>
            <Switch
              checked={landingData.announcement_banner?.is_visible ?? true}
              onCheckedChange={(checked) => setLandingData({ 
                ...landingData, 
                announcement_banner: { 
                  ...landingData.announcement_banner!, 
                  is_visible: checked 
                } 
              })}
            />
          </div>

          {/* Banner Text */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Texto Principal</Label>
              <Input
                value={landingData.announcement_banner?.text || ''}
                onChange={(e) => setLandingData({ 
                  ...landingData, 
                  announcement_banner: { 
                    ...landingData.announcement_banner!, 
                    text: e.target.value 
                  } 
                })}
                placeholder="Use TODAS as funcionalidades por"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto de Destaque</Label>
              <Input
                value={landingData.announcement_banner?.highlight_text || ''}
                onChange={(e) => setLandingData({ 
                  ...landingData, 
                  announcement_banner: { 
                    ...landingData.announcement_banner!, 
                    highlight_text: e.target.value 
                  } 
                })}
                placeholder="14 DIAS GRÁTIS"
              />
              <p className="text-xs text-muted-foreground">
                Texto com destaque especial (sublinhado ou badge)
              </p>
            </div>
          </div>

          {/* Banner Style Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Estilo do Banner</Label>
            <RadioGroup
              value={landingData.announcement_banner?.style || 'gradient'}
              onValueChange={(value: AnnouncementBannerStyle) => setLandingData({ 
                ...landingData, 
                announcement_banner: { 
                  ...landingData.announcement_banner!, 
                  style: value 
                } 
              })}
              className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
            >
              {bannerStyles.map((style) => (
                <div key={style.value} className="relative">
                  <RadioGroupItem
                    value={style.value}
                    id={`banner-style-${style.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`banner-style-${style.value}`}
                    className="flex flex-col gap-1 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <span className="font-medium">{style.label}</span>
                    <span className="text-xs text-muted-foreground">{style.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Prévia ao Vivo</Label>
            <div className="border rounded-lg overflow-hidden bg-background">
              <AnnouncementBanner
                text={landingData.announcement_banner?.text || 'Use TODAS as funcionalidades por'}
                highlightText={landingData.announcement_banner?.highlight_text || '14 DIAS GRÁTIS'}
                style={landingData.announcement_banner?.style || 'gradient'}
                isVisible={true}
                isPreview={true}
              />
            </div>
          </div>

          <Button onClick={handleSaveLanding} disabled={updateSetting.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Banner
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

          {/* Hero Title Editor - 4 Parts with 2 Alternating Colors */}
          <HeroTitleEditor
            heroTitle={landingData.hero_title}
            heroTitleHighlight={landingData.hero_title_highlight}
            heroTitlePart3={landingData.hero_title_part3 || ''}
            heroTitlePart4={landingData.hero_title_part4 || ''}
            color1={heroColor1}
            color2={heroColor2}
            onChange={(values) => {
              setLandingData({ 
                ...landingData, 
                hero_title: values.heroTitle,
                hero_title_highlight: values.heroTitleHighlight,
                hero_title_part3: values.heroTitlePart3,
                hero_title_part4: values.heroTitlePart4,
              });
              setHeroColor1(values.color1);
              setHeroColor2(values.color2);
            }}
          />

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
